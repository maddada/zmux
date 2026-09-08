import { openAppModal } from '../app-modal-host-bridge';
import { AccountText, useAccountText } from './account-text';
import { useLayoutEffect, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconSettings } from '@tabler/icons-react';
import type { AccountsTransport } from '@/packages/shared/agent-accounts';
import type { SidebarAgentButton } from '@/packages/shared/sidebar-agents';
import { ProjectAgentLauncherIcon } from '../project-agent-launcher-icon';
import { AgentMenuChatIndicator } from '../agent-menu-chat-indicator';
import { AccountLogo } from './controls';
import { useAccounts } from './use-accounts';

/** CDXC:AgentLauncher 2026-09-08 DECISION: Claude and Codex, including custom agents, offer an account submenu. Mark the actual saved account with Default instead of a separate Default account row. An account choice applies to this launch only; the main quick-launch button uses the saved account in Settings. With no saved accounts, offer Add accounts instead of launching with a CLI login. Account management stays in Settings. */
export function AgentLauncherMenuItems({
  agents,
  primaryAgentId,
  transport,
  onRun,
  onConfigure,
}: {
  agents: readonly SidebarAgentButton[];
  primaryAgentId?: string;
  transport?: AccountsTransport;
  onRun: (agent: SidebarAgentButton, accountId?: string) => void;
  onConfigure: () => void;
}) {
  const accountText = useAccountText();
  const [selected, setSelected] = useState<SidebarAgentButton>();
  const { data, error, busy, request } = useAccounts(transport);
  const root = useRef<HTMLDivElement>(null);
  const provider = selected ? launcherProvider(selected) : null;
  const accounts = data?.accounts.filter((account) => account.registered && account.provider === provider) ?? [];
  useLayoutEffect(() => {
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [selected]);
  const rowClass = 'session-context-menu-item group-control-menu-item group-agent-menu-item';
  return (
    <div
      ref={root}
      onKeyDown={(event) => {
        if (selected && (event.key === 'ArrowLeft' || event.key === 'Escape')) {
          event.preventDefault();
          event.stopPropagation();
          setSelected(undefined);
          return;
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        const rows = Array.from(
          root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []
        );
        const index = rows.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? rows.length - 1
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
        event.preventDefault();
        rows[next]?.focus();
      }}
    >
      {selected && (provider === 'claude' || provider === 'codex') ? (
        <>
          <button className={rowClass} role='menuitem' onClick={() => setSelected(undefined)}>
            <IconChevronLeft size={14} aria-hidden='true' />
            <span className='group-agent-menu-label'>{selected.name}</span>
          </button>
          <div role='group' aria-label={`${selected.name} accounts`}>
            {accounts.map((account) => (
              <button
                key={account.id}
                className={rowClass}
                role='menuitem'
                disabled={account.status !== 'ready'}
                title={account.status !== 'ready' ? 'Reconnect this account in Settings first.' : accountText(account.name)}
                onClick={() => onRun(selected, account.id)}
              >
                <AccountLogo provider={provider} slot={account.selector} />
                <span className='group-agent-menu-label'><AccountText text={account.name} /></span>
                {account.id === data?.defaultAccounts[provider] && (
                  <span className='gx-account-launcher-default'>· Default</span>
                )}
              </button>
            ))}
            {busy && !data && (
              <p className='gx-account-launcher-hint' role='status'>
                Reading accounts…
              </p>
            )}
            {error && (
              <>
                <p className='gx-account-launcher-hint' role='alert'>
                  {error}
                </p>
                <button
                  className={rowClass}
                  role='menuitem'
                  onClick={() => void request({ operation: 'list', refresh: true })}
                >
                  Try again
                </button>
              </>
            )}
            {!transport && <p className='gx-account-launcher-hint'>Account connection unavailable.</p>}
            {data && !accounts.length && <button className={rowClass} role='menuitem' onClick={() => openAppModal({ type: 'open', modal: 'settings', initialTab: 'agents', initialAgentsSection: 'accounts' })}>Add accounts</button>}

          </div>
        </>
      ) : (
        <>
          {agents.map((agent) => {
            const family = launcherProvider(agent);
            const hasAccounts = family === 'claude' || family === 'codex';
            return (
              <button
                key={agent.agentId}
                className={rowClass}
                aria-label={agent.name}
                role='menuitem'
                aria-haspopup={hasAccounts ? 'menu' : undefined}
                data-selected={String(primaryAgentId === agent.agentId)}
                onKeyDown={(event) => {
                  if (hasAccounts && event.key === 'ArrowRight') {
                    event.preventDefault();
                    setSelected(agent);
                  }
                }}
                onClick={() => (hasAccounts ? setSelected(agent) : onRun(agent))}
              >
                <ProjectAgentLauncherIcon agent={agent} colorMode='brand' />
                <span className='group-agent-menu-label'>{agent.name}</span>
                <AgentMenuChatIndicator agent={agent} />
                {hasAccounts && <IconChevronRight size={14} aria-hidden='true' />}
              </button>
            );
          })}
          {agents.length > 0 && <div className='session-context-menu-divider' role='separator' />}
          <button className={rowClass} role='menuitem' onClick={onConfigure}>
            <IconSettings aria-hidden='true' className='session-context-menu-icon' size={14} />
            <span className='group-agent-menu-label'>Configure</span>
          </button>
        </>
      )}
    </div>
  );
}

function launcherProvider(agent: SidebarAgentButton) {
  const family = agent.icon ?? agent.agentId;
  return family === 'claude' || family === 'codex' ? family : null;
}
