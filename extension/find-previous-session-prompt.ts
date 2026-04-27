export const DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE = [
  "Search these local session locations:",
  "",
  "- <user folder>/.claude/projects",
  "- <user folder>/.codex/sessions",
  "- <user folder>/.claude-profiles/*/projects",
  "- <user folder>/.codex-profiles/*/sessions",
  "",
  `Find the previous AI session most likely related to: "{query}"`,
  "",
  "Rules:",
  "- First detect the current repo root, current branch, and all local git worktrees.",
  "- Only keep sessions from the current repo, one of its worktrees, or a clearly related project path.",
  "- Search metadata first, then transcript bodies.",
  "- Prefer exact saved session/thread names over transcript keyword matches.",
  "- Prefer more recent sessions when relevance is similar.",
  "",
  "Codex:",
  "- Search these first:",
  "  - `<user folder>/.codex/session_index.jsonl`",
  "  - `<user folder>/.codex/history.jsonl`",
  "  - `<user folder>/.codex-profiles/*/session_index.jsonl`",
  "  - `<user folder>/.codex-profiles/*/history.jsonl`",
  "- Then inspect matching rollout files under:",
  "  - `<user folder>/.codex/sessions/**/rollout-*.jsonl`",
  "  - `<user folder>/.codex-profiles/*/sessions/**/rollout-*.jsonl`",
  "- Name priority:",
  "  1. `thread_name_updated.thread_name` in rollout files",
  "  2. `thread_name` in `session_index.jsonl`",
  "- Also use:",
  "  - `session_meta.payload.id`",
  "  - `session_meta.payload.cwd`",
  "",
  "Claude:",
  "- Search these first:",
  "  - `<user folder>/.claude/projects/*/sessions-index.json`",
  "  - `<user folder>/.claude-profiles/*/projects/*/sessions-index.json`",
  "- Then inspect matching session files:",
  "  - `<user folder>/.claude/projects/*/*.jsonl`",
  "  - `<user folder>/.claude-profiles/*/projects/*/*.jsonl`",
  "- Name priority:",
  "  1. `custom-title.customTitle`",
  "  2. `agent-name.agentName`",
  "  3. `entries[].summary` from `sessions-index.json`",
  "  4. `slug`",
  "- Also use:",
  "  - `sessionId`",
  "  - `cwd`",
  "  - `gitBranch`",
  "  - `projectPath`",
  "",
  "Return:",
  "- session ID",
  "- latest saved session/thread name",
  "- exact file path(s) used",
  "- related project folder if not current repo",
  "- short reason it matches",
  "",
  "If multiple strong matches exist, return the top few, most recent first.",
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
