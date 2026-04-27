import * as vscode from "vscode";
import { createWorkspaceTrace, type RuntimeTrace } from "./runtime-trace";

type SessionLayoutTraceRunOptions<T> = {
  captureState: () => unknown;
  execute: (operation: SessionLayoutTraceOperation) => Promise<T>;
  expected?: unknown;
  payload?: unknown;
};

export class SessionLayoutTrace {
  private nextOperationId = 1;
  private readonly trace: RuntimeTrace;

  public constructor(fileName: string) {
    this.trace = createWorkspaceTrace(fileName);
  }

  public isEnabled(): boolean {
    return this.trace.isEnabled();
  }

  public async reset(): Promise<void> {
    this.nextOperationId = 1;
    await this.trace.reset();
  }

  public async log(tag: string, message: string, details?: unknown): Promise<void> {
    await this.trace.log(tag, message, details);
  }

  public async runOperation<T>(
    action: string,
    options: SessionLayoutTraceRunOptions<T>,
  ): Promise<T> {
    const operation = new SessionLayoutTraceOperation(
      this.trace,
      this.nextOperationId++,
      action,
      options.captureState,
    );
    await operation.begin(options.payload, options.expected);
    try {
      const result = await options.execute(operation);
      await operation.complete(result);
      return result;
    } catch (error) {
      await operation.fail(error);
      throw error;
    }
  }
}

export class SessionLayoutTraceOperation {
  public constructor(
    private readonly trace: RuntimeTrace,
    private readonly operationId: number,
    private readonly action: string,
    private readonly captureState: () => unknown,
  ) {}

  public async begin(payload?: unknown, expected?: unknown): Promise<void> {
    if (!this.trace.isEnabled()) {
      return;
    }

    await this.trace.log("OPERATION", `${this.action}:begin`, {
      action: this.action,
      expected,
      operationId: this.operationId,
      payload,
      state: this.safeCaptureState(),
    });
  }

  public async step(phase: string, details?: unknown): Promise<void> {
    if (!this.trace.isEnabled()) {
      return;
    }

    await this.trace.log("OPERATION", `${this.action}:${phase}`, {
      action: this.action,
      details,
      operationId: this.operationId,
      state: this.safeCaptureState(),
    });
  }

  public async complete(result?: unknown): Promise<void> {
    if (!this.trace.isEnabled()) {
      return;
    }

    await this.trace.log("OPERATION", `${this.action}:complete`, {
      action: this.action,
      operationId: this.operationId,
      result,
      state: this.safeCaptureState(),
    });
  }

  public async fail(error: unknown): Promise<void> {
    if (!this.trace.isEnabled()) {
      return;
    }

    await this.trace.log("OPERATION", `${this.action}:fail`, {
      action: this.action,
      error: serializeError(error),
      operationId: this.operationId,
      state: this.safeCaptureState(),
    });
  }

  private safeCaptureState(): unknown {
    try {
      return this.captureState();
    } catch (error) {
      return {
        captureError: serializeError(error),
      };
    }
  }
}

export function captureWorkbenchState(): {
  activeTabGroupViewColumn?: number;
  activeTerminalName?: string;
  tabGroups: Array<{
    activeTabLabel?: string;
    isActive: boolean;
    tabs: Array<{
      inputKind: string;
      isActive: boolean;
      label: string;
      uri?: string;
      viewType?: string;
    }>;
    viewColumn?: number;
  }>;
  terminals: Array<{
    creationName?: string;
    exitCode?: number;
    isActive: boolean;
    name?: string;
  }>;
} {
  return {
    activeTabGroupViewColumn: vscode.window.tabGroups.activeTabGroup?.viewColumn,
    activeTerminalName: vscode.window.activeTerminal?.name,
    tabGroups: vscode.window.tabGroups.all.map((group) => ({
      activeTabLabel: group.activeTab?.label,
      isActive: group.isActive,
      tabs: group.tabs.map((tab) => ({
        inputKind: getTabInputKind(tab.input),
        isActive: tab.isActive,
        label: tab.label,
        uri: getTabInputUri(tab.input),
        viewType: getTabInputViewType(tab.input),
      })),
      viewColumn: group.viewColumn,
    })),
    terminals: vscode.window.terminals.map((terminal) => ({
      creationName:
        typeof terminal.creationOptions === "object" &&
        terminal.creationOptions !== null &&
        "name" in terminal.creationOptions &&
        typeof terminal.creationOptions.name === "string"
          ? terminal.creationOptions.name
          : undefined,
      exitCode: terminal.exitStatus?.code,
      isActive: terminal === vscode.window.activeTerminal,
      name: terminal.name,
    })),
  };
}

function getTabInputKind(input: unknown): string {
  if (matchesTabInputClass(input, vscode.TabInputTerminal)) {
    return "terminal";
  }
  if (matchesTabInputClass(input, vscode.TabInputWebview)) {
    return "webview";
  }
  if (matchesTabInputClass(input, vscode.TabInputText)) {
    return "text";
  }
  if (matchesTabInputClass(input, vscode.TabInputCustom)) {
    return "custom";
  }

  return input?.constructor?.name ?? typeof input;
}

function getTabInputUri(input: unknown): string | undefined {
  if (
    typeof input === "object" &&
    input !== null &&
    "uri" in input &&
    input.uri &&
    typeof (input.uri as { toString?: unknown }).toString === "function"
  ) {
    return (input.uri as { toString: (skipEncoding?: boolean) => string }).toString(true);
  }

  return undefined;
}

function getTabInputViewType(input: unknown): string | undefined {
  if (matchesTabInputClass(input, vscode.TabInputWebview)) {
    return (input as vscode.TabInputWebview).viewType;
  }

  return undefined;
}

function matchesTabInputClass(value: unknown, constructor: Function | undefined): boolean {
  return typeof constructor === "function" && value instanceof constructor;
}

function serializeError(error: unknown): {
  message: string;
  name?: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}
