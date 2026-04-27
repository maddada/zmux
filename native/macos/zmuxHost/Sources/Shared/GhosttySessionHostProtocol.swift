import Foundation

enum GhosttySessionHostProtocol {
    /**
     CDXC:NativeTerminalSurvival 2026-04-27-16:06
     Live Ghostty terminals may outlive the zmux UI process during updates.
     The helper and UI app must agree on this protocol before reusing any
     existing helper; incompatible helpers are force-closed rather than left as
     stale terminal owners.
     */
    static let version = 4
    static let port: UInt16 = 58744
}

struct GhosttyHostLease: Codable {
    let appInstanceId: String
    let protocolVersion: Int
    let timeoutSeconds: TimeInterval
}

enum GhosttySessionHostCommand: Encodable {
    case acquireLease(GhosttyHostLease)
    case releaseLease(appInstanceId: String)
    case configureLease(timeoutSeconds: TimeInterval)
    case createTerminal(GhosttyHostedCreateTerminal)
    case closeTerminal(sessionId: String)
    case focusTerminal(sessionId: String)
    case sendTerminalEnter(sessionId: String)
    case writeTerminalText(sessionId: String, text: String)
    case setTerminalFrame(sessionId: String, frame: GhosttyHostFrame, visible: Bool)
    case setActiveTerminalSet(sessionIds: [String], focusedSessionId: String?, attentionSessionIds: [String])
    case setHostAppActive(active: Bool)
    case resurfaceVisibleTerminals
    case forceCloseIncompatibleHelpers(protocolVersion: Int)

    private enum CodingKeys: String, CodingKey {
        case appInstanceId
        case attentionSessionIds
        case cwd
        case env
        case frame
        case focusedSessionId
        case initialInput
        case protocolVersion
        case sessionId
        case sessionIds
        case text
        case timeoutSeconds
        case title
        case type
        case visible
        case active
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .acquireLease(lease):
            try container.encode("acquireLease", forKey: .type)
            try container.encode(lease.appInstanceId, forKey: .appInstanceId)
            try container.encode(lease.protocolVersion, forKey: .protocolVersion)
            try container.encode(lease.timeoutSeconds, forKey: .timeoutSeconds)
        case let .releaseLease(appInstanceId):
            try container.encode("releaseLease", forKey: .type)
            try container.encode(appInstanceId, forKey: .appInstanceId)
        case let .configureLease(timeoutSeconds):
            try container.encode("configureLease", forKey: .type)
            try container.encode(timeoutSeconds, forKey: .timeoutSeconds)
        case let .createTerminal(command):
            try container.encode("createTerminal", forKey: .type)
            try container.encode(command.cwd, forKey: .cwd)
            try container.encodeIfPresent(command.env, forKey: .env)
            try container.encodeIfPresent(command.initialInput, forKey: .initialInput)
            try container.encode(command.sessionId, forKey: .sessionId)
            try container.encodeIfPresent(command.title, forKey: .title)
            try container.encodeIfPresent(command.frame, forKey: .frame)
            try container.encode(command.visible, forKey: .visible)
        case let .closeTerminal(sessionId):
            try container.encode("closeTerminal", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
        case let .focusTerminal(sessionId):
            try container.encode("focusTerminal", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
        case let .sendTerminalEnter(sessionId):
            try container.encode("sendTerminalEnter", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
        case let .writeTerminalText(sessionId, text):
            try container.encode("writeTerminalText", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(text, forKey: .text)
        case let .setTerminalFrame(sessionId, frame, visible):
            try container.encode("setTerminalFrame", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(frame, forKey: .frame)
            try container.encode(visible, forKey: .visible)
        case let .setActiveTerminalSet(sessionIds, focusedSessionId, attentionSessionIds):
            try container.encode("setActiveTerminalSet", forKey: .type)
            try container.encode(sessionIds, forKey: .sessionIds)
            try container.encodeIfPresent(focusedSessionId, forKey: .focusedSessionId)
            try container.encode(attentionSessionIds, forKey: .attentionSessionIds)
        case let .setHostAppActive(active):
            try container.encode("setHostAppActive", forKey: .type)
            try container.encode(active, forKey: .active)
        case .resurfaceVisibleTerminals:
            try container.encode("resurfaceVisibleTerminals", forKey: .type)
        case let .forceCloseIncompatibleHelpers(protocolVersion):
            try container.encode("forceCloseIncompatibleHelpers", forKey: .type)
            try container.encode(protocolVersion, forKey: .protocolVersion)
        }
    }
}

extension GhosttySessionHostCommand {
    var debugName: String {
        switch self {
        case .acquireLease: "acquireLease"
        case .releaseLease: "releaseLease"
        case .configureLease: "configureLease"
        case .createTerminal: "createTerminal"
        case .closeTerminal: "closeTerminal"
        case .focusTerminal: "focusTerminal"
        case .sendTerminalEnter: "sendTerminalEnter"
        case .writeTerminalText: "writeTerminalText"
        case .setTerminalFrame: "setTerminalFrame"
        case .setActiveTerminalSet: "setActiveTerminalSet"
        case .setHostAppActive: "setHostAppActive"
        case .resurfaceVisibleTerminals: "resurfaceVisibleTerminals"
        case .forceCloseIncompatibleHelpers: "forceCloseIncompatibleHelpers"
        }
    }
}

enum GhosttySessionHostCommandEnvelope: Decodable {
    case acquireLease(GhosttyHostLease)
    case releaseLease(appInstanceId: String)
    case configureLease(timeoutSeconds: TimeInterval)
    case createTerminal(GhosttyHostedCreateTerminal)
    case closeTerminal(sessionId: String)
    case focusTerminal(sessionId: String)
    case sendTerminalEnter(sessionId: String)
    case writeTerminalText(sessionId: String, text: String)
    case setTerminalFrame(sessionId: String, frame: GhosttyHostFrame, visible: Bool)
    case setActiveTerminalSet(sessionIds: [String], focusedSessionId: String?, attentionSessionIds: [String])
    case setHostAppActive(active: Bool)
    case resurfaceVisibleTerminals
    case forceCloseIncompatibleHelpers(protocolVersion: Int)

    private enum CodingKeys: String, CodingKey {
        case appInstanceId
        case frame
        case focusedSessionId
        case protocolVersion
        case sessionId
        case sessionIds
        case text
        case timeoutSeconds
        case type
        case visible
        case active
        case attentionSessionIds
    }

    private enum CommandType: String, Decodable {
        case acquireLease
        case closeTerminal
        case configureLease
        case createTerminal
        case focusTerminal
        case forceCloseIncompatibleHelpers
        case releaseLease
        case resurfaceVisibleTerminals
        case sendTerminalEnter
        case setActiveTerminalSet
        case setTerminalFrame
        case setHostAppActive
        case writeTerminalText
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(CommandType.self, forKey: .type) {
        case .acquireLease:
            self = .acquireLease(try GhosttyHostLease(from: decoder))
        case .releaseLease:
            self = .releaseLease(appInstanceId: try container.decode(String.self, forKey: .appInstanceId))
        case .configureLease:
            self = .configureLease(timeoutSeconds: try container.decode(TimeInterval.self, forKey: .timeoutSeconds))
        case .createTerminal:
            self = .createTerminal(try GhosttyHostedCreateTerminal(from: decoder))
        case .closeTerminal:
            self = .closeTerminal(sessionId: try container.decode(String.self, forKey: .sessionId))
        case .focusTerminal:
            self = .focusTerminal(sessionId: try container.decode(String.self, forKey: .sessionId))
        case .sendTerminalEnter:
            self = .sendTerminalEnter(sessionId: try container.decode(String.self, forKey: .sessionId))
        case .writeTerminalText:
            self = .writeTerminalText(
                sessionId: try container.decode(String.self, forKey: .sessionId),
                text: try container.decode(String.self, forKey: .text)
            )
        case .setTerminalFrame:
            self = .setTerminalFrame(
                sessionId: try container.decode(String.self, forKey: .sessionId),
                frame: try container.decode(GhosttyHostFrame.self, forKey: .frame),
                visible: try container.decode(Bool.self, forKey: .visible)
            )
        case .setActiveTerminalSet:
            self = .setActiveTerminalSet(
                sessionIds: try container.decode([String].self, forKey: .sessionIds),
                focusedSessionId: try container.decodeIfPresent(String.self, forKey: .focusedSessionId),
                attentionSessionIds: try container.decodeIfPresent([String].self, forKey: .attentionSessionIds) ?? []
            )
        case .setHostAppActive:
            self = .setHostAppActive(active: try container.decode(Bool.self, forKey: .active))
        case .resurfaceVisibleTerminals:
            self = .resurfaceVisibleTerminals
        case .forceCloseIncompatibleHelpers:
            self = .forceCloseIncompatibleHelpers(protocolVersion: try container.decode(Int.self, forKey: .protocolVersion))
        }
    }
}

extension GhosttySessionHostCommandEnvelope {
    var debugName: String {
        switch self {
        case .acquireLease: "acquireLease"
        case .releaseLease: "releaseLease"
        case .configureLease: "configureLease"
        case .createTerminal: "createTerminal"
        case .closeTerminal: "closeTerminal"
        case .focusTerminal: "focusTerminal"
        case .sendTerminalEnter: "sendTerminalEnter"
        case .writeTerminalText: "writeTerminalText"
        case .setTerminalFrame: "setTerminalFrame"
        case .setActiveTerminalSet: "setActiveTerminalSet"
        case .setHostAppActive: "setHostAppActive"
        case .resurfaceVisibleTerminals: "resurfaceVisibleTerminals"
        case .forceCloseIncompatibleHelpers: "forceCloseIncompatibleHelpers"
        }
    }
}

struct GhosttyHostedCreateTerminal: Codable {
    let cwd: String
    let env: [String: String]?
    let frame: GhosttyHostFrame?
    let initialInput: String?
    let sessionId: String
    let title: String?
    let visible: Bool
}

struct GhosttyHostedActiveTerminalSet {
    var sessionIds: [String]
    var focusedSessionId: String?
    var attentionSessionIds: [String]
}

struct GhosttyHostFrame: Codable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

enum GhosttySessionHostEvent: Codable {
    case hostReady(protocolVersion: Int, buildId: String)
    case terminalReady(sessionId: String, ttyName: String?, foregroundPid: Int?)
    case terminalTitleChanged(sessionId: String, title: String)
    case terminalExited(sessionId: String, exitCode: Int?)
    case terminalFocused(sessionId: String)
    case terminalBell(sessionId: String)
    case terminalError(sessionId: String, message: String)

    private enum CodingKeys: String, CodingKey {
        case buildId
        case exitCode
        case foregroundPid
        case message
        case protocolVersion
        case sessionId
        case title
        case ttyName
        case type
    }

    private enum EventType: String, Codable {
        case hostReady
        case terminalBell
        case terminalError
        case terminalExited
        case terminalFocused
        case terminalReady
        case terminalTitleChanged
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(EventType.self, forKey: .type) {
        case .hostReady:
            self = .hostReady(
                protocolVersion: try container.decode(Int.self, forKey: .protocolVersion),
                buildId: try container.decode(String.self, forKey: .buildId)
            )
        case .terminalReady:
            self = .terminalReady(
                sessionId: try container.decode(String.self, forKey: .sessionId),
                ttyName: try container.decodeIfPresent(String.self, forKey: .ttyName),
                foregroundPid: try container.decodeIfPresent(Int.self, forKey: .foregroundPid)
            )
        case .terminalTitleChanged:
            self = .terminalTitleChanged(
                sessionId: try container.decode(String.self, forKey: .sessionId),
                title: try container.decode(String.self, forKey: .title)
            )
        case .terminalExited:
            self = .terminalExited(
                sessionId: try container.decode(String.self, forKey: .sessionId),
                exitCode: try container.decodeIfPresent(Int.self, forKey: .exitCode)
            )
        case .terminalFocused:
            self = .terminalFocused(sessionId: try container.decode(String.self, forKey: .sessionId))
        case .terminalBell:
            self = .terminalBell(sessionId: try container.decode(String.self, forKey: .sessionId))
        case .terminalError:
            self = .terminalError(
                sessionId: try container.decode(String.self, forKey: .sessionId),
                message: try container.decode(String.self, forKey: .message)
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .hostReady(protocolVersion, buildId):
            try container.encode(EventType.hostReady, forKey: .type)
            try container.encode(protocolVersion, forKey: .protocolVersion)
            try container.encode(buildId, forKey: .buildId)
        case let .terminalReady(sessionId, ttyName, foregroundPid):
            try container.encode(EventType.terminalReady, forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encodeIfPresent(ttyName, forKey: .ttyName)
            try container.encodeIfPresent(foregroundPid, forKey: .foregroundPid)
        case let .terminalTitleChanged(sessionId, title):
            try container.encode(EventType.terminalTitleChanged, forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(title, forKey: .title)
        case let .terminalExited(sessionId, exitCode):
            try container.encode(EventType.terminalExited, forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encodeIfPresent(exitCode, forKey: .exitCode)
        case let .terminalFocused(sessionId):
            try container.encode(EventType.terminalFocused, forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
        case let .terminalBell(sessionId):
            try container.encode(EventType.terminalBell, forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
        case let .terminalError(sessionId, message):
            try container.encode(EventType.terminalError, forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(message, forKey: .message)
        }
    }
}

extension GhosttySessionHostEvent {
    var debugName: String {
        switch self {
        case .hostReady: "hostReady"
        case .terminalReady: "terminalReady"
        case .terminalTitleChanged: "terminalTitleChanged"
        case .terminalExited: "terminalExited"
        case .terminalFocused: "terminalFocused"
        case .terminalBell: "terminalBell"
        case .terminalError: "terminalError"
        }
    }
}
