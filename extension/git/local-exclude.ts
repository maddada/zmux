import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { resolveGitDir } from "./paths";

const completedEnsureKeys = new Set<string>();
const inFlightEnsures = new Map<string, Promise<void>>();

export function ensureWorkspaceGitExcludeEntry(
  workspaceRoot: string,
  pattern: string,
): Promise<void> {
  const key = `${path.resolve(workspaceRoot)}\0${pattern}`;
  if (completedEnsureKeys.has(key)) {
    return Promise.resolve();
  }

  const inFlight = inFlightEnsures.get(key);
  if (inFlight) {
    return inFlight;
  }

  const ensurePromise = ensureWorkspaceGitExcludeEntryInternal(workspaceRoot, pattern)
    .then(() => {
      completedEnsureKeys.add(key);
    })
    .finally(() => {
      inFlightEnsures.delete(key);
    });
  inFlightEnsures.set(key, ensurePromise);
  return ensurePromise;
}

async function ensureWorkspaceGitExcludeEntryInternal(
  workspaceRoot: string,
  pattern: string,
): Promise<void> {
  const gitDir = resolveGitDir(workspaceRoot);
  if (!gitDir) {
    return;
  }

  const excludePath = path.join(gitDir, "info", "exclude");
  await mkdir(path.dirname(excludePath), { recursive: true });
  const currentContents = await readExcludeFile(excludePath);
  if (excludeFileContainsPattern(currentContents, pattern)) {
    return;
  }

  const nextContents =
    currentContents.length === 0
      ? `${pattern}\n`
      : currentContents.endsWith("\n")
        ? `${currentContents}${pattern}\n`
        : `${currentContents}\n${pattern}\n`;
  await writeFile(excludePath, nextContents, "utf8");
}

async function readExcludeFile(excludePath: string): Promise<string> {
  try {
    return await readFile(excludePath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return "";
    }

    throw error;
  }
}

function excludeFileContainsPattern(contents: string, pattern: string): boolean {
  return contents
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .some((line) => line === pattern);
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
