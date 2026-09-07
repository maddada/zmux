#pragma once

#import <AppKit/AppKit.h>
#import <QuartzCore/QuartzCore.h>
#import <objc/runtime.h>

/*
 CDXC:Workarea 2026-09-06 WHY:
 CEF and Ghostty are native children above GPUI, so their rectangular content would cover the curved pane border even after GPUI rounds it.
 Clip their existing layers at the window's bottom corners; their frames and input ownership remain with normal layout.
 SEE-ALSO: src/app/element/window_corner_pane.rs uses the same 18pt corner radius.
 */
static inline void GhostexGpuiClipNativeViewWindowCorners(NSView *view) {
  static char maskKey;
  NSView *root = view.window.contentView;
  CAShapeLayer *mask = objc_getAssociatedObject(view, &maskKey);
  if (!root || !view.superview || view.window.parentWindow ||
      !view.window.titlebarAppearsTransparent ||
      (view.window.styleMask & NSWindowStyleMaskFullScreen)) {
    if (mask && view.layer.mask == mask) view.layer.mask = nil;
    return;
  }

  const CGFloat radius = 18.0;
  NSRect frame = [view convertRect:view.bounds toView:root];
  NSRect viewport = root.bounds;
  CGFloat bottom = root.isFlipped ? NSMaxY(viewport) - NSMaxY(frame)
                                 : NSMinY(frame) - NSMinY(viewport);
  CGFloat left = NSMinX(frame) - NSMinX(viewport);
  CGFloat right = NSMaxX(viewport) - NSMaxX(frame);
  BOOL roundLeft = bottom >= 0 && bottom < radius && left >= 0 && left < radius;
  BOOL roundRight = bottom >= 0 && bottom < radius && right >= 0 && right < radius;
  if (!roundLeft && !roundRight) {
    if (mask && view.layer.mask == mask) view.layer.mask = nil;
    return;
  }

  // A border-inset child clips against the inset window curve, exposing the
  // GPUI stroke beneath it. Taller bottom bars and interior split panes do
  // not intersect either corner and therefore receive no mask.
  CGFloat inset = bottom;
  if (roundLeft) inset = MIN(inset, left);
  if (roundRight) inset = MIN(inset, right);
  NSRect clip = [root convertRect:NSInsetRect(viewport, inset, inset) toView:view];
  CGFloat r = radius - inset;
  CGMutablePathRef path = CGPathCreateMutable();
  CGPathAddRoundedRect(path, NULL, NSRectToCGRect(clip), r, r);
  if (mask && view.layer.mask == mask && NSEqualRects(mask.frame, view.bounds) &&
      mask.path && CGPathEqualToPath(mask.path, path)) {
    CGPathRelease(path);
    return;
  }
  if (!mask) {
    mask = [CAShapeLayer layer];
    objc_setAssociatedObject(view, &maskKey, mask, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  }
  view.wantsLayer = YES;
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  mask.frame = view.bounds;
  mask.path = path;
  view.layer.mask = mask;
  [CATransaction commit];
  CGPathRelease(path);
}
