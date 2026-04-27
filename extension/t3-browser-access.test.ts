import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

const mockState = vi.hoisted(() => ({
  networkInterfaces: vi.fn(() => ({})),
  spawnSync: vi.fn(() => ({ status: 1, stdout: "" })),
}));

vi.mock("node:os", () => ({
  networkInterfaces: mockState.networkInterfaces,
}));

vi.mock("node:child_process", () => ({
  spawnSync: mockState.spawnSync,
}));

describe("resolveT3BrowserAccessLink", () => {
  beforeEach(() => {
    vi.resetModules();
    mockState.networkInterfaces.mockReset();
    mockState.spawnSync.mockReset();
    mockState.networkInterfaces.mockReturnValue({});
    mockState.spawnSync.mockReturnValue({ status: 1, stdout: "" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should use Tailscale for QR and copy, while keeping Open link on LAN", async () => {
    mockState.networkInterfaces.mockReturnValue({
      en0: [
        {
          address: "192.168.1.50",
          family: "IPv4",
          internal: false,
        },
      ],
    });
    mockState.spawnSync.mockReturnValue({
      status: 0,
      stdout: "100.64.0.9\n",
    });

    const { resolveT3BrowserAccessLink } = await import("./t3-browser-access");

    await expect(resolveT3BrowserAccessLink("http://127.0.0.1:45438/t3-share")).resolves.toEqual({
      endpointUrl: "http://100.64.0.9:45438/t3-share",
      localUrl: "http://192.168.1.50:45438/t3-share",
      mode: "tailscale",
      note: "QR code and Copy link use your machine's Tailscale address. Open link uses your machine's local network address.",
      tailscaleEnabled: true,
    });
  });

  test("should use LAN for QR, copy, and Open link when Tailscale is not connected", async () => {
    mockState.networkInterfaces.mockReturnValue({
      en0: [
        {
          address: "192.168.1.50",
          family: "IPv4",
          internal: false,
        },
      ],
    });

    const { resolveT3BrowserAccessLink } = await import("./t3-browser-access");

    await expect(resolveT3BrowserAccessLink("http://127.0.0.1:45438/t3-share")).resolves.toEqual({
      endpointUrl: "http://192.168.1.50:45438/t3-share",
      localUrl: "http://192.168.1.50:45438/t3-share",
      mode: "local-network",
      note: "Tailscale is not connected, so QR code, Copy link, and Open link all use your machine's local network address.",
      tailscaleEnabled: false,
    });
  });

  test("should fall back to loopback when neither Tailscale nor LAN is available", async () => {
    const { resolveT3BrowserAccessLink } = await import("./t3-browser-access");

    await expect(resolveT3BrowserAccessLink("http://127.0.0.1:45438/t3-share")).resolves.toEqual({
      endpointUrl: "http://127.0.0.1:45438/t3-share",
      localUrl: "http://127.0.0.1:45438/t3-share",
      mode: "local-only",
      note: "No Tailscale or local network address was detected, so QR code, Copy link, and Open link only work on this machine for now.",
      tailscaleEnabled: false,
    });
  });

  test("should ignore external VS Code URLs for the QR and copy flow", async () => {
    mockState.networkInterfaces.mockReturnValue({
      en0: [
        {
          address: "192.168.1.50",
          family: "IPv4",
          internal: false,
        },
      ],
    });
    mockState.spawnSync.mockReturnValue({
      status: 0,
      stdout: "100.64.0.9\n",
    });

    const { resolveT3BrowserAccessLink } = await import("./t3-browser-access");

    await expect(resolveT3BrowserAccessLink("http://127.0.0.1:45438/t3-share")).resolves.toEqual({
      endpointUrl: "http://100.64.0.9:45438/t3-share",
      localUrl: "http://192.168.1.50:45438/t3-share",
      mode: "tailscale",
      note: "QR code and Copy link use your machine's Tailscale address. Open link uses your machine's local network address.",
      tailscaleEnabled: true,
    });
  });
});
