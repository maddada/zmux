/*
CDXC:AgentScreenDetection 2026-08-31:
The zmx screen classifier in session_chat_terminal_activity.rs is the source of
truth for Claude Code's live `/compact` state. This module projects that
ephemeral screen fact into the session's effective activity without rewriting
agentActivity, which remains owned by hooks and terminal-title transitions.

Only a stable detected-at marker is persisted. Progress details remain in the
screen cache and chat frames. The marker makes presentation, lifecycle guards,
and the daemon-owned prompt queue agree even when no client is connected.
*/

use std::sync::{Arc, Mutex};

use serde_json::{json, Value};

use crate::constants::GXSERVER_PROTOCOL_VERSION;
use crate::domain::DomainRepository;
use crate::events::GxserverEventHub;
use crate::paths::GxserverPaths;
use crate::server::AppState;
use crate::storage::open_gxserver_database;

/// Durable runtime-settings key for the currently observed compaction run.
/// The value is the activity's stable `detectedAt`, so presentation can expose
/// a real working-start boundary without copying progress details into the
/// domain session.
pub const SESSION_CHAT_COMPACTING_DETECTED_AT_KEY: &str = "sessionChatCompactingDetectedAt";

pub(crate) const SESSION_CHAT_FLEET_DETECTED_AT_KEY: &str = "sessionChatFleetDetectedAt";
pub(crate) const SESSION_CHAT_MONITOR_DETECTED_AT_KEY: &str = "sessionChatMonitorDetectedAt";

pub(crate) fn session_chat_monitor_detected_at(session: &Value) -> Option<String> {
    session
        .pointer("/runtimeSettings/sessionChatMonitorDetectedAt")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

pub(crate) fn session_chat_fleet_detected_at(session: &Value) -> Option<String> {
    session
        .pointer("/runtimeSettings/sessionChatFleetDetectedAt")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

pub fn session_chat_compacting_detected_at(session: &Value) -> Option<String> {
    session
        .get("runtimeSettings")
        .and_then(Value::as_object)
        .and_then(|settings| settings.get(SESSION_CHAT_COMPACTING_DETECTED_AT_KEY))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

#[derive(Clone)]
pub(crate) struct SessionChatCompactingPublisher {
    event_hub: GxserverEventHub,
    paths: GxserverPaths,
    presentation_event_sequence: Arc<Mutex<()>>,
    server_id: String,
}

impl SessionChatCompactingPublisher {
    pub(crate) fn new(state: &AppState) -> Self {
        Self {
            event_hub: state.event_hub.clone(),
            paths: state.paths.clone(),
            presentation_event_sequence: state.presentation_event_sequence.clone(),
            server_id: state.metadata.server_id.clone(),
        }
    }

    pub(crate) fn publish(&self, project_id: &str, session_id: &str, detected_at: Option<&str>) {
        self.publish_marker(
            project_id,
            session_id,
            SESSION_CHAT_COMPACTING_DETECTED_AT_KEY,
            detected_at,
        );
    }

    pub(crate) fn publish_fleet(
        &self,
        project_id: &str,
        session_id: &str,
        detected_at: Option<&str>,
    ) {
        self.publish_marker(
            project_id,
            session_id,
            SESSION_CHAT_FLEET_DETECTED_AT_KEY,
            detected_at,
        );
    }

    pub(crate) fn publish_monitor(
        &self,
        project_id: &str,
        session_id: &str,
        detected_at: Option<&str>,
    ) {
        self.publish_marker(
            project_id,
            session_id,
            SESSION_CHAT_MONITOR_DETECTED_AT_KEY,
            detected_at,
        );
    }

    fn publish_marker(
        &self,
        project_id: &str,
        session_id: &str,
        key: &str,
        detected_at: Option<&str>,
    ) {
        let Ok(db) = open_gxserver_database(&self.paths) else {
            return;
        };
        let repository = DomainRepository::new(&db, self.server_id.as_str());
        let json_path = format!("$.{key}");
        /*
        Activity hooks and screen detection can land together at both ends of
        a compaction. Mutate only this JSON member in SQLite, atomically, so a
        stale read-modify-write cannot erase a concurrent agentActivity update
        (or vice versa).
        */
        let changed = match detected_at {
            Some(detected_at) => db.execute(
                r#"
                UPDATE sessions
                SET runtimeSettingsJson = json_set(runtimeSettingsJson, ?3, ?4),
                    updatedAt = ?5
                WHERE projectId = ?1 AND sessionId = ?2
                  AND json_extract(runtimeSettingsJson, ?3) IS NOT ?4
                  AND (?6 = 0 OR json_type(runtimeSettingsJson, ?3) IS NULL)
                "#,
                rusqlite::params![
                    project_id,
                    session_id,
                    json_path,
                    detected_at,
                    crate::domain::now_iso(),
                    key != SESSION_CHAT_COMPACTING_DETECTED_AT_KEY,
                ],
            ),
            None => db.execute(
                r#"
                UPDATE sessions
                SET runtimeSettingsJson = json_remove(runtimeSettingsJson, ?3),
                    updatedAt = ?4
                WHERE projectId = ?1 AND sessionId = ?2
                  AND json_type(runtimeSettingsJson, ?3) IS NOT NULL
                "#,
                rusqlite::params![project_id, session_id, json_path, crate::domain::now_iso(),],
            ),
        };
        if !matches!(changed, Ok(1)) {
            return;
        }
        let Ok(_event_sequence) = self.presentation_event_sequence.lock() else {
            return;
        };
        let Ok(delta) = crate::presentation::build_presentation_session_delta(
            &db,
            &repository,
            project_id,
            session_id,
        ) else {
            return;
        };
        let Ok(revision) = crate::presentation::increment_presentation_revision(&db) else {
            return;
        };
        self.event_hub.broadcast(json!({
            "delta": delta,
            "protocolVersion": GXSERVER_PROTOCOL_VERSION,
            "revision": revision,
            "serverId": self.server_id,
            "type": "presentationDelta",
        }));
    }
}
