//! Shared geometry and typography for the Resources and remote sites dropdowns.
//! CDXC:Browser 2026-09-06 DECISION:
//! User: remote dev servers must use the exact Resources dropdown width, sizes, fonts, and style; the Resources implementation supersedes the HTML mockup's proportions.
use crate::*;

pub(super) fn resource_panel_frame() -> gpui::Div {
    div()
        .relative()
        .size_full()
        .overflow_hidden()
        .border_1()
        .border_color(titlebar_popup_menu_border_color())
        .bg(titlebar_popup_menu_background())
}

pub(super) fn resource_header() -> gpui::Div {
    h_flex()
        .relative()
        .h(px(TITLEBAR_POPUP_READING_HEADER_HEIGHT))
        .flex_shrink_0()
        .items_stretch()
        .border_b_1()
        .border_color(rgb(0xffffff).opacity(0.12))
}

pub(super) fn resource_heading() -> gpui::Div {
    h_flex()
        .min_w_0()
        .flex_1()
        .items_center()
        .gap(px(8.0))
        .pl(px(12.0))
        .text_size(px(14.0))
        .font_weight(FontWeight::BOLD)
        .text_color(rgb(0xffffff).opacity(0.96))
}

pub(super) fn resource_section_heading() -> gpui::Div {
    h_flex()
        .h(px(24.0))
        .items_center()
        .gap(px(6.0))
        .px(px(2.0))
        .text_size(px(11.0))
        .text_color(rgb(0xffffff).opacity(0.62))
}

pub(super) fn resource_row_frame() -> gpui::Div {
    v_flex()
        .w_full()
        .overflow_hidden()
        .border_1()
        .border_color(rgb(0xffffff).opacity(0.10))
        .bg(rgb(0xffffff).opacity(0.025))
}

pub(super) fn resource_row_content() -> gpui::Div {
    h_flex()
        .min_h(px(44.0))
        .items_center()
        .gap(px(8.0))
        .p(px(8.0))
        .py(px(7.0))
}

pub(super) fn resource_avatar_tile() -> gpui::Div {
    div()
        .flex_shrink_0()
        .flex()
        .size(px(28.0))
        .items_center()
        .justify_center()
        .bg(rgb(0xffffff).opacity(0.10))
}

pub(super) fn resource_name_text() -> gpui::Div {
    div()
        .overflow_hidden()
        .whitespace_nowrap()
        .text_ellipsis()
        .text_size(px(13.0))
        .text_color(rgb(0xffffff).opacity(0.94))
}

pub(super) fn resource_detail_text() -> gpui::Div {
    div()
        .overflow_hidden()
        .whitespace_nowrap()
        .text_ellipsis()
        .text_size(px(12.0))
        .text_color(rgb(0xffffff).opacity(0.58))
}

pub(super) fn resource_metric(width: f32) -> gpui::Div {
    h_flex()
        .flex_shrink_0()
        .w(px(width))
        .h(px(24.0))
        .items_center()
        .justify_center()
        .gap(px(6.0))
        .border_1()
        .border_color(rgb(0xffffff).opacity(0.105))
        .bg(rgb(0xffffff).opacity(0.055))
        .text_size(px(12.0))
        .text_color(rgb(0xffffff).opacity(0.88))
}

pub(super) fn resource_square_button(id: String) -> gpui::Stateful<gpui::Div> {
    h_flex()
        .id(id)
        .flex_shrink_0()
        .size(px(22.0))
        .items_center()
        .justify_center()
        .border_1()
        .border_color(rgb(0xffffff).opacity(0.16))
        .bg(rgb(0xffffff).opacity(0.14))
        .cursor_pointer()
        .hover(|this| this.bg(rgb(0xffffff).opacity(0.20)))
}
