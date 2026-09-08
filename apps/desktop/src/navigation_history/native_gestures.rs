use crate::app::ffi::GPUI_FIRST_RESPONDER_CALLBACK_TARGETS;

#[unsafe(no_mangle)]
pub extern "C" fn GhostexGpuiNavigateHistoryFromNativeView(
    root_view: *mut std::ffi::c_void,
    back: bool,
) -> std::ffi::c_int {
    let target = GPUI_FIRST_RESPONDER_CALLBACK_TARGETS
        .with(|targets| targets.borrow().get(&(root_view as usize)).cloned());
    let Some(target) = target else {
        return 0;
    };
    let mut async_app = target.async_app;
    let foreground = async_app.foreground_executor().clone();
    // Native callbacks can arrive while GPUI is dispatching an event. Enter
    // the app on the next executor turn, as the native keyboard router does.
    foreground
        .spawn(async move {
            let _ = target.app.update_in(&mut async_app, |this, _, cx| {
                let enabled = if back {
                    this.navigation_history_state.can_go_back
                } else {
                    this.navigation_history_state.can_go_forward
                };
                if enabled && this.app_modal_window.is_none() {
                    this.request_navigation_history_navigation(
                        if back { "back" } else { "forward" },
                        cx,
                    );
                }
            });
        })
        .detach();
    1
}
