//! The daemon registry owns sessions even when the sidebar does not display them.

use crate::app::helpers::*;
use crate::app::model::*;
use std::collections::HashSet;
use std::time::Duration;

pub(crate) struct ResourceSessionOwner {
    pub(crate) project_id: String,
    pub(crate) session_id: String,
    pub(crate) title: String,
    pub(crate) project_title: String,
    pub(crate) zmx_name: String,
}

/// CDXC:Resources 2026-09-07 WHY:
/// Sidebar status indicators omit command terminals, filtered sessions and Recent Projects, so they cannot establish whether a daemon is orphaned.
/// Ask gxserver for the durable owners of the sampled zmx names; process existence still comes from the local sample, not a cached provider probe.
pub(crate) fn read_resource_session_owners(
    processes: &[GpuiNativeResourceProcess],
) -> Result<Vec<ResourceSessionOwner>, String> {
    let names = processes
        .iter()
        .filter_map(gpui_native_resource_zmx_session_name)
        .collect::<HashSet<_>>();
    if names.is_empty() {
        return Ok(Vec::new());
    }
    let result = gpui_gxserver_rpc_result(
        "/api/readResourceSessionOwners",
        &serde_json::json!({ "zmxNames": names }),
        Duration::from_secs(2),
    )?;
    let sessions = result
        .get("sessions")
        .and_then(serde_json::Value::as_array)
        .ok_or("Invalid resource session inventory.")?;
    sessions
        .iter()
        .map(|session| {
            let text = |key| {
                session
                    .get(key)
                    .and_then(serde_json::Value::as_str)
                    .map(str::to_string)
                    .ok_or_else(|| "Invalid resource session owner.".to_string())
            };
            Ok(ResourceSessionOwner {
                project_id: text("projectId")?,
                session_id: text("sessionId")?,
                title: text("title")?,
                project_title: text("projectTitle")?,
                zmx_name: text("zmxName")?,
            })
        })
        .collect()
}
