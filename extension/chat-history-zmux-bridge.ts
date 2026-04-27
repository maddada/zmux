export type ChatHistoryResumeSource = "Claude" | "Codex";

export type ChatHistoryResumeRequest = {
  cwd?: string;
  sessionId: string;
  source: ChatHistoryResumeSource;
};

export type ChatHistoryzmuxTarget = {
  resumeChatHistorySession(input: ChatHistoryResumeRequest): Promise<void>;
};

let chatHistoryzmuxTarget: ChatHistoryzmuxTarget | undefined;

export function setChatHistoryzmuxTarget(target: ChatHistoryzmuxTarget | undefined): void {
  chatHistoryzmuxTarget = target;
}

export function getChatHistoryzmuxTarget(): ChatHistoryzmuxTarget | undefined {
  return chatHistoryzmuxTarget;
}
