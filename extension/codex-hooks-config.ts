import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { quoteShellLiteral } from "./agent-shell-integration-utils";

const CODEX_HOOK_EVENT_NAMES = ["UserPromptSubmit"] as const;

type CodexHooksFile = {
  hooks?: Record<string, Array<Record<string, unknown>>>;
};

type ResolveActiveCodexHooksPathOptions = {
  homeDir?: string;
  pathApi?: Pick<typeof path, "join">;
};

type EnsureCodexHooksFileOptions = ResolveActiveCodexHooksPathOptions & {
  nodePath?: string;
  platform?: NodeJS.Platform;
};

type HookCommandHandler = {
  command?: string;
  type?: string;
};

type HookMatcherGroup = {
  hooks?: HookCommandHandler[];
  matcher?: string;
};

export type EnsureCodexHooksFileResult = {
  changed: boolean;
  hooksPath: string;
};

export function resolveActiveCodexHooksPath(
  environment: NodeJS.ProcessEnv = process.env,
  options: ResolveActiveCodexHooksPathOptions = {},
): string {
  const pathApi = options.pathApi ?? path;
  const configuredCodexHome = environment.CODEX_HOME?.trim();
  const codexHome =
    configuredCodexHome && configuredCodexHome.length > 0
      ? configuredCodexHome
      : pathApi.join(options.homeDir ?? os.homedir(), ".codex");
  return pathApi.join(codexHome, "hooks.json");
}

export function getCodexHookCommand(
  notifyPath: string,
  nodePath = process.execPath,
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform === "win32") {
    return `"${nodePath}" "${notifyPath}"`;
  }

  return `ELECTRON_RUN_AS_NODE=1 ${quoteShellLiteral(nodePath)} ${quoteShellLiteral(notifyPath)}`;
}

export function getCodexHookSettingsContent(
  notifyPath: string,
  nodePath = process.execPath,
  platform: NodeJS.Platform = process.platform,
): string {
  return `${JSON.stringify(
    {
      hooks: Object.fromEntries(
        CODEX_HOOK_EVENT_NAMES.map((eventName) => [
          eventName,
          [
            {
              hooks: [
                {
                  command: getCodexHookCommand(notifyPath, nodePath, platform),
                  type: "command",
                },
              ],
            },
          ],
        ]),
      ),
    },
    null,
    2,
  )}\n`;
}

export function mergeCodexHookSettingsContent(
  existingContent: string,
  notifyPath: string,
  nodePath = process.execPath,
  platform: NodeJS.Platform = process.platform,
): string {
  const parsedHooksFile = parseCodexHooksFile(existingContent);
  const nextHooks = {
    ...parsedHooksFile.hooks,
  } as Record<string, HookMatcherGroup[]>;
  const command = getCodexHookCommand(notifyPath, nodePath, platform);
  const supportedEvents = new Set<string>(CODEX_HOOK_EVENT_NAMES);

  for (const [eventName, matcherGroups] of Object.entries(nextHooks)) {
    const filteredGroups = getMatcherGroups(matcherGroups)
      .map(
        (group): HookMatcherGroup => ({
          ...group,
          hooks: (group.hooks ?? []).filter(
            (hook) => !isVsmuxCodexHookCommand(hook.command, notifyPath),
          ),
        }),
      )
      .filter((group) => (group.hooks?.length ?? 0) > 0);

    if (supportedEvents.has(eventName)) {
      nextHooks[eventName] = filteredGroups;
      continue;
    }

    if (filteredGroups.length === 0) {
      delete nextHooks[eventName];
      continue;
    }

    nextHooks[eventName] = filteredGroups;
  }

  for (const eventName of CODEX_HOOK_EVENT_NAMES) {
    const existingGroups = getMatcherGroups(nextHooks[eventName]);
    if (doesHooksGroupAlreadyContainCommand(existingGroups, command)) {
      nextHooks[eventName] = existingGroups;
      continue;
    }

    nextHooks[eventName] = [
      ...existingGroups,
      {
        hooks: [
          {
            command,
            type: "command",
          },
        ],
      },
    ];
  }

  return `${JSON.stringify({ hooks: nextHooks }, null, 2)}\n`;
}

export async function ensureCodexHooksFile(
  notifyPath: string,
  environment: NodeJS.ProcessEnv = process.env,
  options: EnsureCodexHooksFileOptions = {},
): Promise<EnsureCodexHooksFileResult> {
  const hooksPath = resolveActiveCodexHooksPath(environment, options);
  const existingContent = await readFile(hooksPath, "utf8").catch((error: unknown) => {
    if (isMissingFileError(error)) {
      return "";
    }

    throw error;
  });
  const nextContent = existingContent
    ? mergeCodexHookSettingsContent(existingContent, notifyPath, options.nodePath, options.platform)
    : getCodexHookSettingsContent(notifyPath, options.nodePath, options.platform);

  if (nextContent === existingContent) {
    return {
      changed: false,
      hooksPath,
    };
  }

  await mkdir(path.dirname(hooksPath), { recursive: true });
  await writeFile(hooksPath, nextContent, "utf8");
  return {
    changed: true,
    hooksPath,
  };
}

function parseCodexHooksFile(content: string): CodexHooksFile {
  const parsedValue = JSON.parse(content) as unknown;
  if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
    throw new Error("Codex hooks file must contain a JSON object.");
  }

  const hooks = (parsedValue as CodexHooksFile).hooks;
  if (hooks !== undefined && (!hooks || typeof hooks !== "object" || Array.isArray(hooks))) {
    throw new Error("Codex hooks file must contain an object-valued hooks property.");
  }

  return parsedValue as CodexHooksFile;
}

function getMatcherGroups(value: unknown): HookMatcherGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is HookMatcherGroup =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
  );
}

function doesHooksGroupAlreadyContainCommand(
  matcherGroups: readonly HookMatcherGroup[],
  command: string,
): boolean {
  return matcherGroups.some((group) =>
    (group.hooks ?? []).some(
      (hook): boolean => hook.type === "command" && hook.command === command,
    ),
  );
}

function isVsmuxCodexHookCommand(command: string | undefined, notifyPath: string): boolean {
  if (typeof command !== "string") {
    return false;
  }

  if (command.includes(notifyPath)) {
    return true;
  }

  return /maddada\.zmux-[^'"\s/\\]+[/\\]out[/\\]extension[/\\]agent-shell-notify-runner\.js/.test(
    command,
  );
}

const isMissingFileError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error && error.code === "ENOENT";
