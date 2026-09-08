import { IconStar, IconStarFilled } from '@tabler/icons-react';
import type { AgentAccount, AgentAccountsRequest } from '@/packages/shared/agent-accounts';
import { Button } from '@/packages/components/ui/button';
import { AppTooltip } from '../app-tooltip';
import { postAppModalHostMessage } from '../app-modal-host-bridge';

/** CDXC:AgentProviders 2026-09-08 DECISION:
 * User: a star with the tooltip "Show this account's stats in the titlebar" pins each account independently.
 */
export function AccountTitlebarStar({
  account,
  busy,
  request,
  machineId,
}: {
  account: AgentAccount;
  busy: boolean;
  request: (params: AgentAccountsRequest) => Promise<boolean>;
  machineId: string;
}) {
  const label = account.showInTitlebar
    ? "Hide this account's stats from the titlebar"
    : "Show this account's stats in the titlebar";
  const Icon = account.showInTitlebar ? IconStarFilled : IconStar;
  return (
    <AppTooltip content={label}>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={label}
        aria-pressed={!!account.showInTitlebar}
        disabled={busy}
        onClick={async () => {
          if (await request({ operation: 'setTitlebar', id: account.id, shown: !account.showInTitlebar })) {
            if (window.webkit?.messageHandlers?.ghostexAppModalHost) {
              postAppModalHostMessage(
                {
                  type: 'accountTitlebarChanged',
                  machineId,
                  account: { ...account, showInTitlebar: !account.showInTitlebar },
                },
                'Accounts:titlebar'
              );
            }
          }
        }}
      >
        <Icon aria-hidden='true' />
      </Button>
    </AppTooltip>
  );
}
