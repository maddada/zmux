export function shouldPreserveLastActivityForTerminalWrite(commandText: string): boolean {
  return /^\/rename(?:\s|$)/.test(commandText.trimStart());
}
