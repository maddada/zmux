import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { resolveSidebarProjectHeader } from "./sidebar-project-header";

vi.mock("./sidebar-project-worktrees", () => ({
  resolveSidebarProjectWorktrees: vi.fn(async () => []),
}));

const createdDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirectories.splice(0).map(async (directory) => {
      await rm(directory, { force: true, recursive: true });
    }),
  );
});

describe("resolveSidebarProjectHeader", () => {
  test("should prefer a direct favicon file in the workspace root", async () => {
    const workspaceRoot = await createWorkspace("sidebar-project-header-root-");
    await writeFile(path.join(workspaceRoot, "favicon.svg"), "<svg>logo</svg>");

    const result = await resolveSidebarProjectHeader({
      workspaceName: "Agent Tiler",
      workspaceRoot,
    });

    expect(result).toEqual({
      directory: workspaceRoot,
      faviconDataUrl: `data:image/svg+xml;base64,${Buffer.from("<svg>logo</svg>").toString("base64")}`,
      name: "Agent Tiler",
    });
  });

  test("should resolve extension-style media icons", async () => {
    const workspaceRoot = await createWorkspace("sidebar-project-header-media-");
    await mkdir(path.join(workspaceRoot, "media"), { recursive: true });
    await writeFile(path.join(workspaceRoot, "media", "icon.svg"), "<svg>media-logo</svg>");

    const result = await resolveSidebarProjectHeader({
      workspaceName: "Agent Tiler",
      workspaceRoot,
    });

    expect(result).toEqual({
      directory: workspaceRoot,
      faviconDataUrl: `data:image/svg+xml;base64,${Buffer.from("<svg>media-logo</svg>").toString("base64")}`,
      name: "Agent Tiler",
    });
  });

  test("should resolve icon metadata from an html source file", async () => {
    const workspaceRoot = await createWorkspace("sidebar-project-header-html-");
    await mkdir(path.join(workspaceRoot, "public"), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, "index.html"),
      '<html><head><link rel="icon" href="/icons/app.png" /></head></html>',
    );
    await mkdir(path.join(workspaceRoot, "public", "icons"), { recursive: true });
    await writeFile(path.join(workspaceRoot, "public", "icons", "app.png"), "png");

    const result = await resolveSidebarProjectHeader({
      workspaceRoot,
    });

    expect(result.name).toBe(path.basename(workspaceRoot));
    expect(result.directory).toBe(workspaceRoot);
    expect(result.faviconDataUrl).toBe(
      `data:image/png;base64,${Buffer.from("png").toString("base64")}`,
    );
  });

  test("should resolve chrome extension icons from a manifest template", async () => {
    const workspaceRoot = await createWorkspace("sidebar-project-header-extension-");
    await mkdir(path.join(workspaceRoot, "apps", "extension", "public", "icons"), {
      recursive: true,
    });
    await writeFile(
      path.join(workspaceRoot, "apps", "extension", "public", "manifest.template.json"),
      JSON.stringify({
        action: {
          default_title: "Sharp Tabs",
        },
        icons: {
          "16": "icons/icon16.png",
          "128": "icons/icon128.png",
          "512": "icons/icon512.png",
        },
      }),
    );
    await writeFile(
      path.join(workspaceRoot, "apps", "extension", "public", "icons", "icon128.png"),
      "icon128",
    );
    await writeFile(
      path.join(workspaceRoot, "apps", "extension", "public", "icons", "icon512.png"),
      "icon512",
    );

    const result = await resolveSidebarProjectHeader({
      workspaceRoot,
    });

    expect(result.name).toBe(path.basename(workspaceRoot));
    expect(result.directory).toBe(workspaceRoot);
    expect(result.faviconDataUrl).toBe(
      `data:image/png;base64,${Buffer.from("icon512").toString("base64")}`,
    );
  });

  test("should resolve pwa icons from a webmanifest file", async () => {
    const workspaceRoot = await createWorkspace("sidebar-project-header-pwa-");
    await mkdir(path.join(workspaceRoot, "public"), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, "public", "site.webmanifest"),
      JSON.stringify({
        icons: [
          {
            src: "/icon48.png",
            sizes: "48x48",
            type: "image/png",
          },
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      }),
    );
    await writeFile(path.join(workspaceRoot, "public", "icon48.png"), "pwa48");
    await writeFile(path.join(workspaceRoot, "public", "icon.svg"), "<svg>pwa</svg>");

    const result = await resolveSidebarProjectHeader({
      workspaceRoot,
    });

    expect(result.name).toBe(path.basename(workspaceRoot));
    expect(result.directory).toBe(workspaceRoot);
    expect(result.faviconDataUrl).toBe(
      `data:image/svg+xml;base64,${Buffer.from("<svg>pwa</svg>").toString("base64")}`,
    );
  });

  test("should resolve icon paths from package.json", async () => {
    const workspaceRoot = await createWorkspace("sidebar-project-header-package-");
    await mkdir(path.join(workspaceRoot, "images"), { recursive: true });
    await writeFile(
      path.join(workspaceRoot, "package.json"),
      JSON.stringify({
        icon: "images/icon.png",
        name: "example-extension",
      }),
    );
    await writeFile(path.join(workspaceRoot, "images", "icon.png"), "pkgicon");

    const result = await resolveSidebarProjectHeader({
      workspaceRoot,
    });

    expect(result.name).toBe(path.basename(workspaceRoot));
    expect(result.directory).toBe(workspaceRoot);
    expect(result.faviconDataUrl).toBe(
      `data:image/png;base64,${Buffer.from("pkgicon").toString("base64")}`,
    );
  });

  test("should resolve app icons from an xcode asset catalog appiconset", async () => {
    const workspaceRoot = await createWorkspace("sidebar-project-header-xcode-");
    const appIconDirectory = path.join(
      workspaceRoot,
      "App",
      "Resources",
      "Assets.xcassets",
      "AppIcon.appiconset",
    );
    await mkdir(appIconDirectory, { recursive: true });
    await writeFile(
      path.join(appIconDirectory, "Contents.json"),
      JSON.stringify({
        images: [
          {
            filename: "icon_128x128.png",
            idiom: "mac",
            scale: "1x",
            size: "128x128",
          },
          {
            filename: "icon_512x512@2x.png",
            idiom: "mac",
            scale: "2x",
            size: "512x512",
          },
        ],
        info: {
          author: "xcode",
          version: 1,
        },
      }),
    );
    await writeFile(path.join(appIconDirectory, "icon_128x128.png"), "icon128");
    await writeFile(path.join(appIconDirectory, "icon_512x512@2x.png"), "icon1024");

    const result = await resolveSidebarProjectHeader({
      workspaceRoot,
    });

    expect(result.name).toBe(path.basename(workspaceRoot));
    expect(result.directory).toBe(workspaceRoot);
    expect(result.faviconDataUrl).toBe(
      `data:image/png;base64,${Buffer.from("icon1024").toString("base64")}`,
    );
  });

  test("should fall back to the workspace directory name when no workspace name or icon exists", async () => {
    const workspaceRoot = await createWorkspace("sidebar-project-header-fallback-");

    const result = await resolveSidebarProjectHeader({
      workspaceRoot,
    });

    expect(result).toEqual({
      directory: workspaceRoot,
      faviconDataUrl: undefined,
      name: path.basename(workspaceRoot),
    });
  });
});

async function createWorkspace(prefix: string): Promise<string> {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  createdDirectories.push(workspaceRoot);
  return workspaceRoot;
}
