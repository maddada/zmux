/** Web builds split this import; file-based builds substitute the classic-script loader. */
export async function loadMermaid() {
  return (await import('mermaid')).default;
}
