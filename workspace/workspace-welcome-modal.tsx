import {
  IconCheck,
  IconArrowLeft,
  IconArrowRight,
  IconBrandGithub,
  IconBolt,
  IconBulb,
  IconLayoutSidebarRight,
  IconRocket,
  IconSparkles,
  IconTerminal2,
  IconWorld,
} from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useState, type ComponentType } from "react";
import type { WorkspaceWelcomeModalMode } from "../shared/workspace-panel-contract";

export type WorkspaceWelcomeModalProps = {
  codexSettingConfirmation?: {
    setting: "statusLine" | "terminalTitle";
    status: "alreadySet" | "updated";
  };
  isOpen: boolean;
  mode: WorkspaceWelcomeModalMode;
  onApplyCodexTerminalTitle: () => void;
  onApplyCodexStatusLine: () => void;
  onClose: () => void;
  onComplete: () => void;
};

type WelcomePageActionButton = {
  buttonLabel: string;
  onClick: "statusLine" | "terminalTitle";
};

type WelcomePageAction = {
  buttons?: WelcomePageActionButton[];
  description: string;
  eyebrow: string;
  snippet?: string[];
};

type WelcomePage = {
  action?: WelcomePageAction;
  bullets: string[];
  icon: ComponentType<{ className?: string; size?: number; stroke?: number }>;
  kicker: string;
  title: string;
};

const WELCOME_PAGES: WelcomePage[] = [
  {
    bullets: [
      "zmux lets you manage multiple CLI coding agent sessions without leaving your editor.",
      "It is built for people who like working with several agents in parallel while staying close to their code, prompts, and Git flow.",
      "It works especially well when you want agents, browser pages, and terminal work all visible in one place.",
      "If you like jumping between multiple sessions or worktrees quickly, zmux is built for that style of work.",
    ],
    icon: IconSparkles,
    kicker: "Welcome",
    title: "What is zmux?",
  },
  {
    bullets: [
      "Use T3 Code if you like GUIs. It also supports splitting.",
      'You can add any CLI agent you want from the overflow menu. Submit an issue or PR and we can add "indicators" support for it.',
      "Your agents can keep running even if you restart or close VS Code, up to the configured background timeout. The default is 5 minutes.",
    ],
    icon: IconTerminal2,
    kicker: "Page 2",
    title: "Agents",
  },
  {
    action: {
      buttons: [
        {
          buttonLabel: "Set terminal title",
          onClick: "terminalTitle",
        },
        {
          buttonLabel: "Set status line",
          onClick: "statusLine",
        },
      ],
      description:
        "Recommended in your `<user>/.codex/config.toml`. If you prefer, the buttons below can apply either setting for the active Codex profile automatically.",
      eyebrow: "Codex",
      snippet: [
        "[tui]",
        'terminal_title = ["spinner", "thread"]',
        'status_line = ["thread-title", "model-with-reasoning", "current-dir", "context-usage", "used-tokens", "weekly-limit"]',
      ],
    },
    bullets: [
      "These settings keep Codex and zmux aligned so session titles stay recognizable, which makes multi-agent work and resuming the right session much easier (Others like Claude do this by default)",
    ],
    icon: IconTerminal2,
    kicker: "Page 3",
    title: "Codex Setup",
  },
  {
    bullets: [
      "Actions are quick buttons for things like Dev, Build, Test, and Setup.",
      "Terminal actions open a fresh VS Code terminal and run your command there.",
      "Right-click a terminal action and choose Debug Action to launch it inside zmux instead.",
      "Browser actions open a URL in a VS Code browser tab and show it inside the Browsers group.",
      "Right-click an action to configure it or remove it.",
    ],
    icon: IconBolt,
    kicker: "Page 4",
    title: "Actions",
  },
  {
    bullets: [
      "You can add a browser page from the overflow menu.",
      "Running browser pages are grouped per project, so you can manage them alongside your agent sessions.",
      "The Browsers section gives you a quick way to jump back into the pages you are actively using for that workspace.",
    ],
    icon: IconWorld,
    kicker: "Page 5",
    title: "Browsers",
  },
  {
    bullets: [
      "You can sleep sessions, then click them later to wake them up if you want them to stay in the sidebar.",
      "You can paste long text into the rename input and zmux will turn it into a cleaner session name.",
      "You can right-click agent and action buttons to configure, edit, or remove them.",
      "You can reopen this guide any time from Help in the sidebar overflow menu.",
    ],
    icon: IconBulb,
    kicker: "Page 6",
    title: "Tips & Tricks",
  },
  {
    action: {
      description:
        "You can ask your agent to make VS Code your default editor for Codex, Claude, and similar CLIs by updating your shell config for you.",
      eyebrow: "Default Editor",
      snippet: [
        "# zsh (~/.zshrc)",
        "# Editor setup",
        "if [[ -n $SSH_CONNECTION ]]; then",
        "    export EDITOR='fresh'",
        "else",
        "    export EDITOR='code --wait'",
        "fi",
        "",
        "# Windows agent prompt (PowerShell)",
        "Please update my PowerShell profile so VS Code is my default editor for Claude, Codex, and similar CLI tools.",
        "If I am in an SSH session, set $env:EDITOR to 'fresh'. Otherwise set it to 'code --wait'.",
        "Create the PowerShell profile file if it does not exist, and add the config safely without removing my existing profile settings.",
      ],
    },
    bullets: [
      "On macOS or Linux, add the zsh snippet below to your ~/.zshrc to make VS Code the default editor locally while still using fresh over SSH.",
      "On Windows, the easiest path is to paste the PowerShell prompt below into your agent and let it update your PowerShell profile for you.",
      "Inside zmux terminals, you can press Ctrl+G in Claude Code, Codex CLI, and similar tools to open a small prompt editor modal instead of typing in the terminal.",
      "When that prompt modal is open, press Ctrl+G again to save the prompt, close the modal, and return to the terminal.",
      "After changing your shell config, open a new terminal session so Codex, Claude, and other CLI tools pick up the updated EDITOR value.",
    ],
    icon: IconTerminal2,
    kicker: "Page 7",
    title: "Default Editor",
  },
  {
    bullets: [
      "zmux works especially well with Agent Manager X: github.com/maddada/agent-manager-x",
      "It lets you keep an always-visible view of your running agent sessions at the side of your screen across all projects.",
      "That makes it a great companion if you want a bigger-picture view while zmux stays focused inside VS Code.",
      "macOS only but help is welcome for porting Agent Manager X to Windows and Linux.",
    ],
    icon: IconLayoutSidebarRight,
    kicker: "Page 8",
    title: "Agent Manager X",
  },
  {
    bullets: [
      "Please send GitHub issues and PRs for problems you run into or improvements you want to see.",
      "Contributions are also very welcome for support for more agents and better indicators support.",
      "Extra help is especially needed for Windows and Linux support.",
      "If you want to help zmux grow, even small fixes, bug reports, and agent integrations make a real difference.",
    ],
    icon: IconBrandGithub,
    kicker: "Page 9",
    title: "Contribute",
  },
];

export function WorkspaceWelcomeModal({
  codexSettingConfirmation,
  isOpen,
  mode,
  onApplyCodexTerminalTitle,
  onApplyCodexStatusLine,
  onClose: _onClose,
  onComplete,
}: WorkspaceWelcomeModalProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const titleId = useId();
  const isLastPage = pageIndex === WELCOME_PAGES.length - 1;
  const canGoBack = pageIndex > 0;
  const page = WELCOME_PAGES[pageIndex];
  const PageIcon = page.icon;
  const snippetText = page.action?.snippet?.join("\n");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPageIndex(0);
  }, [isOpen, mode]);

  const confirmationMessage =
    codexSettingConfirmation?.setting === "terminalTitle"
      ? codexSettingConfirmation.status === "updated"
        ? "Terminal title set"
        : "Terminal title already set"
      : codexSettingConfirmation?.setting === "statusLine"
        ? codexSettingConfirmation.status === "updated"
          ? "Status line set"
          : "Status line already set"
        : undefined;

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="workspace-welcome-root" role="presentation">
      <div aria-hidden="true" className="workspace-welcome-backdrop" />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="workspace-welcome-modal"
        data-mode={mode}
        role="dialog"
      >
        <div className="workspace-welcome-progress" aria-hidden="true">
          {WELCOME_PAGES.map((welcomePage, index) => (
            <span
              className="workspace-welcome-progress-dot"
              data-active={String(index === pageIndex)}
              key={welcomePage.title}
            />
          ))}
        </div>
        <div className="workspace-welcome-hero">
          <div className="workspace-welcome-hero-icon-shell">
            <PageIcon
              aria-hidden="true"
              className="workspace-welcome-hero-icon"
              size={28}
              stroke={1.8}
            />
          </div>
          <div className="workspace-welcome-hero-copy">
            <div className="workspace-welcome-kicker">{page.kicker}</div>
            <div className="workspace-welcome-title" id={titleId}>
              {page.title}
            </div>
          </div>
        </div>
        <div className="workspace-welcome-body scroll-mask-y">
          {page.action ? (
            <div className="workspace-welcome-callout">
              <div className="workspace-welcome-callout-eyebrow">{page.action.eyebrow}</div>
              <div className="workspace-welcome-callout-description">{page.action.description}</div>
              {snippetText ? (
                <div className="workspace-welcome-callout-snippet-shell">
                  <pre className="workspace-welcome-callout-snippet scroll-mask-x">
                    <code>{snippetText}</code>
                  </pre>
                </div>
              ) : null}
              {page.action.buttons?.length ? (
                <div className="workspace-welcome-callout-actions">
                  {page.action.buttons.map((button) => (
                    <button
                      className="workspace-welcome-button workspace-welcome-button-primary workspace-welcome-callout-button"
                      key={button.buttonLabel}
                      onClick={
                        button.onClick === "terminalTitle"
                          ? onApplyCodexTerminalTitle
                          : onApplyCodexStatusLine
                      }
                      type="button"
                    >
                      {button.buttonLabel}
                    </button>
                  ))}
                </div>
              ) : null}
              {confirmationMessage ? (
                <div className="workspace-welcome-callout-confirmation">
                  <IconCheck aria-hidden="true" size={14} stroke={2.2} />
                  {confirmationMessage}
                </div>
              ) : null}
            </div>
          ) : null}
          <ul className="workspace-welcome-list">
            {page.bullets.map((bullet) => (
              <li className="workspace-welcome-list-item" key={bullet}>
                <span className="workspace-welcome-list-icon">
                  {pageIndex === 0 ? (
                    <IconSparkles aria-hidden="true" size={14} stroke={1.9} />
                  ) : (
                    <IconRocket aria-hidden="true" size={14} stroke={1.9} />
                  )}
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="workspace-welcome-footer">
          <div className="workspace-welcome-actions">
            {canGoBack ? (
              <button
                className="workspace-welcome-button workspace-welcome-button-secondary"
                onClick={() =>
                  setPageIndex((currentPageIndex) => Math.max(0, currentPageIndex - 1))
                }
                type="button"
              >
                <IconArrowLeft aria-hidden="true" size={15} stroke={1.9} />
                Back
              </button>
            ) : null}
            {isLastPage ? (
              <button
                className="workspace-welcome-button workspace-welcome-button-primary"
                onClick={onComplete}
                type="button"
              >
                Let&apos;s start!
              </button>
            ) : (
              <button
                className="workspace-welcome-button workspace-welcome-button-primary"
                onClick={() =>
                  setPageIndex((currentPageIndex) =>
                    Math.min(WELCOME_PAGES.length - 1, currentPageIndex + 1),
                  )
                }
                type="button"
              >
                Next
                <IconArrowRight aria-hidden="true" size={15} stroke={1.9} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
