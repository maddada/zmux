import { appendAgentShellDebugLog } from "./agent-shell-debug-log";
import { appendClaudeFirstMessageRenameReproLog } from "./claude-first-message-rename-repro-log";
import { getDaemonSafeDebuggingMode } from "./daemon-debugging-mode";
import { explainFirstPromptAutoRenameDecision } from "./first-prompt-session-title";
import {
  createPersistedSessionHookDedupMarker,
  readPersistedSessionStateFromFile,
  writePersistedSessionStateToFile,
  type PersistedSessionState,
} from "./session-state-file";

const AGENT_CONTROL_COMMAND = "9001";
const AGENT_CONTROL_NAMESPACE = "zmux";
const USER_PROMPT_SUBMIT_EVENT_NAME = "UserPromptSubmit";
const USER_PROMPT_SUBMIT_ACK = JSON.stringify({ continue: true });

type AgentHookInfo = {
  agentName: string;
  normalizedEvent?: "start" | "stop";
  prompt?: string;
  rawEventName?: string;
  sessionId?: string;
  turnId?: string;
};

async function main(): Promise<void> {
  const input = await readInput();
  const hookInfo = getAgentHookInfo(input);
  const hookClaimResult = await claimAgentHookInvocation(hookInfo);
  if (hookClaimResult === "duplicate") {
    if (isClaudeFirstPromptSubmit(hookInfo)) {
      await appendClaudeFirstMessageRenameHookLog("hook.duplicateSkipped", {
        rawEventName: hookInfo.rawEventName,
        sessionId: hookInfo.sessionId,
        turnId: hookInfo.turnId,
      });
    }
    await appendAgentShellDebugLog("notify.duplicateSkipped", {
      agentName: hookInfo.agentName,
      rawEventName: hookInfo.rawEventName,
      turnId: hookInfo.turnId,
    });
    const hookResponse = getHookResponseForInput(input);
    if (hookResponse) {
      process.stdout.write(hookResponse);
    }
    return;
  }
  await appendAgentShellDebugLog("notify.received", {
    agentName: hookInfo.agentName,
    inputLength: input.length,
    normalizedEvent: hookInfo.normalizedEvent,
    promptPreview: getPromptPreview(hookInfo.prompt),
    rawEventName: hookInfo.rawEventName,
    turnId: hookInfo.turnId,
  });
  if (isClaudeFirstPromptSubmit(hookInfo)) {
    await appendClaudeFirstMessageRenameHookLog("hook.received", {
      normalizedEvent: hookInfo.normalizedEvent,
      promptPreview: getPromptPreview(hookInfo.prompt),
      rawEventName: hookInfo.rawEventName,
      sessionId: hookInfo.sessionId,
      turnId: hookInfo.turnId,
    });
  }
  const sessionUpdate = await writeSessionState(hookInfo);
  await appendAgentShellDebugLog("notify.stateWritten", sessionUpdate);

  const hookResponse = getHookResponseForInput(input);
  if (hookResponse) {
    process.stdout.write(hookResponse);
    return;
  }

  if (!hookInfo.normalizedEvent) {
    return;
  }

  await appendAgentShellDebugLog("notify.emitOsc", {
    agentName: hookInfo.agentName,
    normalizedEvent: hookInfo.normalizedEvent,
  });
  process.stdout.write(
    `\u001b]${AGENT_CONTROL_COMMAND};${AGENT_CONTROL_NAMESPACE};${hookInfo.normalizedEvent};${hookInfo.agentName}\u0007`,
  );
}

async function readInput(): Promise<string> {
  const cliInput = process.argv[2];
  if (cliInput) {
    return cliInput;
  }

  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
  }

  return chunks.join("");
}

export function getAgentHookInfo(
  input: string,
  fallbackAgentName = process.env.zmux_AGENT ?? "unknown",
): AgentHookInfo {
  const rawEventName = getJsonStringField(input, "hook_event_name");
  const normalizedEvent = getNormalizedEventType(input, rawEventName);

  return {
    agentName: getJsonStringField(input, "agent") ?? fallbackAgentName,
    normalizedEvent,
    prompt:
      rawEventName === USER_PROMPT_SUBMIT_EVENT_NAME
        ? getJsonStringField(input, "prompt")
        : undefined,
    rawEventName,
    sessionId:
      rawEventName === USER_PROMPT_SUBMIT_EVENT_NAME
        ? getJsonStringField(input, "session_id")
        : undefined,
    turnId:
      rawEventName === USER_PROMPT_SUBMIT_EVENT_NAME
        ? getJsonStringField(input, "turn_id")
        : undefined,
  };
}

export function getHookResponseForInput(input: string): string | undefined {
  const rawEventName = getJsonStringField(input, "hook_event_name");
  return rawEventName === USER_PROMPT_SUBMIT_EVENT_NAME ? USER_PROMPT_SUBMIT_ACK : undefined;
}

export async function claimAgentHookInvocation(
  hookInfo: AgentHookInfo,
  stateFilePath = process.env.zmux_SESSION_STATE_FILE?.trim(),
): Promise<"acquired" | "duplicate" | "skipped"> {
  if (hookInfo.rawEventName !== USER_PROMPT_SUBMIT_EVENT_NAME) {
    return "skipped";
  }

  const turnId = hookInfo.turnId?.trim();
  if (!stateFilePath || !turnId) {
    return "skipped";
  }

  const markerResult = await createPersistedSessionHookDedupMarker(
    stateFilePath,
    hookInfo.rawEventName,
    turnId,
  );
  return markerResult.acquired ? "acquired" : "duplicate";
}

function getNormalizedEventType(
  input: string,
  rawEventName = getJsonStringField(input, "hook_event_name"),
): "start" | "stop" | undefined {
  if (rawEventName && /^start$/i.test(rawEventName)) {
    return "start";
  }

  if (rawEventName && /^stop$/i.test(rawEventName)) {
    return "stop";
  }

  const rawType = getJsonStringField(input, "type");
  if (rawType === "agent-turn-complete" || rawType === "task_complete") {
    return "stop";
  }

  return undefined;
}

function getJsonStringField(input: string, key: string): string | undefined {
  const parsedJson = parseJsonRecord(input);
  const parsedValue = parsedJson?.[key];
  if (typeof parsedValue === "string") {
    return parsedValue;
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = input.match(new RegExp(`"${escapedKey}"\\s*:\\s*"((?:\\\\.|[^"])*)"`, "i"));
  return match?.[1] ? JSON.parse(`"${match[1]}"`) : undefined;
}

function parseJsonRecord(input: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(input) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export function resolvePersistedSessionStateForHook(
  currentState: PersistedSessionState,
  hookInfo: AgentHookInfo,
): PersistedSessionState {
  if (shouldIgnorePromptSubmitForDifferentSession(currentState, hookInfo)) {
    return currentState;
  }

  const nextState: PersistedSessionState = {
    ...currentState,
    agentName: hookInfo.agentName || currentState.agentName,
  };

  if (hookInfo.normalizedEvent) {
    nextState.agentStatus = hookInfo.normalizedEvent === "start" ? "working" : "attention";
    nextState.lastActivityAt = new Date().toISOString();
  }

  if (hookInfo.rawEventName === USER_PROMPT_SUBMIT_EVENT_NAME && hookInfo.prompt?.trim()) {
    nextState.lastActivityAt = new Date().toISOString();
  }

  if (
    hookInfo.rawEventName === USER_PROMPT_SUBMIT_EVENT_NAME &&
    explainFirstPromptAutoRenameDecision({
      agentName: nextState.agentName,
      currentTitle: currentState.title,
      hasAutoTitleFromFirstPrompt: currentState.hasAutoTitleFromFirstPrompt,
      pendingFirstPromptAutoRenamePrompt: currentState.pendingFirstPromptAutoRenamePrompt,
      prompt: hookInfo.prompt,
    }).shouldAutoName
  ) {
    nextState.pendingFirstPromptAutoRenamePrompt = hookInfo.prompt?.trim();
  }

  return nextState;
}

function shouldIgnorePromptSubmitForDifferentSession(
  currentState: PersistedSessionState,
  hookInfo: AgentHookInfo,
): boolean {
  return (
    hookInfo.rawEventName === USER_PROMPT_SUBMIT_EVENT_NAME &&
    Boolean(currentState.agentSessionId?.trim()) &&
    Boolean(hookInfo.sessionId?.trim()) &&
    currentState.agentSessionId?.trim() !== hookInfo.sessionId?.trim()
  );
}

async function writeSessionState(hookInfo: AgentHookInfo): Promise<Record<string, unknown>> {
  const stateFilePath = process.env.zmux_SESSION_STATE_FILE?.trim();
  if (!stateFilePath) {
    return {
      skipped: "missing-state-file",
    };
  }

  const currentState = await readPersistedSessionStateFromFile(stateFilePath);
  const ignoredForDifferentSession = shouldIgnorePromptSubmitForDifferentSession(
    currentState,
    hookInfo,
  );
  const firstPromptDecision =
    isClaudeFirstPromptSubmit(hookInfo) && !ignoredForDifferentSession
      ? explainFirstPromptAutoRenameDecision({
          agentName: hookInfo.agentName || currentState.agentName,
          currentTitle: currentState.title,
          hasAutoTitleFromFirstPrompt: currentState.hasAutoTitleFromFirstPrompt,
          pendingFirstPromptAutoRenamePrompt: currentState.pendingFirstPromptAutoRenamePrompt,
          prompt: hookInfo.prompt,
        })
      : undefined;
  const nextState = resolvePersistedSessionStateForHook(currentState, hookInfo);
  await writePersistedSessionStateToFile(stateFilePath, nextState);
  if (isClaudeFirstPromptSubmit(hookInfo)) {
    await appendClaudeFirstMessageRenameHookLog("hook.promptSubmitDecision", {
      currentStateAgentSessionId: currentState.agentSessionId,
      currentTitle: currentState.title,
      decision: firstPromptDecision,
      hasAutoTitleAfter: nextState.hasAutoTitleFromFirstPrompt === true,
      hasAutoTitleBefore: currentState.hasAutoTitleFromFirstPrompt === true,
      hookSessionId: hookInfo.sessionId,
      ignoredForDifferentSession,
      pendingAfter: nextState.pendingFirstPromptAutoRenamePrompt,
      pendingBefore: currentState.pendingFirstPromptAutoRenamePrompt,
      promptPreview: getPromptPreview(hookInfo.prompt),
      sessionStateFile: stateFilePath,
      turnId: hookInfo.turnId,
    });
  }
  return {
    after: summarizePersistedSessionState(nextState),
    autoNamedFromFirstPrompt:
      !currentState.hasAutoTitleFromFirstPrompt && nextState.hasAutoTitleFromFirstPrompt === true,
    before: summarizePersistedSessionState(currentState),
    stateFilePath,
  };
}

async function appendClaudeFirstMessageRenameHookLog(
  event: string,
  details?: unknown,
): Promise<void> {
  await appendClaudeFirstMessageRenameReproLog({
    details,
    enabled: getDaemonSafeDebuggingMode(),
    event,
    workspaceRoot: process.env.zmux_WORKSPACE_ROOT?.trim(),
  });
}

function isClaudeFirstPromptSubmit(hookInfo: AgentHookInfo): boolean {
  return (
    hookInfo.rawEventName === USER_PROMPT_SUBMIT_EVENT_NAME &&
    hookInfo.agentName.trim().toLowerCase() === "claude"
  );
}

void main().catch((error: unknown) => {
  void appendAgentShellDebugLog("notify.failed", serializeUnknownError(error));
  process.exit(0);
});

function getPromptPreview(prompt: string | undefined): string | undefined {
  const normalizedPrompt = prompt?.replace(/\s+/g, " ").trim();
  if (!normalizedPrompt) {
    return undefined;
  }

  return normalizedPrompt.length > 160
    ? `${normalizedPrompt.slice(0, 157).trimEnd()}...`
    : normalizedPrompt;
}

function summarizePersistedSessionState(state: PersistedSessionState): Record<string, unknown> {
  return {
    agentName: state.agentName,
    agentStatus: state.agentStatus,
    hasAutoTitleFromFirstPrompt: state.hasAutoTitleFromFirstPrompt,
    lastActivityAt: state.lastActivityAt,
    pendingFirstPromptAutoRenamePrompt: state.pendingFirstPromptAutoRenamePrompt,
    title: state.title,
  };
}

function serializeUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    error: String(error),
  };
}
