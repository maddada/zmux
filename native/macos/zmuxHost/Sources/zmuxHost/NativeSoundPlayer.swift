import AVFoundation
import Foundation
import OSLog

@MainActor
final class NativeSoundPlayer: NSObject, AVAudioPlayerDelegate {
  private static let logger = Logger(subsystem: "com.madda.zmux.host", category: "sound")
  static let shared = NativeSoundPlayer()

  private var players: [ObjectIdentifier: AVAudioPlayer] = [:]

  /**
   CDXC:NativeSound 2026-04-29-16:30
   Completion and action sounds must play from the native host instead of the
   sidebar WKWebView so completion alerts are not blocked by browser autoplay
   or missing webview sound URLs.
   */
  func play(_ command: PlaySound) {
    guard isBundledSoundFileName(command.fileName) else {
      Self.logger.error("Rejected invalid sound file name \(command.fileName, privacy: .public)")
      return
    }

    let soundUrl = Self.resolveSoundUrl(fileName: command.fileName)
    guard FileManager.default.fileExists(atPath: soundUrl.path) else {
      Self.logger.error("Sound file not found \(soundUrl.path, privacy: .public)")
      return
    }

    do {
      let player = try AVAudioPlayer(contentsOf: soundUrl)
      player.volume = Float(max(0, min(command.volume ?? 0.5, 1)))
      player.delegate = self
      players[ObjectIdentifier(player)] = player
      player.prepareToPlay()
      player.play()
    } catch {
      Self.logger.error("Failed to play sound \(command.fileName, privacy: .public): \(error.localizedDescription, privacy: .public)")
    }
  }

  nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    Task { @MainActor in
      players.removeValue(forKey: ObjectIdentifier(player))
    }
  }

  nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    Task { @MainActor in
      players.removeValue(forKey: ObjectIdentifier(player))
    }
  }

  private static func resolveSoundUrl(fileName: String) -> URL {
    if let bundledSoundUrl = Bundle.main.resourceURL?
      .appendingPathComponent("Web", isDirectory: true)
      .appendingPathComponent("sounds", isDirectory: true)
      .appendingPathComponent(fileName),
      FileManager.default.fileExists(atPath: bundledSoundUrl.path)
    {
      return bundledSoundUrl
    }

    let repoRootPath = ProcessInfo.processInfo.environment["zmux_REPO_ROOT"]
      ?? FileManager.default.currentDirectoryPath
    return URL(fileURLWithPath: repoRootPath, isDirectory: true)
      .appendingPathComponent("media", isDirectory: true)
      .appendingPathComponent("sounds", isDirectory: true)
      .appendingPathComponent(fileName)
  }

  private func isBundledSoundFileName(_ fileName: String) -> Bool {
    fileName.hasSuffix(".mp3") &&
      !fileName.contains("/") &&
      !fileName.contains("\\") &&
      !fileName.contains("..")
  }
}
