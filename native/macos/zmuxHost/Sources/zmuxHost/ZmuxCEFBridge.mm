#import "ZmuxCEFBridge.h"

#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <cstring>
#include <functional>
#include <map>
#include <string>
#include <vector>

#include "include/base/cef_logging.h"
#include "include/cef_app.h"
#include "include/cef_application_mac.h"
#include "include/cef_browser.h"
#include "include/cef_client.h"
#include "include/cef_command_line.h"
#include "include/cef_context_menu_handler.h"
#include "include/cef_display_handler.h"
#include "include/cef_life_span_handler.h"
#include "include/cef_load_handler.h"
#include "include/wrapper/cef_helpers.h"
#include "include/wrapper/cef_library_loader.h"

static int g_remoteDebuggingPort = 9333;
static bool g_cefInitialized = false;
static CefRefPtr<CefApp> g_cefApp;
static std::map<std::string, CefRefPtr<CefRequestContext>> g_persistentRequestContexts;
static NSString* const ZmuxCEFBuiltInDefaultProfileIdentifier = @"52B43C05-4A1D-45D3-8FD5-9EF94952E445";

static bool IsPortAvailable(int port) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);
  if (sock < 0) {
    return false;
  }
  int opt = 1;
  setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

  sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
  addr.sin_port = htons(static_cast<uint16_t>(port));

  int result = bind(sock, reinterpret_cast<sockaddr*>(&addr), sizeof(addr));
  close(sock);
  return result == 0;
}

static int FindAvailableRemoteDebuggingPort(void) {
  for (int port = 9333; port <= 9343; ++port) {
    if (IsPortAvailable(port)) {
      return port;
    }
  }
  return 9333;
}

static NSString* ZmuxCEFHomeDirectoryName(void) {
  NSString* value = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"ZMUXHomeDirectoryName"];
  if ([value isKindOfClass:[NSString class]] && value.length > 0) {
    return value;
  }
  return @".zmux";
}

static NSString* ZmuxCEFStorageDirectory(void) {
  NSString* root = [NSHomeDirectory() stringByAppendingPathComponent:ZmuxCEFHomeDirectoryName()];
  NSString* path = [root stringByAppendingPathComponent:@"cef"];
  [[NSFileManager defaultManager] createDirectoryAtPath:path
                            withIntermediateDirectories:YES
                                             attributes:nil
                                                  error:nil];
  return path;
}

static CefRefPtr<CefRequestContext> ZmuxCEFRequestContextForProfile(NSString* profileIdentifier) {
  NSString* identifier = profileIdentifier.length > 0 ? profileIdentifier : @"default";
  if ([identifier isEqualToString:@"default"] || [identifier isEqualToString:ZmuxCEFBuiltInDefaultProfileIdentifier]) {
    return CefRequestContext::GetGlobalContext();
  }

  std::string key([identifier UTF8String]);
  auto existing = g_persistentRequestContexts.find(key);
  if (existing != g_persistentRequestContexts.end()) {
    return existing->second;
  }

  /**
   CDXC:ChromiumBrowserPanes 2026-05-04-17:09
   Electrobun keeps CEF custom partitions outside Chromium's own `Default`
   profile folder and reuses each request context. Chrome runtime can reject
   duplicate or colliding cache paths, so custom zmux profiles use cached CEF
   contexts under `cef/partitions/<profile-id>` while the built-in default
   profile stays on Chromium's global context.
   */
  NSString* partitionPath = [[ZmuxCEFStorageDirectory() stringByAppendingPathComponent:@"partitions"]
    stringByAppendingPathComponent:identifier];
  [[NSFileManager defaultManager] createDirectoryAtPath:partitionPath
                            withIntermediateDirectories:YES
                                             attributes:nil
                                                  error:nil];

  CefRequestContextSettings contextSettings;
  contextSettings.persist_session_cookies = true;
  CefString(&contextSettings.cache_path) = [partitionPath UTF8String];
  CefRefPtr<CefRequestContext> context = CefRequestContext::CreateContext(contextSettings, nullptr);
  if (!context) {
    NSLog(@"[CEF] Failed to create persistent request context for profile %@; using global context.", identifier);
    return CefRequestContext::GetGlobalContext();
  }
  g_persistentRequestContexts[key] = context;
  return context;
}

static NSString* ZmuxCEFFrameworkExecutablePath(void) {
  return [[[NSBundle mainBundle] privateFrameworksPath]
    stringByAppendingPathComponent:@"Chromium Embedded Framework.framework/Chromium Embedded Framework"];
}

static NSString* ZmuxCEFFrameworkBundlePath(void) {
  return [[[NSBundle mainBundle] privateFrameworksPath]
    stringByAppendingPathComponent:@"Chromium Embedded Framework.framework"];
}

static NSString* ZmuxCEFHelperExecutablePath(void) {
  return [[[NSBundle mainBundle] privateFrameworksPath]
    stringByAppendingPathComponent:@"zmux Helper.app/Contents/MacOS/zmux Helper"];
}

static NSString* EscapeDevToolsWebSocketURL(NSString* url) {
  return [url stringByReplacingOccurrencesOfString:@"ws://" withString:@""];
}

@interface ZmuxCEFApplication : NSApplication<CefAppProtocol> {
 @private
  BOOL handlingSendEvent_;
}
@end

@implementation ZmuxCEFApplication
- (BOOL)isHandlingSendEvent {
  return handlingSendEvent_;
}

- (void)setHandlingSendEvent:(BOOL)handlingSendEvent {
  handlingSendEvent_ = handlingSendEvent;
}

- (void)sendEvent:(NSEvent*)event {
  CefScopedSendingEvent sendingEventScoper;
  [super sendEvent:event];
}
@end

class ZmuxCEFApp : public CefApp, public CefBrowserProcessHandler {
 public:
  ZmuxCEFApp() = default;

  CefRefPtr<CefBrowserProcessHandler> GetBrowserProcessHandler() override {
    return this;
  }

  void OnBeforeCommandLineProcessing(const CefString& process_type, CefRefPtr<CefCommandLine> command_line) override {
    /**
     CDXC:ChromiumBrowserPanes 2026-05-04-16:38
     Embedded Chromium panes must start in the correct CEF mode instead of
     attempting WebKit first. Keep the command line minimal and local-dev
     oriented: localhost cert exceptions support zmux/T3 tooling, while the
     remote DevTools frontend remains bound to the selected loopback port.
     */
    command_line->AppendSwitch("use-mock-keychain");
    command_line->AppendSwitch("enable-fullscreen");
    command_line->AppendSwitch("allow-insecure-localhost");
    command_line->AppendSwitchWithValue("remote-allow-origins", "*");
  }

  void OnBeforeChildProcessLaunch(CefRefPtr<CefCommandLine> command_line) override {
    command_line->AppendSwitch("disable-background-mode");
    command_line->AppendSwitch("disable-backgrounding-occluded-windows");
  }

 private:
  IMPLEMENT_REFCOUNTING(ZmuxCEFApp);
  DISALLOW_COPY_AND_ASSIGN(ZmuxCEFApp);
};

class ZmuxRemoteDevToolsClient : public CefClient, public CefLifeSpanHandler {
 public:
  explicit ZmuxRemoteDevToolsClient(std::function<void()> onClose) : onClose_(std::move(onClose)) {}

  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override {
    return this;
  }

  void OnBeforeClose(CefRefPtr<CefBrowser> browser) override {
    if (onClose_) {
      dispatch_async(dispatch_get_main_queue(), ^{
        onClose_();
      });
    }
  }

 private:
  std::function<void()> onClose_;

  IMPLEMENT_REFCOUNTING(ZmuxRemoteDevToolsClient);
  DISALLOW_COPY_AND_ASSIGN(ZmuxRemoteDevToolsClient);
};

@class ZmuxCEFBrowserView;

class ZmuxCEFBrowserClient : public CefClient,
                             public CefDisplayHandler,
                             public CefLoadHandler,
                             public CefLifeSpanHandler,
                             public CefContextMenuHandler {
 public:
  explicit ZmuxCEFBrowserClient(ZmuxCEFBrowserView* owner) : owner_(owner) {}

  CefRefPtr<CefDisplayHandler> GetDisplayHandler() override { return this; }
  CefRefPtr<CefLoadHandler> GetLoadHandler() override { return this; }
  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override { return this; }
  CefRefPtr<CefContextMenuHandler> GetContextMenuHandler() override { return this; }

  void OnTitleChange(CefRefPtr<CefBrowser> browser, const CefString& title) override;
  void OnAddressChange(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, const CefString& url) override;
  void OnFaviconURLChange(CefRefPtr<CefBrowser> browser, const std::vector<CefString>& icon_urls) override;
  void OnLoadingStateChange(CefRefPtr<CefBrowser> browser, bool isLoading, bool canGoBack, bool canGoForward) override;
  void OnAfterCreated(CefRefPtr<CefBrowser> browser) override;
  bool DoClose(CefRefPtr<CefBrowser> browser) override;
  void OnBeforeClose(CefRefPtr<CefBrowser> browser) override;
  bool OnBeforePopup(CefRefPtr<CefBrowser> browser,
                     CefRefPtr<CefFrame> frame,
                     int popup_id,
                     const CefString& target_url,
                     const CefString& target_frame_name,
                     CefLifeSpanHandler::WindowOpenDisposition target_disposition,
                     bool user_gesture,
                     const CefPopupFeatures& popupFeatures,
                     CefWindowInfo& windowInfo,
                     CefRefPtr<CefClient>& client,
                     CefBrowserSettings& settings,
                     CefRefPtr<CefDictionaryValue>& extra_info,
                     bool* no_javascript_access) override;
  void OnBeforeContextMenu(CefRefPtr<CefBrowser> browser,
                           CefRefPtr<CefFrame> frame,
                           CefRefPtr<CefContextMenuParams> params,
                           CefRefPtr<CefMenuModel> model) override;
  bool OnContextMenuCommand(CefRefPtr<CefBrowser> browser,
                            CefRefPtr<CefFrame> frame,
                            CefRefPtr<CefContextMenuParams> params,
                            int command_id,
                            CefContextMenuHandler::EventFlags event_flags) override;

  void ToggleRemoteDevTools(CefRefPtr<CefBrowser> browser);
  void CloseRemoteDevTools();

 private:
  static constexpr int kInspectElementCommandId = 26001;

  void OpenRemoteDevToolsFrontend(CefRefPtr<CefBrowser> browser);
  void CreateRemoteDevToolsWindow(NSString* frontendURL);

  __weak ZmuxCEFBrowserView* owner_;
  NSWindow* devToolsWindow_ = nil;
  CefRefPtr<CefBrowser> devToolsBrowser_;
  CefRefPtr<ZmuxRemoteDevToolsClient> devToolsClient_;
  bool devToolsOpen_ = false;
  std::string lastTitle_;

  IMPLEMENT_REFCOUNTING(ZmuxCEFBrowserClient);
  DISALLOW_COPY_AND_ASSIGN(ZmuxCEFBrowserClient);
};

static NSString* StringFromCefString(const CefString& value) {
  std::string stringValue = value.ToString();
  return [NSString stringWithUTF8String:stringValue.c_str()] ?: @"";
}

@interface ZmuxCEFBrowserView () {
 @private
  NSString* initialURL_;
  NSString* profileIdentifier_;
  CefRefPtr<CefBrowser> browser_;
  CefRefPtr<ZmuxCEFBrowserClient> client_;
  NSView* cefView_;
  NSString* currentURLString_;
  NSString* pageTitle_;
  BOOL canGoBack_;
  BOOL canGoForward_;
  BOOL isLoading_;
  BOOL didCreateBrowser_;
}
@end

@implementation ZmuxCEFBrowserView

- (instancetype)initWithFrame:(NSRect)frameRect
                   initialURL:(NSString*)initialURL
            profileIdentifier:(NSString*)profileIdentifier {
  self = [super initWithFrame:frameRect];
  if (self) {
    initialURL_ = [initialURL copy];
    profileIdentifier_ = [profileIdentifier copy];
    currentURLString_ = [initialURL copy];
    self.wantsLayer = YES;
    self.layer.backgroundColor = [NSColor colorWithCalibratedWhite:0.086 alpha:1].CGColor;
    self.layer.masksToBounds = YES;
  }
  return self;
}

- (BOOL)isFlipped {
  return YES;
}

- (BOOL)acceptsFirstResponder {
  return YES;
}

- (BOOL)becomeFirstResponder {
  if (cefView_ && self.window) {
    [self.window makeFirstResponder:cefView_];
  }
  return [super becomeFirstResponder];
}

- (void)viewDidMoveToWindow {
  [super viewDidMoveToWindow];
  if (self.window && !didCreateBrowser_) {
    [self createBrowserIfNeeded];
  }
}

- (void)layout {
  [super layout];
  cefView_.frame = self.bounds;
}

- (NSString*)currentURLString {
  return currentURLString_;
}

- (NSString*)pageTitle {
  return pageTitle_;
}

- (BOOL)canGoBack {
  return canGoBack_;
}

- (BOOL)canGoForward {
  return canGoForward_;
}

- (BOOL)isLoading {
  return isLoading_;
}

- (void)createBrowserIfNeeded {
  if (didCreateBrowser_ || !g_cefInitialized) {
    return;
  }
  didCreateBrowser_ = YES;

  CefWindowInfo windowInfo;
  windowInfo.runtime_style = CEF_RUNTIME_STYLE_ALLOY;
  CefRect rect(0, 0, static_cast<int>(MAX(1, self.bounds.size.width)), static_cast<int>(MAX(1, self.bounds.size.height)));
  windowInfo.SetAsChild((__bridge void*)self, rect);

  CefBrowserSettings browserSettings;
  browserSettings.background_color = CefColorSetARGB(255, 22, 22, 22);

  CefRefPtr<CefRequestContext> requestContext = ZmuxCEFRequestContextForProfile(profileIdentifier_);

  client_ = new ZmuxCEFBrowserClient(self);
  browser_ = CefBrowserHost::CreateBrowserSync(
    windowInfo,
    client_,
    CefString("about:blank"),
    browserSettings,
    nullptr,
    requestContext);
  if (!browser_) {
    return;
  }

  CefWindowHandle handle = browser_->GetHost()->GetWindowHandle();
  cefView_ = (__bridge NSView*)handle;
  cefView_.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  cefView_.frame = self.bounds;
  [self setNeedsLayout:YES];

  if (initialURL_.length > 0) {
    [self loadURLString:initialURL_];
  }
}

- (void)loadURLString:(NSString*)urlString {
  currentURLString_ = [urlString copy];
  if (self.urlChangedHandler) {
    self.urlChangedHandler(currentURLString_);
  }
  if (browser_ && urlString.length > 0) {
    browser_->GetMainFrame()->LoadURL(CefString([urlString UTF8String]));
  }
}

- (void)goBack {
  if (browser_ && browser_->CanGoBack()) {
    browser_->GoBack();
  }
}

- (void)goForward {
  if (browser_ && browser_->CanGoForward()) {
    browser_->GoForward();
  }
}

- (void)reload {
  if (browser_) {
    browser_->Reload();
  }
}

- (void)stopLoading {
  if (browser_) {
    browser_->StopLoad();
  }
}

- (void)executeJavaScript:(NSString*)javaScript {
  if (!browser_ || javaScript.length == 0) {
    return;
  }
  CefRefPtr<CefFrame> frame = browser_->GetMainFrame();
  if (frame) {
    frame->ExecuteJavaScript(CefString([javaScript UTF8String]), frame->GetURL(), 0);
  }
}

- (void)toggleDevTools {
  if (browser_ && client_) {
    client_->ToggleRemoteDevTools(browser_);
  }
}

- (void)closeBrowser {
  if (client_) {
    client_->CloseRemoteDevTools();
  }
  if (browser_) {
    browser_->GetHost()->CloseBrowser(false);
    browser_ = nullptr;
  }
  if (cefView_) {
    [cefView_ removeFromSuperview];
    cefView_ = nil;
  }
}

- (void)dealloc {
  [self closeBrowser];
}

- (void)zmuxCEFSetTitle:(NSString*)title {
  pageTitle_ = [title copy];
  if (self.titleChangedHandler) {
    self.titleChangedHandler(pageTitle_ ?: @"");
  }
}

- (void)zmuxCEFSetURL:(NSString*)url {
  currentURLString_ = [url copy];
  if (self.urlChangedHandler) {
    self.urlChangedHandler(currentURLString_ ?: @"");
  }
}

- (void)zmuxCEFSetFaviconURL:(NSString*)url {
  if (self.faviconURLChangedHandler) {
    self.faviconURLChangedHandler(url ?: @"");
  }
}

- (void)zmuxCEFSetLoading:(BOOL)isLoading canGoBack:(BOOL)canGoBack canGoForward:(BOOL)canGoForward {
  isLoading_ = isLoading;
  canGoBack_ = canGoBack;
  canGoForward_ = canGoForward;
  if (self.navigationStateChangedHandler) {
    self.navigationStateChangedHandler(canGoBack_, canGoForward_, isLoading_);
  }
}

@end

void ZmuxCEFBrowserClient::OnTitleChange(CefRefPtr<CefBrowser> browser, const CefString& title) {
  lastTitle_ = title.ToString();
  NSString* titleString = StringFromCefString(title);
  dispatch_async(dispatch_get_main_queue(), ^{
    [owner_ zmuxCEFSetTitle:titleString];
  });
}

void ZmuxCEFBrowserClient::OnAddressChange(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, const CefString& url) {
  if (!frame->IsMain()) {
    return;
  }
  NSString* urlString = StringFromCefString(url);
  dispatch_async(dispatch_get_main_queue(), ^{
    [owner_ zmuxCEFSetURL:urlString];
  });
}

void ZmuxCEFBrowserClient::OnFaviconURLChange(CefRefPtr<CefBrowser> browser, const std::vector<CefString>& icon_urls) {
  if (icon_urls.empty()) {
    return;
  }
  NSString* faviconURL = StringFromCefString(icon_urls.front());
  dispatch_async(dispatch_get_main_queue(), ^{
    [owner_ zmuxCEFSetFaviconURL:faviconURL];
  });
}

void ZmuxCEFBrowserClient::OnLoadingStateChange(CefRefPtr<CefBrowser> browser, bool isLoading, bool canGoBack, bool canGoForward) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [owner_ zmuxCEFSetLoading:isLoading canGoBack:canGoBack canGoForward:canGoForward];
  });
}

void ZmuxCEFBrowserClient::OnAfterCreated(CefRefPtr<CefBrowser> browser) {}

bool ZmuxCEFBrowserClient::DoClose(CefRefPtr<CefBrowser> browser) {
  return false;
}

void ZmuxCEFBrowserClient::OnBeforeClose(CefRefPtr<CefBrowser> browser) {
  CloseRemoteDevTools();
}

bool ZmuxCEFBrowserClient::OnBeforePopup(CefRefPtr<CefBrowser> browser,
                                         CefRefPtr<CefFrame> frame,
                                         int popup_id,
                                         const CefString& target_url,
                                         const CefString& target_frame_name,
                                         CefLifeSpanHandler::WindowOpenDisposition target_disposition,
                                         bool user_gesture,
                                         const CefPopupFeatures& popupFeatures,
                                         CefWindowInfo& windowInfo,
                                         CefRefPtr<CefClient>& client,
                                         CefBrowserSettings& settings,
                                         CefRefPtr<CefDictionaryValue>& extra_info,
                                         bool* no_javascript_access) {
  std::string url = target_url.ToString();
  if (browser && !url.empty()) {
    browser->GetMainFrame()->LoadURL(target_url);
  }
  return true;
}

void ZmuxCEFBrowserClient::OnBeforeContextMenu(CefRefPtr<CefBrowser> browser,
                                               CefRefPtr<CefFrame> frame,
                                               CefRefPtr<CefContextMenuParams> params,
                                               CefRefPtr<CefMenuModel> model) {
  if (model->GetCount() > 0) {
    model->AddSeparator();
  }
  model->AddItem(kInspectElementCommandId, "Inspect Element");
}

bool ZmuxCEFBrowserClient::OnContextMenuCommand(CefRefPtr<CefBrowser> browser,
                                                CefRefPtr<CefFrame> frame,
                                                CefRefPtr<CefContextMenuParams> params,
                                                int command_id,
                                                CefContextMenuHandler::EventFlags event_flags) {
  if (command_id == kInspectElementCommandId) {
    OpenRemoteDevToolsFrontend(browser);
    return true;
  }
  return false;
}

void ZmuxCEFBrowserClient::ToggleRemoteDevTools(CefRefPtr<CefBrowser> browser) {
  if (devToolsOpen_) {
    CloseRemoteDevTools();
    return;
  }
  OpenRemoteDevToolsFrontend(browser);
}

void ZmuxCEFBrowserClient::CloseRemoteDevTools() {
  devToolsOpen_ = false;
  if (devToolsWindow_) {
    [devToolsWindow_ orderOut:nil];
  }
}

void ZmuxCEFBrowserClient::OpenRemoteDevToolsFrontend(CefRefPtr<CefBrowser> browser) {
  NSString* baseURL = [NSString stringWithFormat:@"http://127.0.0.1:%d", g_remoteDebuggingPort];
  NSURL* targetsURL = [NSURL URLWithString:[baseURL stringByAppendingString:@"/json"]];
  NSString* currentURL = nil;
  if (browser && browser->GetMainFrame()) {
    currentURL = StringFromCefString(browser->GetMainFrame()->GetURL());
  }
  NSString* title = lastTitle_.empty() ? nil : [NSString stringWithUTF8String:lastTitle_.c_str()];

  NSURLSessionDataTask* task = [[NSURLSession sharedSession]
    dataTaskWithURL:targetsURL
  completionHandler:^(NSData* data, NSURLResponse* response, NSError* error) {
    if (error || !data) {
      NSLog(@"[CEF] Remote DevTools target lookup failed: %@", error);
      return;
    }
    NSError* jsonError = nil;
    id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
    if (jsonError || ![json isKindOfClass:[NSArray class]]) {
      NSLog(@"[CEF] Remote DevTools target JSON was invalid: %@", jsonError);
      return;
    }
    NSDictionary* selected = nil;
    for (NSDictionary* item in (NSArray*)json) {
      NSString* itemURL = item[@"url"];
      NSString* itemTitle = item[@"title"];
      if ((currentURL && [itemURL isKindOfClass:[NSString class]] && [itemURL isEqualToString:currentURL]) ||
          (title && [itemTitle isKindOfClass:[NSString class]] && [itemTitle isEqualToString:title])) {
        selected = item;
        break;
      }
    }
    if (!selected && [(NSArray*)json count] > 0) {
      selected = [(NSArray*)json firstObject];
    }
    NSString* webSocketURL = selected[@"webSocketDebuggerUrl"];
    if (![webSocketURL isKindOfClass:[NSString class]]) {
      NSLog(@"[CEF] Remote DevTools target did not include a webSocketDebuggerUrl");
      return;
    }
    NSString* frontendURL = [NSString stringWithFormat:@"%@/devtools/inspector.html?ws=%@&dockSide=undocked",
                                                       baseURL,
                                                       EscapeDevToolsWebSocketURL(webSocketURL)];
    dispatch_async(dispatch_get_main_queue(), ^{
      CreateRemoteDevToolsWindow(frontendURL);
    });
  }];
  [task resume];
}

void ZmuxCEFBrowserClient::CreateRemoteDevToolsWindow(NSString* frontendURL) {
  if (!devToolsWindow_) {
    NSRect frame = NSMakeRect(160, 160, 1120, 820);
    devToolsWindow_ = [[NSWindow alloc] initWithContentRect:frame
                                                  styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskResizable | NSWindowStyleMaskMiniaturizable
                                                    backing:NSBackingStoreBuffered
                                                      defer:NO];
    [devToolsWindow_ setTitle:@"Chromium DevTools"];
    [devToolsWindow_ setReleasedWhenClosed:NO];
  }
  [devToolsWindow_ makeKeyAndOrderFront:nil];
  devToolsOpen_ = true;

  if (!devToolsClient_) {
    CefRefPtr<ZmuxCEFBrowserClient> selfRef(this);
    devToolsClient_ = new ZmuxRemoteDevToolsClient([selfRef]() {
      selfRef->CloseRemoteDevTools();
    });
  }
  if (devToolsBrowser_) {
    devToolsBrowser_->GetMainFrame()->LoadURL(CefString([frontendURL UTF8String]));
    return;
  }
  NSView* contentView = [devToolsWindow_ contentView];
  CefWindowInfo windowInfo;
  windowInfo.runtime_style = CEF_RUNTIME_STYLE_ALLOY;
  windowInfo.SetAsChild((__bridge void*)contentView, CefRect(0, 0, static_cast<int>(contentView.bounds.size.width), static_cast<int>(contentView.bounds.size.height)));
  CefBrowserSettings settings;
  devToolsBrowser_ = CefBrowserHost::CreateBrowserSync(
    windowInfo,
    devToolsClient_,
    CefString([frontendURL UTF8String]),
    settings,
    nullptr,
    nullptr);
}

bool ZmuxCEFPrepareApplication(void) {
  [ZmuxCEFApplication sharedApplication];
  return [NSApp isKindOfClass:[ZmuxCEFApplication class]];
}

bool ZmuxCEFIsRuntimeAvailable(void) {
  return [[NSFileManager defaultManager] fileExistsAtPath:ZmuxCEFFrameworkExecutablePath()]
    && [[NSFileManager defaultManager] fileExistsAtPath:ZmuxCEFHelperExecutablePath()];
}

bool ZmuxCEFInitialize(int argc, char* _Nullable argv[]) {
  if (g_cefInitialized) {
    return true;
  }
  if (![NSApp isKindOfClass:[ZmuxCEFApplication class]]) {
    return false;
  }
  if (!ZmuxCEFIsRuntimeAvailable()) {
    NSLog(@"[CEF] Runtime not available. Missing framework or helper app.");
    return false;
  }

  CefMainArgs mainArgs(argc, argv);
  g_cefApp = new ZmuxCEFApp();

  CefSettings settings;
  settings.no_sandbox = true;
  settings.multi_threaded_message_loop = false;
  settings.windowless_rendering_enabled = false;
  g_remoteDebuggingPort = FindAvailableRemoteDebuggingPort();
  settings.remote_debugging_port = g_remoteDebuggingPort;

  NSString* bundlePath = [[NSBundle mainBundle] bundlePath];
  if (bundlePath) {
    CefString(&settings.main_bundle_path) = [bundlePath UTF8String];
  }
  CefString(&settings.framework_dir_path) = [ZmuxCEFFrameworkBundlePath() UTF8String];
  CefString(&settings.browser_subprocess_path) = [ZmuxCEFHelperExecutablePath() UTF8String];

  NSString* cachePath = ZmuxCEFStorageDirectory();
  [[NSFileManager defaultManager] createDirectoryAtPath:cachePath
                            withIntermediateDirectories:YES
                                             attributes:nil
                                                  error:nil];
  /**
   CDXC:ChromiumBrowserPanes 2026-05-04-17:01
   CEF requires every request-context cache_path to be a child of
   root_cache_path. Use ~/.zmux[-dev]/cef as the root so profile caches under
   cef/profiles/<profile-id> persist cookies/storage instead of falling back to
   in-memory Chromium storage.
   */
  CefString(&settings.root_cache_path) = [cachePath UTF8String];
  CefString(&settings.log_file) = [[cachePath stringByAppendingPathComponent:@"debug.log"] UTF8String];
  CefString(&settings.accept_language_list) = "en-US,en";

  if (!CefInitialize(mainArgs, settings, g_cefApp.get(), nullptr)) {
    NSLog(@"[CEF] CefInitialize failed.");
    return false;
  }
  g_cefInitialized = true;
  NSLog(@"[CEF] Initialized with remote debugging on 127.0.0.1:%d", g_remoteDebuggingPort);
  return true;
}

void ZmuxCEFRunMessageLoop(void) {
  CefRunMessageLoop();
}

void ZmuxCEFShutdown(void) {
  if (g_cefInitialized) {
    CefShutdown();
    g_cefInitialized = false;
  }
}

int ZmuxCEFRemoteDebuggingPort(void) {
  return g_remoteDebuggingPort;
}
