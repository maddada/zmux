import browserLogo from "../src/assets/browser.svg" with { type: "text" };
import claudeLogo from "../src/assets/claude.svg" with { type: "text" };
import codexLogo from "../src/assets/codex.svg" with { type: "text" };
import copilotLogo from "../src/assets/copilot.svg" with { type: "text" };
import geminiLogo from "../src/assets/gemini.svg" with { type: "text" };
import opencodeLogo from "../src/assets/opencode.svg" with { type: "text" };
import t3Logo from "../src/assets/t3.svg" with { type: "text" };
import type { SidebarAgentIcon } from "../shared/sidebar-agents";

/**
 * CDXC:AgentDetection 2026-04-27-07:07
 * Sidebar card agent icons render as CSS masks. Native WKWebView can create
 * the span correctly while failing to paint a relative-file SVG mask, so agent
 * logos must be inline data URLs shared by masks and regular image sources.
 */
function svgTextToDataUrl(svgText: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svgText)}`;
}

export const AGENT_LOGOS: Record<SidebarAgentIcon, string> = {
  browser: svgTextToDataUrl(browserLogo),
  claude: svgTextToDataUrl(claudeLogo),
  codex: svgTextToDataUrl(codexLogo),
  copilot: svgTextToDataUrl(copilotLogo),
  gemini: svgTextToDataUrl(geminiLogo),
  opencode: svgTextToDataUrl(opencodeLogo),
  t3: svgTextToDataUrl(t3Logo),
};

/**
 * CDXC:NativePaneReorder 2026-05-03-04:59
 * Sidebar agent SVGs are mask assets, so their visible color comes from CSS,
 * not the SVG fill. Native title bars and drag ghosts receive this same color
 * map with the data URL so AppKit can tint the template image to match the
 * session card.
 */
export const AGENT_LOGO_COLORS: Record<SidebarAgentIcon, string> = {
  browser: "#82b7ff",
  claude: "#d97757",
  codex: "#ffffff",
  copilot: "#ffffff",
  gemini: "#8b9aff",
  opencode: "#6d96c0",
  t3: "#ffa6fb",
};
