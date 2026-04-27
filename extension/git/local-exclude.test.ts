import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { ensureWorkspaceGitExcludeEntry } from "./local-exclude";

describe("ensureWorkspaceGitExcludeEntry", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (!tempDir) {
      return;
    }

    await rm(tempDir, { force: true, recursive: true });
    tempDir = undefined;
  });

  test("adds a repo-local exclude entry only once for a standard git dir", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-local-exclude-"));
    const workspaceRoot = path.join(tempDir, "workspace");
    const excludePath = path.join(workspaceRoot, ".git", "info", "exclude");

    await mkdir(path.dirname(excludePath), { recursive: true });
    await writeFile(excludePath, "# local excludes\n", "utf8");

    await ensureWorkspaceGitExcludeEntry(workspaceRoot, ".zmux/");
    await ensureWorkspaceGitExcludeEntry(workspaceRoot, ".zmux/");

    const contents = await readFile(excludePath, "utf8");
    expect(contents).toBe("# local excludes\n.zmux/\n");
  });

  test("writes through a gitdir indirection file", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-local-exclude-gitdir-"));
    const workspaceRoot = path.join(tempDir, "workspace");
    const gitDir = path.join(tempDir, "actual-git-dir");
    const excludePath = path.join(gitDir, "info", "exclude");

    await mkdir(workspaceRoot, { recursive: true });
    await mkdir(path.dirname(excludePath), { recursive: true });
    await writeFile(path.join(workspaceRoot, ".git"), "gitdir: ../actual-git-dir\n", "utf8");

    await ensureWorkspaceGitExcludeEntry(workspaceRoot, ".zmux/");

    const contents = await readFile(excludePath, "utf8");
    expect(contents).toBe(".zmux/\n");
  });

  test("does nothing outside a git workspace", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-local-exclude-no-git-"));
    const workspaceRoot = path.join(tempDir, "workspace");

    await mkdir(workspaceRoot, { recursive: true });
    await ensureWorkspaceGitExcludeEntry(workspaceRoot, ".zmux/");

    await expect(access(path.join(workspaceRoot, ".git", "info", "exclude"))).rejects.toThrow();
  });
});
