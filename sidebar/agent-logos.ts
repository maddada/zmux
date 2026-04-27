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
