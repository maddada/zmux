import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Checkbox } from '@/packages/components/ui/checkbox';
import { AccountLoginButton } from './login-button';
import { runAccountSetup } from './transport';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/packages/components/ui/dialog';
import type { AccountHelper, AccountProvider } from '@/packages/shared/agent-accounts';
import { AccountLogo } from './controls';
import { CopyCommand } from './copy-command';

/** CDXC:Settings 2026-09-07 DECISION: Each provider has a connection-guide button. Both open the same Settings dialog with a backdrop, shared Ghostex instructions once, and two bullets for the provider-specific steps, each with a short helper and author credit. */
export function AccountConnectionGuide({
  provider,
  helpers,
  machineId,
  busy,
  onClose,
}: {
  provider?: AccountProvider;
  helpers: AccountHelper[];
  machineId: string;
  busy: boolean;
  onClose: () => void;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [settingsHeight, setSettingsHeight] = useState(0);
  const [consent, setConsent] = useState(false);
  const consentId = useId();
  /** CDXC:Settings 2026-09-07 DECISION: The tutorial is at most 90% of its Settings modal's height, including when Settings resizes. */
  useLayoutEffect(() => {
    if (!provider) {
      setConsent(false);
      return;
    }
    const settings = anchor.current?.closest<HTMLElement>('.settings-modal-dialog');
    if (!settings) return;
    const measure = () => setSettingsHeight(settings.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(settings);
    return () => observer.disconnect();
  }, [provider]);
  return (
    <>
      <span hidden ref={anchor} />
      <Dialog
        open={Boolean(provider)}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent
          nested
          showCloseButton
          className='gx-accounts gx-account-guide sm:max-w-xl'
          style={{ maxHeight: settingsHeight * 0.9 }}
        >
          <DialogHeader>
            <DialogTitle>Connect your accounts</DialogTitle>
            <DialogDescription>
              Save each login on the computer where your sessions run, then add it to Ghostex.
            </DialogDescription>
          </DialogHeader>
          <section>
            <h3>1. Save a login</h3>
            <p>
              Allow shared conversations below, then choose Click to run login for Claude or Codex. Complete the login
              in the terminal and browser that open.
            </p>
            <label className='gx-account-consent' htmlFor={consentId}>
              <Checkbox id={consentId} checked={consent} onCheckedChange={setConsent} />
              <span>Share conversations between my accounts of the same provider.</span>
            </label>
            <ul className='gx-account-guide-providers'>
              {(['claude', 'codex'] as const).map((id) => {
                const helper = helpers.find((item) => item.provider === id);
                return (
                  <li key={id} data-selected={provider === id}>
                    <h4>
                      <AccountLogo provider={id} />
                      {id === 'claude' ? 'Claude Code' : 'Codex'}
                    </h4>
                    <p>
                      {id === 'claude'
                        ? 'Claude accounts use Claude Swap (cswap) by Onur Cetinkol (realiti4).'
                        : 'Codex accounts use Codex Swap (xswap CLI) by Mohamad Yahia (maddada).'}
                    </p>
                    <p>
                      {id === 'claude'
                        ? 'Sign in without logging out first. Signing in with an existing account updates its saved credentials.'
                        : 'Each Codex login has a separate account home with shared session history. To reconnect an existing account, use its login button in Accounts.'}
                    </p>
                    {helper && !helper.installed && <CopyCommand command={helper.installCommand} />}
                    {helper?.installed && (
                      <AccountLoginButton
                        command={helper.loginCommand}
                        disabled={busy || !consent}
                        onRun={() => runAccountSetup(machineId, id, helper.loginCommand)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
          <section>
            <h3>2. Add it to Ghostex</h3>
            <p>
              Return to Settings → Agents → Accounts and click the highlighted Refresh accounts button at the top. Open
              Add account, then choose Add saved login. A saved name alone is not enough: the login must be connected.
              You can then rename it, choose its logo color, and enable it for automatic switching.
            </p>
          </section>
          <section>
            <h3>3. Start with an account</h3>
            <p>
              Open the agent dropdown in a project’s sidebar header. Choose Claude or Codex, then an account to start a
              session immediately. Custom agents keep their own settings.
            </p>
            <p>
              The account marked Default is the one chosen under Account for new sessions in Settings. The main
              quick-launch button uses it. Choosing another account applies only to that session. If Settings uses
              Default CLI login, the main button uses the CLI’s current login instead, including when no accounts have
              been added.
            </p>
          </section>
          <section>
            <h3>Let work continue</h3>
            <p>
              Under New session defaults, enable auto-continue and choose whether to wait for a usage reset or switch to
              an available account of the same provider. Automatic switching uses only connected accounts you have
              marked available, following your priority setting. Shared history lets the conversation resume.
            </p>
            <p>
              With error retries enabled, temporary failures retry after 5, 10, 20, 40, then 60 minutes between
              attempts. Login and permission problems need your attention. The computer and Ghostex server must stay
              running.
            </p>
            <p>
              Existing sessions keep their saved settings. Change one session through More actions → Switch account,
              where you can choose a login or override auto-continue.
            </p>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
}
