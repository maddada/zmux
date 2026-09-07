// C1 wave-2: gpui Element implementations moved verbatim out of main.rs.
// Glob-re-exported here so existing unqualified call sites keep resolving.
pub(crate) mod cef_surface;
pub(crate) mod window_corner_pane;

pub(crate) use cef_surface::*;
pub(crate) use window_corner_pane::*;
