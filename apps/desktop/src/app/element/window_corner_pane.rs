use gpui::{Element, Styled};

pub(crate) trait WindowCornerPaneExt: Element + Styled + Sized {
    #[cfg(target_os = "macos")]
    fn window_corner_pane(self) -> WindowCornerPane<Self> {
        WindowCornerPane(self)
    }

    #[cfg(not(target_os = "macos"))]
    fn window_corner_pane(self) -> Self {
        self
    }
}

impl<E: Element + Styled> WindowCornerPaneExt for E {}

#[cfg(target_os = "macos")]
pub(crate) fn refresh_native_window_corner_clip(native_view: *mut std::ffi::c_void) {
    unsafe extern "C" {
        fn GhostexGpuiCEFRefreshNativeViewWindowCorners(native_view: *mut std::ffi::c_void);
    }
    unsafe { GhostexGpuiCEFRefreshNativeViewWindowCorners(native_view) }
}

#[cfg(target_os = "macos")]
use gpui::{
    App, Bounds, ElementId, GlobalElementId, InspectorElementId, IntoElement, LayoutId, Pixels,
    Window, px,
};

/// CDXC:Workarea 2026-09-06 DECISION:
/// User: on macOS, round only pane bottom corners that meet the window's bottom corners, accounting for splits, either sidebar side, hidden sidebars, and bottom/right command panels in every state.
/// Use this frame's layout bounds, including pane Focus mode and panel reservations, so rounding cannot lag a resize or depend on a duplicated layout model.
#[cfg(target_os = "macos")]
pub(crate) struct WindowCornerPane<E>(E);

#[cfg(target_os = "macos")]
impl<E: Element + Styled> IntoElement for WindowCornerPane<E> {
    type Element = Self;

    fn into_element(self) -> Self {
        self
    }
}

#[cfg(target_os = "macos")]
impl<E: Element + Styled> Element for WindowCornerPane<E> {
    type RequestLayoutState = E::RequestLayoutState;
    type PrepaintState = E::PrepaintState;

    fn id(&self) -> Option<ElementId> {
        self.0.id()
    }

    fn source_location(&self) -> Option<&'static std::panic::Location<'static>> {
        self.0.source_location()
    }

    fn request_layout(
        &mut self,
        id: Option<&GlobalElementId>,
        inspector_id: Option<&InspectorElementId>,
        window: &mut Window,
        cx: &mut App,
    ) -> (LayoutId, Self::RequestLayoutState) {
        self.0.request_layout(id, inspector_id, window, cx)
    }

    fn prepaint(
        &mut self,
        id: Option<&GlobalElementId>,
        inspector_id: Option<&InspectorElementId>,
        bounds: Bounds<Pixels>,
        state: &mut Self::RequestLayoutState,
        window: &mut Window,
        cx: &mut App,
    ) -> Self::PrepaintState {
        // The command group has a 1pt outer edge and a 1pt right reservation;
        // companion bodies may also sit inside their parent's 1pt border.
        let edge_inset = px(2.0);
        let viewport = window.viewport_size();
        let at_bottom =
            !window.is_fullscreen() && (bounds.bottom() - viewport.height).abs() <= edge_inset;
        let left = at_bottom && bounds.left().abs() <= edge_inset;
        let right = at_bottom && (bounds.right() - viewport.width).abs() <= edge_inset;
        // SEE-ALSO: native/macos/GpuiWindowCorners.h clips native child content
        // to the same 18pt window corner, leaving the pane border visible.
        self.0.style().corner_radii.bottom_left = Some(px(if left { 18.0 } else { 0.0 }).into());
        self.0.style().corner_radii.bottom_right = Some(px(if right { 18.0 } else { 0.0 }).into());
        self.0.prepaint(id, inspector_id, bounds, state, window, cx)
    }

    fn paint(
        &mut self,
        id: Option<&GlobalElementId>,
        inspector_id: Option<&InspectorElementId>,
        bounds: Bounds<Pixels>,
        state: &mut Self::RequestLayoutState,
        prepaint: &mut Self::PrepaintState,
        window: &mut Window,
        cx: &mut App,
    ) {
        self.0
            .paint(id, inspector_id, bounds, state, prepaint, window, cx);
    }
}
