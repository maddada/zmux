//! CDXC:SessionChat 2026-09-07 DECISION:
//! User: Codex rewind requires Ghostex to report the session idle, clears the input, presses Escape twice quickly, moves Left once per later prompt (the latest starts selected), and presses Enter.
//! CDXC:SessionChat 2026-09-07 WHY:
//! Codex 0.153.4 forks before the selected prompt. Adopt the verified new rollout through the existing identity writer so chat, pagination and resume all follow the same branch.
//! The highlight is SGR reverse video, absent from plain captures. CSI-u Escape avoids the terminal parser holding a bare Escape while waiting for another byte.

use super::*;
use crate::domain::DomainRepository;
use crate::session_chat_fork_stitch::read_session_chat_tail_page_stitched;
use crate::session_chat_send::SessionChatSendTarget;
use crate::session_chat_successor::{find_codex_successor_transcript, read_codex_session_meta};
use crate::session_chat_tail::SessionChatTailPage;
use crate::storage::open_gxserver_database;

const ESCAPE: &str = "\u{1b}[27u";
const LEFT: &str = "\u{1b}[1;1D";

#[derive(Clone, Debug)]
pub(super) struct CodexRewindPlan {
    paths: crate::paths::GxserverPaths,
    server_id: String,
    transcript_path: PathBuf,
    agent_session_id: String,
    message_id: String,
    /// Newest first, including inherited prompts, with stable transcript IDs.
    prompts: Vec<(String, String)>,
}

fn prompts(path: &Path) -> Result<Vec<(String, String)>, DomainStateError> {
    let mut result = Vec::new();
    let mut cursor = None;
    loop {
        let page = read_session_chat_tail_page_stitched(
            SessionChatTranscriptAgent::Codex,
            path,
            1000,
            cursor,
        )
        .map_err(|error| {
            message_not_found(format!("Codex's transcript could not be read: {error}"))
        })?;
        let SessionChatTailPage::Page {
            messages,
            has_more,
            before_offset,
            ..
        } = page.page
        else {
            return Err(message_not_found("Codex's transcript is unavailable."));
        };
        result.extend(
            messages
                .into_iter()
                .rev()
                .filter(|message| message.role == SessionChatRole::User && !message.queued)
                .map(|message| (message.id.clone(), message_text(&message))),
        );
        if !has_more {
            return Ok(result);
        }
        if cursor == Some(before_offset) {
            return Err(message_not_found(
                "Codex's transcript pagination did not advance.",
            ));
        }
        cursor = Some(before_offset);
    }
}

fn idle(session: &Value) -> Result<(), DomainStateError> {
    if crate::presentation::effective_lifecycle_state(session) != "running" {
        return Err(session_not_running("The Codex session is not running."));
    }
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    if crate::presentation::presentation_activity(session, &now) == "working" {
        return Err(agent_busy(
            "Codex is still working. Wait for it to finish, or stop it, and then rewind.",
        ));
    }
    Ok(())
}

pub(super) async fn rewind(
    state: &AppState,
    target: SessionChatSendTarget,
    message_id: &str,
) -> Result<Value, DomainStateError> {
    idle(&target.session)?;
    let transcript_path = crate::session_chat::resolve_session_chat_transcript_path(
        SessionChatTranscriptAgent::Codex,
        read_runtime_text(&target.session, "agentSessionId").as_deref(),
        read_runtime_text(&target.session, "agentSessionPath").as_deref(),
    )
    .ok_or_else(|| message_not_found("This session has no Codex transcript yet."))?;
    let meta = read_codex_session_meta(&transcript_path)
        .ok_or_else(|| message_not_found("Codex's transcript identity could not be read."))?;
    let prompts = prompts(&transcript_path)?;
    let presses = prompts
        .iter()
        .position(|(id, _)| id == message_id)
        .ok_or_else(|| {
            message_not_found("That message is not an active user prompt of this conversation.")
        })?;
    let first_line = prompt_first_line(&prompts[presses].1);
    if first_line.is_empty() {
        return Err(message_not_found(
            "This prompt has no text to verify in Codex's rewind picker.",
        ));
    }
    let _guard = RewindInFlightGuard::claim(&target.project_id, &target.session_id)
        .ok_or_else(|| agent_busy("A rewind is already running for this session."))?;
    let job_id = register_rewind_job(RewindPlan {
        target_first_line: first_line,
        presses,
        codex: Some(CodexRewindPlan {
            paths: state.paths.clone(),
            server_id: state.metadata.server_id.clone(),
            transcript_path,
            agent_session_id: meta.session_id,
            message_id: message_id.to_string(),
            prompts,
        }),
    });
    let sent = execute_session_chat_send(
        &target.project_id,
        &target.session_id,
        &target.zmx_name,
        "session-chat-rewind",
        vec![SessionChatSendStep::DriveSessionChatRewind { job_id }],
    )
    .await;
    let outcome = take_rewind_job_outcome(job_id);
    let warning = match outcome.as_ref() {
        Some(Err(error)) if error.code == "rewindCleanupFailed" => Some(error.message.clone()),
        Some(Err(error)) => {
            return Err(DomainStateError {
                code: error.code,
                message: error.message.clone(),
            })
        }
        _ => None,
    };
    sent.map_err(|error| agent_busy(error.message))?;
    if outcome.is_none() {
        return Err(agent_busy(
            "The terminal queue dropped the rewind before it ran.",
        ));
    }
    crate::session_chat_follower::request_session_chat_resnapshot(
        state,
        &target.project_id,
        &target.session_id,
    );
    log_session_chat_rewind(
        LogLevel::Info,
        "sessionChatRewound",
        json!({
            "projectId": target.project_id, "sessionId": target.session_id,
            "targetMessageId": message_id, "agent": "codex",
        }),
        None,
    );
    Ok(json!({"ok": true, "targetMessageId": message_id, "leafId": null, "warning": warning}))
}

fn picker_open(screen: &str) -> bool {
    crate::session_chat_codex_pager::detect_codex_transcript_pager(screen).is_some()
}

/// Extract only characters painted with SGR reverse-video. A prompt marker in
/// ordinary history cannot be confused with the selected prompt.
fn selected_prompt(screen: &str) -> Option<(usize, String)> {
    if !picker_open(screen) {
        return None;
    }
    let mut reversed = false;
    let mut selected = String::new();
    let mut first_row = None;
    for (row, line) in screen.lines().enumerate() {
        let mut chars = line.chars().peekable();
        let mut text = String::new();
        while let Some(ch) = chars.next() {
            if ch == '\u{1b}' && chars.peek() == Some(&'[') {
                chars.next();
                let mut params = String::new();
                for ch in chars.by_ref() {
                    if ('@'..='~').contains(&ch) {
                        if ch == 'm' {
                            for part in params.split(';') {
                                match part {
                                    "" | "0" | "27" => reversed = false,
                                    "7" => reversed = true,
                                    _ => {}
                                }
                            }
                        }
                        break;
                    }
                    params.push(ch);
                }
            } else if reversed {
                text.push(ch);
            }
        }
        let text = text.trim();
        if !text.is_empty() {
            first_row.get_or_insert(row);
            if !selected.is_empty() {
                selected.push('\n');
            }
            selected.push_str(text);
        }
    }
    let prompt = selected
        .strip_prefix('›')
        .or_else(|| selected.strip_prefix('»'))?
        .trim();
    Some((first_row?, collapse_spaces(prompt)))
}

/// Opening the picker always selects the newest prompt. Codex 0.153.4 can
/// omit reverse video on that first paint after a fork, although Left/Right
/// paints it correctly. Verify the newest visible prompt on open; use the
/// actual highlight for every subsequent navigation step.
fn initial_prompt(screen: &str) -> Option<(usize, String)> {
    if !picker_open(screen) {
        return None;
    }
    let lines: Vec<String> = screen
        .lines()
        .map(|line| collapse_spaces(&crate::session_chat_options::strip_ansi_sgr(line)))
        .collect();
    let row = lines
        .iter()
        .rposition(|line| line.starts_with('›') || line.starts_with('»'))?;
    let first = lines[row].trim_start_matches(['›', '»']).trim();
    let mut text = first.to_string();
    for line in &lines[row + 1..] {
        if line.is_empty() {
            break;
        }
        text.push(' ');
        text.push_str(line);
    }
    Some((row, collapse_spaces(&text)))
}

async fn capture_vt(driver: &RewindDriver<'_>) -> Option<String> {
    let name = driver.zmx_name.to_string();
    let capture =
        tokio::task::spawn_blocking(move || crate::zmx::read_zmx_session_screen_capture_vt(&name))
            .await
            .ok()?
            .ok()?;
    (!capture.truncated).then_some(capture.text)
}

async fn selection(
    driver: &RewindDriver<'_>,
    previous: Option<&(usize, String)>,
) -> Result<(usize, String), DomainStateError> {
    let deadline = std::time::Instant::now() + Duration::from_secs(6);
    loop {
        if (driver.cancelled)() {
            return Err(agent_busy("The rewind was cancelled by another action."));
        }
        if let Some(screen) = capture_vt(driver).await {
            let selected = if previous.is_none() {
                initial_prompt(&screen)
            } else {
                selected_prompt(&screen)
            };
            if let Some(selected) = selected {
                if previous != Some(&selected) {
                    return Ok(selected);
                }
            }
        }
        if std::time::Instant::now() >= deadline {
            return Err(rewind_timeout("selection"));
        }
        tokio::time::sleep(Duration::from_millis(REWIND_POLL_MS)).await;
    }
}

fn live_session(
    driver: &RewindDriver<'_>,
    plan: &CodexRewindPlan,
) -> Result<Value, DomainStateError> {
    let db = open_gxserver_database(&plan.paths)
        .map_err(|error| session_not_running(error.to_string()))?;
    DomainRepository::new(&db, &plan.server_id)
        .get_session(driver.project_id, driver.session_id)?
        .ok_or_else(|| session_not_running("The session no longer exists."))
}

pub(super) async fn drive(
    driver: &RewindDriver<'_>,
    plan: &RewindPlan,
    codex: &CodexRewindPlan,
) -> Result<(), DomainStateError> {
    let started_at_composer = driver
        .capture()
        .await
        .is_some_and(|screen| !picker_open(&screen));
    let result = drive_inner(driver, plan, codex).await;
    if started_at_composer
        && result.is_err()
        && driver
            .capture()
            .await
            .is_some_and(|screen| picker_open(&screen))
    {
        // Escape moves backward in this picker; q is its actual cancel key.
        let _ = driver.write("q").await;
    }
    result
}

async fn drive_inner(
    driver: &RewindDriver<'_>,
    plan: &RewindPlan,
    codex: &CodexRewindPlan,
) -> Result<(), DomainStateError> {
    let session = live_session(driver, codex)?;
    idle(&session)?;
    if read_runtime_text(&session, "agentSessionId").as_deref() != Some(&codex.agent_session_id)
        || prompts(&codex.transcript_path)? != codex.prompts
    {
        return Err(agent_busy(
            "The conversation changed while the rewind was queued. Try again.",
        ));
    }
    let started = drive_picker(driver, plan, codex, || {
        let live = live_session(driver, codex)?;
        idle(&live)?;
        if read_runtime_text(&live, "agentSessionId").as_deref() != Some(&codex.agent_session_id) {
            return Err(agent_busy("The conversation changed while rewinding."));
        }
        Ok(())
    })
    .await?;
    adopt_branch(driver, plan, codex, started).await
}

async fn drive_picker(
    driver: &RewindDriver<'_>,
    plan: &RewindPlan,
    codex: &CodexRewindPlan,
    check_idle: impl Fn() -> Result<(), DomainStateError>,
) -> Result<i64, DomainStateError> {
    let deadline = std::time::Instant::now() + Duration::from_secs(20);
    loop {
        let screen = driver
            .capture()
            .await
            .ok_or_else(|| session_not_running("Codex's screen could not be read."))?;
        let ready = crate::session_chat_composer::detect_session_chat_composer_readiness(
            Some("codex"),
            &screen,
            None,
        );
        if picker_open(&screen)
            || ready.state != crate::session_chat_composer::SessionChatComposerState::Ready
        {
            return Err(agent_busy(
                "Codex is not showing its input box. Close the terminal dialog first.",
            ));
        }
        // A new branch starts its MCP connections again while already painting
        // the composer. Escape interrupts that startup instead of priming rewind.
        let starting =
            screen.lines().rev().take(8).any(|line| {
                line.contains("esc to interrupt") || line.contains("tab to queue message")
            });
        if !starting {
            break;
        }
        if (driver.cancelled)() || std::time::Instant::now() >= deadline {
            return Err(agent_busy(
                "Codex is still starting its connections. Wait for it to finish before rewinding.",
            ));
        }
        tokio::time::sleep(Duration::from_millis(150)).await;
    }
    check_idle()?;
    if (driver.cancelled)() {
        return Err(agent_busy("The rewind was cancelled."));
    }
    driver
        .write(&crate::session_chat_send::build_agent_tui_clear_input(
            crate::session_chat_send::AGENT_TUI_CLEAR_MAX_LINES,
        ))
        .await?;
    tokio::time::sleep(Duration::from_millis(
        crate::session_chat_send::SESSION_CHAT_CLEAR_INPUT_SETTLE_MS,
    ))
    .await;
    // Opening the preview is Codex's own empty-input proof: it ignores this
    // shortcut while a draft remains. Never submit until the preview is proven.
    driver.write(ESCAPE).await?;
    tokio::time::sleep(Duration::from_millis(120)).await;
    driver.write(ESCAPE).await?;
    let mut selected = selection(driver, None).await?;
    for index in 0..=plan.presses {
        if selected.1 != collapse_spaces(&codex.prompts[index].1) {
            return Err(dialog_mismatch(
                "selection",
                "The highlighted prompt does not match the transcript.",
            ));
        }
        if index < plan.presses {
            driver.write(LEFT).await?;
            selected = selection(driver, Some(&selected)).await?;
        }
    }
    check_idle()?;
    if (driver.cancelled)() {
        return Err(agent_busy("The rewind was cancelled."));
    }
    let started = chrono::Utc::now().timestamp_millis();
    driver.write("\r").await?;
    driver
        .wait_for("close", |screen| (!picker_open(screen)).then_some(()))
        .await?;
    Ok(started)
}

async fn adopt_branch(
    driver: &RewindDriver<'_>,
    plan: &RewindPlan,
    codex: &CodexRewindPlan,
    started: i64,
) -> Result<(), DomainStateError> {
    let next = wait_for_branch(driver, plan, codex, started).await?;
    let db = open_gxserver_database(&codex.paths)
        .map_err(|error| session_not_running(error.to_string()))?;
    let repository = DomainRepository::new(&db, &codex.server_id);
    let current = repository
        .get_session(driver.project_id, driver.session_id)?
        .ok_or_else(|| session_not_running("The session no longer exists."))?;
    if read_runtime_text(&current, "agentSessionId").as_deref() == Some(&next.agent_session_id) {
        return Ok(());
    }
    if crate::agents::apply_transcript_successor_session_identity(
        &repository,
        driver.project_id,
        driver.session_id,
        Some(&codex.agent_session_id),
        &next.agent_session_id,
        &next
            .path
            .as_deref()
            .map(|path| path.to_string_lossy().into_owned())
            .unwrap_or_default(),
    )? {
        return Ok(());
    }
    return Err(agent_busy(
        "Codex rewound, but Ghostex could not adopt its new conversation identity.",
    ));
}

struct RewoundConversation {
    agent_session_id: String,
    path: Option<PathBuf>,
}

/// Codex creates an entirely fresh, unnamed thread before the first prompt;
/// its rollout is intentionally not written until that prompt is submitted.
/// The live footer supplies its UUID during this pre-transcript state.
fn empty_conversation_id(screen: &str, old_id: &str) -> Option<String> {
    let footer = screen.lines().rev().find(|line| !line.trim().is_empty())?;
    footer.split('·').map(str::trim).find_map(|part| {
        uuid::Uuid::parse_str(part)
            .ok()
            .filter(|_| part != old_id)
            .map(|_| part.to_string())
    })
}

async fn wait_for_branch(
    driver: &RewindDriver<'_>,
    plan: &RewindPlan,
    codex: &CodexRewindPlan,
    started: i64,
) -> Result<RewoundConversation, DomainStateError> {
    let deadline = std::time::Instant::now() + Duration::from_secs(15);
    loop {
        if plan.presses + 1 == codex.prompts.len() {
            if let Some(screen) = driver.capture().await {
                if let Some(agent_session_id) =
                    empty_conversation_id(&screen, &codex.agent_session_id)
                {
                    return Ok(RewoundConversation {
                        agent_session_id,
                        path: None,
                    });
                }
            }
        }
        let old = codex.agent_session_id.clone();
        let path = codex.transcript_path.clone();
        let candidate = tokio::task::spawn_blocking(move || {
            find_codex_successor_transcript(&old, &path, started, &[])
        })
        .await
        .map_err(|error| session_not_running(error.to_string()))?;
        if let crate::session_chat::SessionChatSuccessorOutcome::Found(next) = candidate {
            if prompts(&next.path)? != codex.prompts[plan.presses + 1..] {
                return Err(dialog_mismatch(
                    "branch",
                    "Codex's new conversation does not end before the selected prompt.",
                ));
            }
            return Ok(RewoundConversation {
                agent_session_id: next.agent_session_id,
                path: Some(next.path),
            });
        }
        if std::time::Instant::now() >= deadline {
            return Err(DomainStateError { code: "timeout", message: format!("Codex did not confirm the new conversation for prompt {}. Inspect the terminal before retrying.", codex.message_id) });
        }
        tokio::time::sleep(Duration::from_millis(150)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn highlighted_prompt_requires_reverse_video_and_edit_footer() {
        let screen = "› ordinary history\n\x1b[7m› selected first line\x1b[0m\n\x1b[7m  selected second line\x1b[0m\nq close   esc / ← to edit prev   → to edit next   enter to edit message\x1b[0m\x1b[23;73H";
        assert_eq!(
            selected_prompt(screen),
            Some((1, "selected first line selected second line".into()))
        );
        assert_eq!(selected_prompt("\x1b[7m› selected\x1b[0m"), None);
        assert_eq!(selected_prompt(&screen.replace("\x1b[7m", "")), None);
    }

    #[test]
    fn initial_selection_is_the_latest_prompt_even_without_highlight_paint() {
        let screen = "› first prompt\n\n• first answer\n\n› latest prompt\nwrapped line\n\n• latest answer\nq to quit   esc/← to edit prev   → to edit next   enter to edit message";
        assert_eq!(
            initial_prompt(screen),
            Some((4, "latest prompt wrapped line".into()))
        );
        assert_eq!(
            initial_prompt(&screen.replace("› latest", "\u{1b}[0m\u{1b}[1m› \u{1b}[0mlatest")),
            Some((4, "latest prompt wrapped line".into()))
        );
        assert_eq!(initial_prompt("› composer draft"), None);
    }

    #[test]
    fn working_session_cannot_rewind() {
        let mut session = json!({"lifecycleState": "running", "runtimeSettings": {
            "agentActivity": {"activity": "working", "workingSource": "explicit", "agentName": "codex"}
        }});
        assert_eq!(idle(&session).unwrap_err().code, "agentBusy");
        session["runtimeSettings"]["agentActivity"]["activity"] = json!("idle");
        assert!(idle(&session).is_ok());
        session["lifecycleState"] = json!("stopped");
        assert_eq!(idle(&session).unwrap_err().code, "sessionNotRunning");
    }

    #[test]
    fn empty_rewind_identity_drops_the_previous_transcript_path() {
        use crate::agents::{ResolvedIdentity, SessionIdentityUpdateSource};
        let previous = ResolvedIdentity {
            agent_id: Some("codex".into()),
            agent_session_id: Some("old".into()),
            agent_session_path: Some("old.jsonl".into()),
        };
        let observed = ResolvedIdentity {
            agent_id: Some("codex".into()),
            agent_session_id: Some("new".into()),
            agent_session_path: None,
        };
        let next = crate::agents::merge_observed_session_identity(&observed, &previous);
        assert!(next.agent_session_path.is_none());
        let runtime = crate::agents::apply_session_identity_runtime_settings(
            &previous,
            &next,
            json!({"agentSessionId": "old", "agentSessionPath": "old.jsonl"})
                .as_object()
                .unwrap()
                .clone(),
            SessionIdentityUpdateSource::Passive,
            Some("codex".into()),
        );
        assert_eq!(runtime.get("agentSessionId"), Some(&json!("new")));
        assert!(!runtime.contains_key("agentSessionPath"));
    }

    #[tokio::test]
    #[ignore = "Requires an explicitly disposable idle Codex zmx session and rollout path"]
    async fn live_codex_rewind_latest_then_oldest() {
        let name = std::env::var("GHOSTEX_CODEX_REWIND_TEST_ZMX").expect("disposable session");
        let mut path =
            PathBuf::from(std::env::var("GHOSTEX_CODEX_REWIND_TEST_ROLLOUT").expect("rollout"));
        let driver = RewindDriver {
            project_id: "codex-rewind-live-test",
            session_id: "codex-rewind-live-test",
            zmx_name: &name,
            source: "codex-rewind-live-test",
            cancelled: &|| false,
        };
        for latest in [true, false] {
            let rows = prompts(&path).unwrap();
            assert!(
                rows.len() >= 2,
                "seed at least three prompts before running"
            );
            let presses = if latest { 0 } else { rows.len() - 1 };
            let meta = read_codex_session_meta(&path).unwrap();
            let codex = CodexRewindPlan {
                paths: crate::paths::get_gxserver_paths(None),
                server_id: String::new(),
                transcript_path: path.clone(),
                agent_session_id: meta.session_id,
                message_id: rows[presses].0.clone(),
                prompts: rows,
            };
            let plan = RewindPlan {
                codex: None,
                target_first_line: prompt_first_line(&codex.prompts[presses].1),
                presses,
            };
            // Start with an unsent multiline draft, including the prompt the
            // previous rewind restored. The production clear must remove it.
            driver
                .write(
                    &crate::session_chat_send::wrap_terminal_bracketed_paste_text(
                        "unsent draft\nsecond line",
                    ),
                )
                .await
                .unwrap();
            tokio::time::sleep(Duration::from_millis(300)).await;
            let started = drive_picker(&driver, &plan, &codex, || Ok(()))
                .await
                .unwrap();
            let next = wait_for_branch(&driver, &plan, &codex, started)
                .await
                .unwrap();
            assert_ne!(next.agent_session_id, codex.agent_session_id);
            if let Some(next_path) = next.path {
                assert_eq!(prompts(&next_path).unwrap(), codex.prompts[presses + 1..]);
                path = next_path;
            } else {
                assert_eq!(presses + 1, codex.prompts.len());
            }
            eprintln!(
                "Verified rewind with {presses} Left presses: {}",
                next.agent_session_id
            );
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    }
}
