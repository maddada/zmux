export const DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE = [
  "Help me find a previous AI agent session where I talked about: {query}",
  "",
  "Please search the local session history and transcript files available on this machine.",
  "Use session index files and transcript logs together when possible so you can recover both the session ID and the latest user-set name.",
  "",
  "Please return:",
  "- the best matching session ID",
  "- the latest session or thread name if you can find one",
  "- the file path you used to identify it",
  "- a short reason it matches",
  "",
  "If there are multiple strong matches, list the top few and prefer the most recent ones.",
].join("\n");

export function renderFindPreviousSessionPrompt(template: string, query: string): string {
  const normalizedTemplate = template.trim() || DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE;
  const normalizedQuery = query.trim();
  const renderedPrompt = normalizedTemplate
    .replaceAll("{query}", normalizedQuery)
    .replaceAll("{topic}", normalizedQuery);

  if (renderedPrompt === normalizedTemplate) {
    return `${normalizedTemplate}\n\nQuery: ${normalizedQuery}`;
  }

  return renderedPrompt;
}
