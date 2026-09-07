//! CDXC:SessionStatus 2026-09-06 WHY:
//! Codex's `/subagents` display is history, not live terminal chrome. Its persisted spawn graph identifies descendants, while each child's newest turn lifecycle record distinguishes working from completed or interrupted.
//! SEE-ALSO: Codex codex-rs/state/src/runtime/threads.rs and codex-rs/rollout/src/policy.rs (a9896da3).

use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use rusqlite::{Connection, OpenFlags};
use serde_json::Value;

use crate::session_chat::{
    read_exact_at, read_transcript_file_version, SessionChatTurnLifecycle,
    SessionChatTurnLifecycleState, TranscriptFileVersion, TAIL_CHUNK_BYTES,
};
use crate::session_chat_agent_fleet::{SessionChatAgentFleet, SessionChatSubAgent};
use crate::session_chat_decode_codex::decode_codex_turn_lifecycle;
use crate::session_chat_tail::{find_last_complete_line_end, TailLineAccumulator};

type LifecycleCache = HashMap<PathBuf, (TranscriptFileVersion, Option<SessionChatTurnLifecycle>)>;

fn latest_lifecycle(path: &Path) -> std::io::Result<Option<SessionChatTurnLifecycle>> {
    static CACHE: OnceLock<Mutex<LifecycleCache>> = OnceLock::new();
    let cache = CACHE.get_or_init(Mutex::default);
    let version = read_transcript_file_version(path)?;
    if let Some((_, lifecycle)) = cache.lock().ok().and_then(|cache| {
        cache
            .get(path)
            .filter(|(previous, _)| previous == &version)
            .cloned()
    }) {
        return Ok(lifecycle);
    }
    let lifecycle = scan_latest_lifecycle(path)?;
    if let Ok(mut cache) = cache.lock() {
        if cache.len() >= 4096 {
            cache.clear();
        }
        cache.insert(path.to_path_buf(), (version, lifecycle.clone()));
    }
    Ok(lifecycle)
}

fn scan_latest_lifecycle(path: &Path) -> std::io::Result<Option<SessionChatTurnLifecycle>> {
    let file = File::open(path)?;
    let end = find_last_complete_line_end(&file, file.metadata()?.len())?;
    let mut cursor = end.saturating_sub(1);
    let mut line = TailLineAccumulator::new();
    let mut oversized = 0;
    let mut buffer = vec![0; TAIL_CHUNK_BYTES];
    while cursor > 0 {
        let start = cursor.saturating_sub(TAIL_CHUNK_BYTES as u64);
        let length = (cursor - start) as usize;
        read_exact_at(&file, &mut buffer[..length], start)?;
        let mut segment_end = length;
        for index in (0..length).rev() {
            if buffer[index] != b'\n' {
                continue;
            }
            line.retain_part(&buffer[index + 1..segment_end], &mut oversized);
            if line.oversized {
                line.reset();
            } else if let Some(record) = line.take_line() {
                if let Some(lifecycle) = decode_codex_turn_lifecycle(&record, "") {
                    return Ok(Some(lifecycle));
                }
            }
            segment_end = index;
        }
        line.retain_part(&buffer[..segment_end], &mut oversized);
        cursor = start;
    }
    Ok(None)
}

/// CDXC:SessionStatus 2026-09-07 WHY:
/// ClipBook's crashed /root/ui child retained an open spawn edge and task_started after Codex resumed without it; the startup hook was absent, so its old turn kept the session working forever.
/// Codex keeps loaded threads' rollouts open for append, including idle children. Require current process ownership before reading a historical child as live work, and verify the root rollout so an unreadable or mismatched process never declares the fleet idle.
fn live_rollout_paths(session: &Value, root_rollout: &Path) -> anyhow::Result<HashSet<PathBuf>> {
    let zmx_name = session
        .get("zmxName")
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow::anyhow!("Codex session has no zmx process owner"))?;
    let identities = crate::zmx::read_cached_zmx_session_process_identities(
        &[zmx_name.to_string()],
        &crate::paths::get_gxserver_paths(None).home_dir,
    )
    .map_err(|error| anyhow::anyhow!("Cannot read Codex process identity: {error:?}"))?;
    let pid = identities
        .get(zmx_name)
        .filter(|identity| identity.agent_id.as_deref() == Some("codex"))
        .and_then(|identity| identity.process_id)
        .ok_or_else(|| anyhow::anyhow!("Codex process owner is unavailable"))?;
    let paths: HashSet<_> = crate::zmx::process_open_file_paths(pid).into_iter().collect();
    anyhow::ensure!(
        paths.contains(root_rollout),
        "Codex process does not own the expected root rollout"
    );
    Ok(paths)
}

/// `Err` is unreadable evidence, so callers retain their previous fleet rather than declaring idle.
pub(crate) fn read_codex_fleet(session: &Value) -> anyhow::Result<Option<SessionChatAgentFleet>> {
    let Some(root_id) = session
        .pointer("/runtimeSettings/agentSessionId")
        .and_then(Value::as_str)
    else {
        return Ok(None);
    };
    let Some(rollout) = session
        .pointer("/runtimeSettings/agentSessionPath")
        .and_then(Value::as_str)
    else {
        return Ok(None);
    };
    let rollout = Path::new(rollout);
    let home = rollout
        .ancestors()
        .find(|path| path.file_name().is_some_and(|name| name == "sessions"))
        .and_then(Path::parent)
        .ok_or_else(|| anyhow::anyhow!("Codex rollout is outside its sessions directory"))?;
    let db = Connection::open_with_flags(
        home.join("state_5.sqlite"),
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    db.busy_timeout(std::time::Duration::from_millis(100))?;
    let mut query = db.prepare(
        "WITH RECURSIVE descendants(id) AS (
             SELECT child_thread_id FROM thread_spawn_edges WHERE parent_thread_id = ?1 AND status = 'open'
             UNION
             SELECT edge.child_thread_id FROM thread_spawn_edges edge JOIN descendants ON edge.parent_thread_id = descendants.id WHERE edge.status = 'open'
         ) SELECT threads.id, threads.rollout_path, threads.source FROM descendants JOIN threads ON threads.id = descendants.id WHERE threads.archived = 0 ORDER BY threads.id"
    )?;
    let children = query
        .query_map([root_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let now = chrono::Utc::now().timestamp_millis();
    let process_started = session
        .pointer("/runtimeSettings/sessionChatCodexStartedAt")
        .and_then(Value::as_str)
        .and_then(|at| chrono::DateTime::parse_from_rfc3339(at).ok())
        .map(|at| at.timestamp_millis());
    let mut agents = Vec::new();
    let mut live_paths = None;
    for (id, path, source) in children {
        let Some(lifecycle) = latest_lifecycle(Path::new(&path))? else {
            continue;
        };
        if lifecycle.state != SessionChatTurnLifecycleState::Working {
            continue;
        }
        if process_started
            .is_some_and(|started| lifecycle.timestamp.is_none_or(|turn| turn < started))
        {
            continue;
        }
        if live_paths.is_none() {
            live_paths = Some(live_rollout_paths(session, rollout)?);
        }
        if !live_paths.as_ref().unwrap().contains(Path::new(&path)) {
            continue;
        }
        let source: Value = serde_json::from_str(&source)?;
        let spawn = source.pointer("/subagent/thread_spawn");
        let name = spawn
            .and_then(|spawn| {
                spawn
                    .get("agent_path")
                    .and_then(Value::as_str)
                    .or_else(|| spawn.get("agent_nickname").and_then(Value::as_str))
            })
            .unwrap_or(&id)
            .to_string();
        agents.push(SessionChatSubAgent {
            name,
            task: None,
            elapsed_seconds: lifecycle
                .timestamp
                .map(|started| now.saturating_sub(started).max(0) as u64 / 1000),
            tokens: None,
            nested: None,
        });
    }
    Ok((!agents.is_empty()).then(|| SessionChatAgentFleet::new(agents)))
}
