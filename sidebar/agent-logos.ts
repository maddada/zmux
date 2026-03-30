import browserLogo from "../src/assets/browser.svg";
import claudeLogo from "../src/assets/claude.svg";
import codexLogo from "../src/assets/codex.svg";
import copilotLogo from "../src/assets/copilot.svg";
import geminiLogo from "../src/assets/gemini.svg";
import opencodeLogo from "../src/assets/opencode.svg";
import t3Logo from "../src/assets/t3.svg";
import type { SidebarAgentIcon } from "../shared/sidebar-agents";

export const AGENT_LOGOS: Record<SidebarAgentIcon, string> = {
  browser: browserLogo,
  claude: claudeLogo,
  codex: codexLogo,
  copilot: copilotLogo,
  gemini: geminiLogo,
  opencode: opencodeLogo,
  t3: t3Logo,
};
