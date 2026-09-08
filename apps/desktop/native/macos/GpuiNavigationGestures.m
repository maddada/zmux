#import "GpuiNavigationGestures.h"

extern int GhostexGpuiNavigateHistoryFromNativeView(void *rootView, bool back);

static const void *GhostexGpuiNavigationOriginalMethodsKey =
    &GhostexGpuiNavigationOriginalMethodsKey;

static BOOL GhostexGpuiNavigateFromView(NSView *view, BOOL back) {
  NSView *root = GhostexGpuiNavigationRootForView(view);
  return root && GhostexGpuiNavigateHistoryFromNativeView(
                     (__bridge void *)root, back);
}

static void GhostexGpuiForwardNavigationEvent(id self, SEL selector,
                                              NSEvent *event) {
  for (Class candidate = object_getClass(self); candidate;
       candidate = class_getSuperclass(candidate)) {
    NSDictionary *methods = objc_getAssociatedObject(
        candidate, GhostexGpuiNavigationOriginalMethodsKey);
    NSValue *original = methods[NSStringFromSelector(selector)];
    if (original) {
      void (*implementation)(id, SEL, NSEvent *) = original.pointerValue;
      implementation(self, selector, event);
      return;
    }
  }
}

/**
 * CDXC:Navigation 2026-09-08 DECISION:
 * User: mouse 4/5 and macOS back/forward gestures in browser tabs, sessions, and panes should act like the titlebar's previous/next buttons.
 * Handle the events on the existing native views so CEF cannot separately navigate its page history for the same press.
 */
static void GhostexGpuiNavigationOtherMouseDown(id self, SEL selector,
                                                NSEvent *event) {
  if ((event.buttonNumber == 3 || event.buttonNumber == 4) &&
      GhostexGpuiNavigateFromView(self, event.buttonNumber == 3)) {
    return;
  }
  GhostexGpuiForwardNavigationEvent(self, selector, event);
}

static void GhostexGpuiNavigationOtherMouseUp(id self, SEL selector,
                                              NSEvent *event) {
  if ((event.buttonNumber == 3 || event.buttonNumber == 4) &&
      GhostexGpuiNavigationRootForView(self)) {
    return;
  }
  GhostexGpuiForwardNavigationEvent(self, selector, event);
}

static void GhostexGpuiNavigationSwipe(id self, SEL selector, NSEvent *event) {
  if (event.deltaX != 0 && event.deltaY == 0 &&
      GhostexGpuiNavigateFromView(self, event.deltaX > 0)) {
    return;
  }
  GhostexGpuiForwardNavigationEvent(self, selector, event);
}

void GhostexGpuiInstallNavigationGestureMethods(Class viewClass) {
  if (!viewClass || objc_getAssociatedObject(
                        viewClass, GhostexGpuiNavigationOriginalMethodsKey)) {
    return;
  }
  SEL selectors[] = {@selector(otherMouseDown:), @selector(otherMouseUp:),
                     @selector(swipeWithEvent:)};
  IMP implementations[] = {(IMP)GhostexGpuiNavigationOtherMouseDown,
                           (IMP)GhostexGpuiNavigationOtherMouseUp,
                           (IMP)GhostexGpuiNavigationSwipe};
  NSMutableDictionary *originals = [NSMutableDictionary dictionary];
  for (NSUInteger index = 0; index < 3; index++) {
    SEL selector = selectors[index];
    originals[NSStringFromSelector(selector)] = [NSValue
        valueWithPointer:class_getMethodImplementation(viewClass, selector)];
    class_replaceMethod(viewClass, selector, implementations[index], "v@:@");
  }
  objc_setAssociatedObject(viewClass, GhostexGpuiNavigationOriginalMethodsKey,
                           originals, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}
