use crate::app::consts::GPUI_SESSION_CHAT_DRAFT_TRANSFER_TIMEOUT;
use crate::app::session_chat::GpuiSessionChatDraftHandoff;
use crate::*;

impl GhostexGpuiApp {
    /// CDXC:SessionChat 2026-09-08 SEE-ALSO:
    /// server/src/session_chat_input_replace.rs owns draft replacement for sends, rewind cleanup and this view handoff. Native paste bypassed the session queue and appended the chat draft to the prompt rewind left behind.
    pub(crate) fn dispatch_session_chat_terminal_draft_handoff(
        &mut self,
        session_id: TerminalSessionId,
        handoff: GpuiSessionChatDraftHandoff,
        cx: &mut gpui::Context<Self>,
    ) -> bool {
        let request = if let Some(key) = self.agents_chat_local_key_for_session(session_id) {
            let params = serde_json::json!({
                "projectId": key.project_id, "sessionId": key.session_id,
                "content": handoff.content,
            });
            cx.background_executor().spawn(async move {
                gpui_gxserver_rpc_result(
                    "/api/replaceSessionChatDraft",
                    &params,
                    GPUI_SESSION_CHAT_DRAFT_TRANSFER_TIMEOUT,
                )
            })
        } else {
            let Some(key) = self.agents_chat_remote_key_for_session(session_id) else {
                return false;
            };
            let Some(target) = self.gpui_remote_gxserver_request_target(&key.remote_machine_id)
            else {
                return false;
            };
            let params = serde_json::json!({
                "projectId": key.project_id, "sessionId": key.session_id,
                "content": handoff.content,
            });
            cx.background_executor().spawn(async move {
                gpui_remote_gxserver_rpc_result(
                    &target,
                    "/api/replaceSessionChatDraft",
                    &params,
                    GPUI_SESSION_CHAT_DRAFT_TRANSFER_TIMEOUT,
                )
            })
        };
        // Claim once: remount and focus drains must not queue another replacement.
        self.pending_session_terminal_composer_insert
            .remove(&session_id);
        cx.spawn(async move |this, cx| {
            let result = request.await;
            let _ = this.update(cx, |this, cx| {
                match result {
                    Ok(_) => {
                        this.release_session_chat_draft_handoff_stash(handoff, cx);
                        if this.agents_chat_mode_sessions.contains(&session_id) {
                            // A return to Chat may have raced the outgoing RPC. Capture after
                            // placement so the session queue hands the draft to its current owner.
                            this.request_session_chat_draft_transfer(session_id, cx);
                        }
                    }
                    Err(error) => {
                        this.deliver_session_chat_composer_insert(session_id, handoff.content, cx);
                        this.dispatch_gpui_app_modal_toast(
                            "warning",
                            "Draft handoff failed",
                            &error,
                            cx,
                        );
                    }
                }
            });
        })
        .detach();
        true
    }
}
