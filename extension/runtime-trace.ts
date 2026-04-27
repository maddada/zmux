export class RuntimeTrace {
  public setEnabled(_enabled?: boolean): void {}

  public isEnabled(): boolean {
    return false;
  }

  public async reset(): Promise<void> {}

  public async log(_tag?: string, _message?: string, _details?: unknown): Promise<void> {}
}

export function createWorkspaceTrace(_fileName?: string): RuntimeTrace {
  return new RuntimeTrace();
}

export function getWorkspaceTraceDirectoryPath(): string {
  return "";
}

export function getWorkspaceTraceFilePath(_fileName?: string): string {
  return "";
}

export function getDebuggingModeEnabled(): boolean {
  return false;
}
