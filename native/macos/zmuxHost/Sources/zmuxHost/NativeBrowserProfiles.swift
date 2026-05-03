import AppKit
import Foundation
import WebKit

struct NativeBrowserProfileDefinition: Codable, Hashable, Identifiable, Sendable {
  let id: UUID
  var displayName: String
  let createdAt: Date
  let isBuiltInDefault: Bool
}

@MainActor
final class NativeBrowserProfileStore {
  static let shared = NativeBrowserProfileStore()

  private static let profilesDefaultsKey = "browserProfiles.v1"
  private static let lastUsedProfileDefaultsKey = "browserProfiles.lastUsed"
  private static let builtInDefaultProfileID = UUID(uuidString: "52B43C05-4A1D-45D3-8FD5-9EF94952E445")!

  private let defaults: UserDefaults
  private var dataStores: [UUID: WKWebsiteDataStore] = [:]
  private(set) var profiles: [NativeBrowserProfileDefinition] = []
  private(set) var lastUsedProfileID: UUID = builtInDefaultProfileID

  private init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    load()
  }

  var effectiveLastUsedProfileID: UUID {
    profileDefinition(id: lastUsedProfileID) != nil
      ? lastUsedProfileID
      : Self.builtInDefaultProfileID
  }

  func profileDefinition(id: UUID) -> NativeBrowserProfileDefinition? {
    profiles.first(where: { $0.id == id })
  }

  func displayName(for id: UUID) -> String {
    profileDefinition(id: id)?.displayName ?? "Default"
  }

  func noteUsed(_ id: UUID) {
    guard profileDefinition(id: id) != nil else { return }
    lastUsedProfileID = id
    defaults.set(id.uuidString, forKey: Self.lastUsedProfileDefaultsKey)
  }

  func createProfile(named rawName: String) -> NativeBrowserProfileDefinition? {
    let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !name.isEmpty else { return nil }
    let profile = NativeBrowserProfileDefinition(
      id: UUID(),
      displayName: name,
      createdAt: Date(),
      isBuiltInDefault: false
    )
    profiles.append(profile)
    sortAndPersist()
    noteUsed(profile.id)
    return profile
  }

  func websiteDataStore(for profileID: UUID) -> WKWebsiteDataStore {
    if profileID == Self.builtInDefaultProfileID {
      return .default()
    }
    if let existing = dataStores[profileID] {
      return existing
    }
    if #available(macOS 14.0, *) {
      let store = WKWebsiteDataStore(forIdentifier: profileID)
      dataStores[profileID] = store
      return store
    }
    return .default()
  }

  private func load() {
    if let data = defaults.data(forKey: Self.profilesDefaultsKey),
      let decoded = try? JSONDecoder().decode([NativeBrowserProfileDefinition].self, from: data)
    {
      profiles = decoded
    }

    if !profiles.contains(where: \.isBuiltInDefault) {
      profiles.append(
        NativeBrowserProfileDefinition(
          id: Self.builtInDefaultProfileID,
          displayName: "Default",
          createdAt: Date(timeIntervalSince1970: 0),
          isBuiltInDefault: true
        ))
    }

    if let rawID = defaults.string(forKey: Self.lastUsedProfileDefaultsKey),
      let id = UUID(uuidString: rawID),
      profileDefinition(id: id) != nil
    {
      lastUsedProfileID = id
    }

    sortAndPersist()
  }

  private func sortAndPersist() {
    profiles.sort {
      if $0.isBuiltInDefault != $1.isBuiltInDefault {
        return $0.isBuiltInDefault && !$1.isBuiltInDefault
      }
      return $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending
    }
    if let data = try? JSONEncoder().encode(profiles) {
      defaults.set(data, forKey: Self.profilesDefaultsKey)
    }
  }
}

/**
 CDXC:BrowserPanes 2026-05-02-06:35
 Profile selection is native macOS UI and persists the chosen browser profile
 for future browser panes. Existing panes keep their current WebKit data store;
 new panes use the selected profile's WKWebsiteDataStore.
 */
@MainActor
enum NativeBrowserProfileUI {
  static func showPicker(parentWindow: NSWindow?, currentProfileID: UUID?) {
    let store = NativeBrowserProfileStore.shared
    let menu = NSMenu(title: "Profiles")
    for profile in store.profiles {
      let item = NSMenuItem(title: profile.displayName, action: #selector(ProfileMenuTarget.pick(_:)), keyEquivalent: "")
      item.identifier = NSUserInterfaceItemIdentifier(profile.id.uuidString)
      item.state = profile.id == (currentProfileID ?? store.effectiveLastUsedProfileID) ? .on : .off
      item.target = ProfileMenuTarget.shared
      menu.addItem(item)
    }
    menu.addItem(.separator())
    let newItem = NSMenuItem(title: "New Profile...", action: #selector(ProfileMenuTarget.create(_:)), keyEquivalent: "")
    newItem.target = ProfileMenuTarget.shared
    menu.addItem(newItem)
    let importItem = NSMenuItem(
      title: "Import Browser Data...",
      action: #selector(ProfileMenuTarget.importBrowserData(_:)),
      keyEquivalent: ""
    )
    importItem.target = ProfileMenuTarget.shared
    menu.addItem(importItem)

    let location = NSEvent.mouseLocation
    if let event = NSEvent.mouseEvent(
      with: .rightMouseDown,
      location: location,
      modifierFlags: [],
      timestamp: ProcessInfo.processInfo.systemUptime,
      windowNumber: parentWindow?.windowNumber ?? 0,
      context: nil,
      eventNumber: 0,
      clickCount: 1,
      pressure: 1
    ) {
      NSMenu.popUpContextMenu(menu, with: event, for: parentWindow?.contentView ?? NSView())
    }
  }

  static func showImportSettings(parentWindow: NSWindow?) {
    let alert = NSAlert()
    alert.messageText = "Import Browser Data"
    alert.informativeText = "Import settings are available from the browser profile menu. Pick a destination profile before importing browser data."
    alert.alertStyle = .informational
    alert.addButton(withTitle: "OK")
    if let parentWindow {
      alert.beginSheetModal(for: parentWindow)
    } else {
      alert.runModal()
    }
  }

  private final class ProfileMenuTarget: NSObject {
    static let shared = ProfileMenuTarget()

    @MainActor
    @objc func pick(_ sender: NSMenuItem) {
      guard let rawID = sender.identifier?.rawValue,
        let profileID = UUID(uuidString: rawID)
      else { return }
      NativeBrowserProfileStore.shared.noteUsed(profileID)
    }

    @MainActor
    @objc func create(_ sender: NSMenuItem) {
      let alert = NSAlert()
      alert.messageText = "New Browser Profile"
      alert.informativeText = "Enter a name for the new browser profile."
      alert.addButton(withTitle: "Create")
      alert.addButton(withTitle: "Cancel")
      let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
      input.placeholderString = "Profile name"
      alert.accessoryView = input
      guard alert.runModal() == .alertFirstButtonReturn else { return }
      _ = NativeBrowserProfileStore.shared.createProfile(named: input.stringValue)
    }

    @MainActor
    @objc func importBrowserData(_ sender: NSMenuItem) {
      /**
       CDXC:BrowserPanes 2026-05-02-17:13
       The reference browser exposes import from the native profile menu, not
       as a permanent extra address-bar button. Keep the entry in this menu so
       the toolbar stays visually aligned while preserving the import action.
       */
      NativeBrowserProfileUI.showImportSettings(parentWindow: NSApp.keyWindow ?? NSApp.mainWindow)
    }
  }
}
