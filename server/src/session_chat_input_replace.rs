use std::time::{Duration, Instant};

use super::{
    build_agent_tui_clear_input, capture_session_terminal_text_vt, write_session_chat_payload,
    SessionChatSendError, SessionChatSendFailure, AGENT_TUI_CLEAR_LINE_SLACK,
    SESSION_CHAT_CLEAR_INPUT_SETTLE_MS, SESSION_CHAT_COMPOSER_WAIT_TIMEOUT_MS,
    SESSION_CHAT_SEND_CANCELLED,
};
use crate::session_chat_composer::{
    detect_session_chat_composer_readiness, session_chat_composer_input, SessionChatComposerState,
};

/// CDXC:SessionChat 2026-09-08 DECISION:
/// User: sending from Chat must clear existing Claude or Codex terminal text and send the chat input. Rewind's restored prompt belongs in Chat, and switching to Terminal must not append another copy.
/// The clear is checked against the live draft, not sized solely from the replacement text; a longer old draft can require several separately delivered bursts.
pub async fn clear_session_chat_composer(
    project_id: &str,
    session_id: &str,
    zmx_name: &str,
    source: &str,
    agent: &str,
    cancelled: &(impl Fn() -> bool + Sync + ?Sized),
) -> Result<(), SessionChatSendError> {
    let deadline = Instant::now() + Duration::from_millis(SESSION_CHAT_COMPOSER_WAIT_TIMEOUT_MS);
    let mut grok_clear_sent = false;
    loop {
        if cancelled() {
            return Err(SessionChatSendError::not_attempted(
                SESSION_CHAT_SEND_CANCELLED.to_string(),
            ));
        }
        if let Some(screen) = capture_session_terminal_text_vt(zmx_name).await {
            let notice = crate::session_chat_notice::classify_session_chat_terminal_notice(
                Some(agent),
                &screen,
            );
            let ready =
                detect_session_chat_composer_readiness(Some(agent), &screen, notice.as_ref());
            if ready.state == SessionChatComposerState::Ready {
                if let Some(input) = session_chat_composer_input(agent, &screen) {
                    if input.is_empty() {
                        return Ok(());
                    }
                    if cancelled() {
                        return Err(SessionChatSendError::not_attempted(
                            SESSION_CHAT_SEND_CANCELLED.to_string(),
                        ));
                    }
                    // CDXC:AgentProviders 2026-09-08 WHY:
                    // Grok's Ctrl+U quits to install an update. Ctrl+C clears a nonempty draft, but repeating it after the draft disappears can cancel or quit, so send it once and verify.
                    if agent != "grok" || !grok_clear_sent {
                        let clear = if agent == "grok" {
                            grok_clear_sent = true;
                            "\u{3}".to_string()
                        } else {
                            build_agent_tui_clear_input(input.rows + AGENT_TUI_CLEAR_LINE_SLACK)
                        };
                        write_session_chat_payload(
                            project_id, session_id, zmx_name, source, &clear,
                        )
                        .await
                        .map_err(|message| {
                            SessionChatSendError::new(SessionChatSendFailure::Write, message)
                        })?;
                    }
                }
            }
        }
        if Instant::now() >= deadline {
            break;
        }
        tokio::time::sleep(Duration::from_millis(SESSION_CHAT_CLEAR_INPUT_SETTLE_MS)).await;
    }
    Err(SessionChatSendError::new(
        SessionChatSendFailure::ComposerNotCleared,
        "The terminal draft could not be cleared and verified. Your chat draft has been kept."
            .to_string(),
    ))
}

async fn place_session_chat_draft(
    target: &super::SessionChatSendTarget,
    content: &str,
) -> Result<serde_json::Value, crate::domain::DomainStateError> {
    if content.len() > crate::zmx::GXSERVER_ZMX_SEND_TEXT_LIMIT_BYTES {
        return Err(crate::domain::DomainStateError {
            code: "invalidParams",
            message: "The draft exceeds the terminal input size limit.".to_string(),
        });
    }
    let agent = crate::session_chat_composer::session_chat_composer_agent_id(&target.session)
        .or_else(|| crate::session_chat_follower::session_chat_agent_for_session(&target.session));
    let mut steps = super::build_session_chat_message_steps(agent.as_deref(), content, &[], false);
    // Staging a draft owns the same clear/paste transaction, without submitting a turn.
    steps.pop();
    super::execute_session_chat_send(
        &target.project_id,
        &target.session_id,
        &target.zmx_name,
        "session-chat-draft-to-terminal",
        steps,
    )
    .await
    .map_err(|error| crate::domain::DomainStateError {
        code: "sessionInputFailed",
        message: error.message,
    })?;
    Ok(serde_json::json!({ "replaced": true }))
}

pub(crate) async fn handle_replace_session_chat_draft_http(
    state: &crate::server::AppState,
    endpoint_path: String,
    request_id: String,
    body: &serde_json::Value,
) -> crate::server::RoutedResponse {
    use crate::{
        domain::{read_domain_rpc_params, DomainStateError},
        server::{domain_error_response, routed_json},
    };
    let params = match read_domain_rpc_params(body) {
        Ok(params) => params,
        Err(error) => return domain_error_response(endpoint_path, request_id, error),
    };
    let target =
        match super::resolve_session_chat_send_target(state, &params, "replaceSessionChatDraft") {
            Ok(target) => target,
            Err(error) => return domain_error_response(endpoint_path, request_id, error),
        };
    let Some(content) = params
        .get("content")
        .and_then(serde_json::Value::as_str)
        .filter(|text| !text.trim().is_empty())
    else {
        return domain_error_response(
            endpoint_path,
            request_id,
            DomainStateError {
                code: "invalidParams",
                message: "A terminal draft replacement requires content.".to_string(),
            },
        );
    };
    match place_session_chat_draft(&target, content).await {
        Ok(result) => routed_json(
            Some(endpoint_path),
            axum::http::StatusCode::OK,
            crate::protocol::rpc_success(request_id, result),
        ),
        Err(error) => domain_error_response(endpoint_path, request_id, error),
    }
}
