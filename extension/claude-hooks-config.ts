import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getClaudeHookSettingsContent } from "./agent-shell-integration-content";

const CLAUDE_HOOK_EVENT_NAMES = [
  "UserPromptSubmit",
  "Stop",
  "StopFailure",
  "Notification",
] as const;

type ClaudeSettingsFile = {
  hooks?: Record<string, ClaudeHookMatcherGroup[]>;
  [key: string]: unknown;
};

type ClaudeHookHandler = {
  command?: string;
  type?: string;
  [key: string]: unknown;
};

type ClaudeHookMatcherGroup = {
  hooks?: ClaudeHookHandler[];
  matcher?: string;
  [key: string]: unknown;
};

type ResolveActiveClaudeSettingsPathOptions = {
  homeDir?: string;
  pathApi?: Pick<typeof path, "join">;
};

type EnsureClaudeHooksFileOptions = ResolveActiveClaudeSettingsPathOptions & {
  platform?: NodeJS.Platform;
};

export type EnsureClaudeHooksFileResult = {
  changed: boolean;
  settingsPath: string;
};

export function resolveActiveClaudeSettingsPath(
  environment: NodeJS.ProcessEnv = process.env,
  options: ResolveActiveClaudeSettingsPathOptions = {},
): string {
  const pathApi = options.pathApi ?? path;
  const configuredClaudeConfigDir = environment.CLAUDE_CONFIG_DIR?.trim();
  const claudeConfigDir =
    configuredClaudeConfigDir && configuredClaudeConfigDir.length > 0
      ? configuredClaudeConfigDir
      : pathApi.join(options.homeDir ?? os.homedir(), ".claude");
  return pathApi.join(claudeConfigDir, "settings.json");
}

export function mergeClaudeHookSettingsContent(
  existingContent: string,
  notifyCommandPath: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const parsedSettings = parseClaudeSettingsFile(existingContent);
  const nextHooks = {
    ...parsedSettings.hooks,
  } as Record<string, ClaudeHookMatcherGroup[]>;
  const zmuxSettings = JSON.parse(
    getClaudeHookSettingsContent(notifyCommandPath, platform),
  ) as ClaudeSettingsFile;

  for (const [eventName, matcherGroups] of Object.entries(nextHooks)) {
    nextHooks[eventName] = getMatcherGroups(matcherGroups)
      .map(
        (group): ClaudeHookMatcherGroup => ({
          ...group,
          hooks: (group.hooks ?? []).filter(
            (hook) => !isVsmuxClaudeHookCommand(hook.command, notifyCommandPath),
          ),
        }),
      )
      .filter((group) => (group.hooks?.length ?? 0) > 0);
  }

  for (const eventName of CLAUDE_HOOK_EVENT_NAMES) {
    const desiredGroups = getMatcherGroups(zmuxSettings.hooks?.[eventName]);
    if (desiredGroups.length === 0) {
      continue;
    }

    const existingGroups = getMatcherGroups(nextHooks[eventName]);
    const nextGroups = [...existingGroups];

    for (const desiredGroup of desiredGroups) {
      if (doesClaudeHooksGroupAlreadyContainEquivalentHook(nextGroups, desiredGroup)) {
        continue;
      }

      nextGroups.push(desiredGroup);
    }

    nextHooks[eventName] = nextGroups;
  }

  return `${JSON.stringify({ ...parsedSettings, hooks: nextHooks }, null, 2)}\n`;
}

export async function ensureClaudeHooksFile(
  notifyCommandPath: string,
  environment: NodeJS.ProcessEnv = process.env,
  options: EnsureClaudeHooksFileOptions = {},
): Promise<EnsureClaudeHooksFileResult> {
  const settingsPath = resolveActiveClaudeSettingsPath(environment, options);
  const existingContent = await readFile(settingsPath, "utf8").catch((error: unknown) => {
    if (isMissingFileError(error)) {
      return "";
    }

    throw error;
  });
  const nextContent = existingContent
    ? mergeClaudeHookSettingsContent(existingContent, notifyCommandPath, options.platform)
    : getClaudeHookSettingsContent(notifyCommandPath, options.platform);

  if (nextContent === existingContent) {
    return {
      changed: false,
      settingsPath,
    };
  }

  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, nextContent, "utf8");
  return {
    changed: true,
    settingsPath,
  };
}

function parseClaudeSettingsFile(content: string): ClaudeSettingsFile {
  const parsedValue = JSON.parse(content) as unknown;
  if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
    throw new Error("Claude settings file must contain a JSON object.");
  }

  const hooks = (parsedValue as ClaudeSettingsFile).hooks;
  if (hooks !== undefined && (!hooks || typeof hooks !== "object" || Array.isArray(hooks))) {
    throw new Error("Claude settings file must contain an object-valued hooks property.");
  }

  return parsedValue as ClaudeSettingsFile;
}

function getMatcherGroups(value: unknown): ClaudeHookMatcherGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is ClaudeHookMatcherGroup =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
  );
}

function doesClaudeHooksGroupAlreadyContainEquivalentHook(
  matcherGroups: readonly ClaudeHookMatcherGroup[],
  desiredGroup: ClaudeHookMatcherGroup,
): boolean {
  const desiredMatcher = desiredGroup.matcher ?? "";
  const desiredHooks = getHookCommands(desiredGroup.hooks);
  return matcherGroups.some((group) => {
    if ((group.matcher ?? "") !== desiredMatcher) {
      return false;
    }

    const groupHooks = getHookCommands(group.hooks);
    return (
      desiredHooks.length === groupHooks.length &&
      desiredHooks.every((desiredHook, index) => {
        const groupHook = groupHooks[index];
        return groupHook?.command === desiredHook.command && groupHook?.type === desiredHook.type;
      })
    );
  });
}

function getHookCommands(
  hooks: readonly ClaudeHookHandler[] | undefined,
): Array<{ command?: string; type?: string }> {
  return (hooks ?? []).map((hook) => ({
    command: hook.command,
    type: hook.type,
  }));
}

function isVsmuxClaudeHookCommand(command: string | undefined, notifyCommandPath: string): boolean {
  if (typeof command !== "string") {
    return false;
  }

  if (command.includes(notifyCommandPath)) {
    return true;
  }

  return /maddada\.zmux[/\\]terminal-host-daemon[/\\]agent-shell-integration[/\\]hooks[/\\]claude[/\\]notify(?:\.sh|\.cmd)?/.test(
    command,
  );
}

const isMissingFileError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error && error.code === "ENOENT";
