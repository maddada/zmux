import { AccountPrivacyContext, AccountText, useAccountText, useHideAccountEmails } from './account-text';
import { useId, useMemo, useState, useSyncExternalStore, type RefObject } from 'react';
import { IconBook, IconChevronRight, IconPlus, IconRefresh, IconX } from '@tabler/icons-react';
import { Checkbox } from '@/packages/components/ui/checkbox';
import { AppTooltip } from '../app-tooltip';
import { Button } from '@/packages/components/ui/button';
import { Switch } from '@/packages/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/packages/components/ui/select';
import { SettingsInput, SettingsSection } from '../settings-modal/fields';
import type {
  AccountIconColor,
  AccountProvider,
  AgentAccount,
  AgentAccountsRequest,
  AgentAccountsState,
} from '@/packages/shared/agent-accounts';
import { getAccountsConnections, getAccountsConnectionRevision, subscribeAccountsConnections, runAccountSetup, showAccountFlowToast } from './transport';
import { AccountLoginButton } from './login-button';
import { CopyCommand } from './copy-command';
import { AccountConnectionGuide } from './connection-guide';
import { useAccounts } from './use-accounts';
import { AccountColorSelect, AccountIdentity, AccountLogo, PolicyControls } from './controls';
type Mutation = (request: AgentAccountsRequest) => Promise<boolean>;
export function AccountsSettingsSection({
  active,
  sectionRef,
  hideEmails,
  onHideEmailsChange,
}: {
  active: boolean;
  hideEmails: boolean;
  onHideEmailsChange: (hidden: boolean) => void;
  sectionRef?: RefObject<HTMLDivElement | null>;
}) {
  const connectionRevision = useSyncExternalStore(subscribeAccountsConnections, getAccountsConnectionRevision);
  const connections = useMemo(() => (active ? getAccountsConnections() : []), [active, connectionRevision]);
  const [selected, setSelected] = useState('');
  const connection = connections.find((c) => c.id === selected) ?? connections[0];
  const { data, error, busy, request } = useAccounts(connection?.request, false, active);
  return (
    <AccountPrivacyContext value={hideEmails}>
    <SettingsSection title='Accounts' sectionRef={sectionRef}>
      <div className='gx-accounts gx-account-settings'>
        <div className='gx-account-field-row gx-account-privacy-setting'>
          <label htmlFor='hide-account-emails'>Hide emails<small className='gx-account-privacy-description'>Show only the first and last address characters and obscure the domain.</small></label>
          <Switch id='hide-account-emails' checked={hideEmails} onCheckedChange={onHideEmailsChange} />
        </div>
        {connections.length > 1 && (
          <label className='gx-account-field'>
            Computer
            <Select value={connection?.id} onValueChange={(value) => { if (value) setSelected(value); }}>
              <SelectTrigger aria-label='Computer' className='w-full'><SelectValue /></SelectTrigger>
              <SelectContent>
                {connections.map((c) => (
                  <SelectItem value={c.id} key={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
        {!connection ? (
          <p>Connect to a computer to manage its accounts.</p>
        ) : (
          <>
            {error && (
              <div className='gx-account-error' role='alert'>
                {error}
                <Button variant='ghost' onClick={() => void request({ operation: 'list', refresh: true })}>
                  Try again
                </Button>
              </div>
            )}
            {!data ? (
              <p aria-live='polite'>
                {busy ? 'Reading saved accounts and usage…' : 'Account information is unavailable.'}
              </p>
            ) : (
              <AccountManager key={connection.id} machineId={connection.id} data={data} busy={busy} request={request} />
            )}
          </>
        )}
      </div>
    </SettingsSection>
    </AccountPrivacyContext>
  );
}
/** CDXC:Settings 2026-09-06 DECISION: Accounts live under Settings > Agents; Claude uses cswap and Codex uses xswap. Match the existing Settings organization with padded account rows and grouped controls, using spacing instead of horizontal separators. */
function AccountManager({
  data,
  busy,
  request,
  machineId,
}: {
  data: AgentAccountsState;
  busy: boolean;
  request: Mutation;
  machineId: string;
}) {
  const accountText = useAccountText();
  const [guide, setGuide] = useState<AccountProvider>();
  const [adding, setAdding] = useState<AccountProvider>();
  const [editing, setEditing] = useState<string>();
  return (
    <div className='gx-account-manager'>
      <AccountConnectionGuide provider={guide} helpers={data.helpers} machineId={machineId} busy={busy} onClose={() => setGuide(undefined)} />
      <div className='gx-account-heading gx-account-manager-toolbar'>
        <p>After signing in, refresh accounts to find your saved login.</p>
        {/* CDXC:Settings 2026-09-07 DECISION: Refresh is a labeled, brighter button at the top of Accounts, outside the add-account panel so returning users can find it immediately. */}
        <Button
          variant='secondary'
          size='sm'
          className='gx-account-refresh'
          disabled={busy}
          onClick={async () => {
            if (await request({ operation: 'list', refresh: true })) {
              showAccountFlowToast('Accounts refreshed', 'Open Add account for Claude or Codex, then choose Add saved login next to your connected account.');
            }
          }}
        >
          <IconRefresh aria-hidden='true' />
          {busy ? 'Refreshing…' : 'Refresh accounts'}
        </Button>
      </div>
      {(['claude', 'codex'] as const).map((provider) => {
        const label = provider === 'claude' ? 'Claude' : 'Codex';
        const accounts = data.accounts.filter((a) => a.provider === provider && a.registered);
        const defaultAccount = accounts.find((a) => a.id === data.defaultAccounts[provider]);
        const policy = data.defaults[provider];
        return (
          <section key={provider} className='gx-account-provider' aria-label={`${label} accounts`}>
            <div className='gx-account-heading'>
              <div className='gx-account-provider-title'>
                <AccountLogo provider={provider} />
                <h3>{label}</h3>
                <small>{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</small>
              </div>
              <div className='gx-account-row-actions'>
              <Button variant='ghost' size='sm' aria-label={`How to connect ${label}`} onClick={() => setGuide(provider)}>
                <IconBook aria-hidden='true' />
                Connection guide
              </Button>
              <Button
                variant='outline'
                size='sm'
                aria-expanded={adding === provider}
                onClick={() => setAdding(adding === provider ? undefined : provider)}
              >
                <IconPlus aria-hidden='true' />
                Add account
              </Button>
              </div>
            </div>
            <div className='gx-account-list'>
              {accounts.map((account) => (
                <div key={account.id} className='gx-account-saved' data-editing={editing === account.id}>
                  <div className='gx-account-row'>
                    <AccountIdentity account={account} />
                    <div className='gx-account-row-copy'>
                      <strong><AccountText text={account.name} /></strong>
                      {account.email !== account.name && <small><AccountText text={account.email || 'Saved login unavailable'} /></small>}
                    </div>
                    <div className='gx-account-row-actions'>
                      <span className='gx-account-status'>
                        {account.status === 'ready' ? (account.eligible ? 'Available' : 'Manual only') : 'Reconnect'}
                      </span>
                      <Button
                        variant='ghost'
                        size='sm'
                        aria-label={`Edit ${accountText(account.name)}`}
                        aria-expanded={editing === account.id}
                        onClick={() => setEditing(editing === account.id ? undefined : account.id)}
                      >
                        Edit
                        <IconChevronRight className='gx-account-edit-chevron' aria-hidden='true' />
                      </Button>
                    </div>
                  </div>
                  {editing === account.id && (
                    <AccountEditor account={account} machineId={machineId} busy={busy} request={request} close={() => setEditing(undefined)} />
                  )}
                </div>
              ))}
              {accounts.length === 0 && (
                <div className='gx-account-empty'>
                  <strong>No saved {label} accounts</strong>
                  <p>Add your first account to switch logins and continue across usage limits.</p>
                </div>
              )}
            </div>
            {adding === provider && (
              <AccountSetup
                key={provider}
                provider={provider}
                machineId={machineId}
                data={data}
                busy={busy}
                request={request}
                close={() => setAdding(undefined)}
              />
            )}
            <details className='gx-account-defaults'>
              <summary className='gx-account-policy-summary settings-management-row'>
                <IconChevronRight aria-hidden='true' />
                <span className='gx-account-row-copy'>
                  <strong>New session defaults</strong>
                  <small className='gx-account-default-summary'>
                    {defaultAccount && <AccountLogo provider={defaultAccount.provider} color={defaultAccount.color} />} <AccountText text={defaultAccount?.name ?? 'Default CLI login'} /> · {policy.enabled ? (policy.atLimit === 'wait' ? 'Wait for reset' : 'Switch at a limit') : 'Auto-continue off'}
                  </small>
                </span>
              </summary>
              <div className='gx-account-defaults-body'>
                <p>Applies to new {label} sessions. Existing sessions keep their saved settings.</p>
                <label className='gx-account-field'>
                  Account for new sessions
                  <Select
                    disabled={busy}
                    value={data.defaultAccounts[provider] ?? ''}
                    onValueChange={(value) =>
                      void request({ operation: 'defaultAccount', provider, accountId: value || null })
                    }
                  >
                    <SelectTrigger
                      aria-label={`${label} account for new sessions`}
                      className='h-[34px] w-full rounded-lg border-border bg-background px-3 text-xs'
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=''>Default CLI login</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}><AccountLogo provider={account.provider} color={account.color} /><AccountText text={account.name} /></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <small>Default uses the CLI’s ordinary login on this computer.</small>
                </label>
                <PolicyControls
                  scope={`${provider} defaults`}
                  policy={policy}
                  disabled={busy}
                  onChange={(nextPolicy) => void request({ operation: 'defaults', provider, policy: nextPolicy })}
                />
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}

function AccountEditor({
  account,
  machineId,
  busy,
  request,
  close,
}: {
  account: AgentAccount;
  machineId: string;
  busy: boolean;
  request: Mutation;
  close: () => void;
}) {
  const hideEmails = useHideAccountEmails();
  const [name, setName] = useState(account.name);
  const [color, setColor] = useState<AccountIconColor>(account.color);
  const [eligible, setEligible] = useState(account.eligible);
  const [remove, setRemove] = useState(false);
  const [reconnect, setReconnect] = useState(false);
  const command =
    account.provider === 'codex'
      ? `xswap login ${account.selector}`
      : 'claude auth login && cswap add';
  return (
    <div className='gx-account-editor'>
      <label className='gx-account-field'>
        Account name
        <SettingsInput type={hideEmails && name.includes('@') ? 'password' : 'text'} autoComplete='off' maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <AccountColorSelect value={color} onChange={setColor} />
      <div className='gx-account-preview'>
        <span className='gx-account-color-preview-label'>Chat bar</span>
        <div>
          <AccountLogo provider={account.provider} color={color} />
          <span>
            {account.provider === 'codex' ? 'Codex' : 'Claude'} · <AccountText text={name} />
          </span>
        </div>
        <span className='gx-account-color-preview-label'>Sidebar</span>
        <div>
          <AccountLogo provider={account.provider} color={color} />
          <span>Current task</span>
          <small><AccountText text={name} /></small>
        </div>
      </div>
      <div className='gx-account-field-row'>
        <label htmlFor={`eligible-${account.id}`}>Available for automatic switching</label>
        <Switch id={`eligible-${account.id}`} checked={eligible} onCheckedChange={setEligible} />
      </div>
      <p>
        {account.sessionCount} session{account.sessionCount === 1 ? '' : 's'} use this account. Conversations are shared
        within this provider.
      </p>
      <div className='gx-account-row-actions'>
        <Button
          disabled={busy || !name.trim()}
          onClick={async () => {
            if (await request({ operation: 'update', id: account.id, name, color, eligible })) close();
          }}
        >
          Save changes
        </Button>
        <Button variant='ghost' onClick={close}>
          Cancel
        </Button>
        <Button variant='ghost' onClick={() => setReconnect(!reconnect)}>
          Sign in again
        </Button>
        <Button variant='ghost' onClick={() => setRemove(!remove)}>
          Remove
        </Button>
      </div>
      {reconnect && (
        <div className='gx-account-setup'>
          <p>
            {account.provider === 'claude'
              ? 'Click to run login and sign in with this account. Do not log out first.'
              : 'Finish active launches for this account, then sign in again using xswap.'}
          </p>
          <AccountLoginButton command={command} disabled={busy} onRun={() => runAccountSetup(machineId, account.provider, command)} />
          <Button
            variant='outline'
            disabled={busy}
            onClick={() =>
              void request({
                operation: 'register',
                id: account.id,
                provider: account.provider,
                selector: account.selector,
                shareHistory: true,
              })
            }
          >
            Check connection
          </Button>
        </div>
      )}
      {remove && (
        <div className='gx-account-error'>
          <strong><AccountLogo provider={account.provider} color={account.color} /> Remove <AccountText text={account.name} /> from Ghostex?</strong>
          <p>
            The saved helper login and shared conversations remain. Sessions using this account need a different account
            before their next resume.
          </p>
          <Button
            variant='outline'
            disabled={busy}
            onClick={async () => {
              if (await request({ operation: 'remove', id: account.id })) close();
            }}
          >
            Remove from Ghostex
          </Button>
        </div>
      )}
    </div>
  );
}
/** CDXC:Settings 2026-09-07 DECISION: A saved account with missing credentials shows the reason and a Click to run login button directly in the account row. Repairing its login is available before consenting to shared conversations; adding it still requires that consent. */
function AccountSetup({
  provider,
  machineId,
  data,
  busy,
  request,
  close,
}: {
  provider: AccountProvider;
  machineId: string;
  data: AgentAccountsState;
  busy: boolean;
  request: Mutation;
  close: () => void;
}) {
  const [consent, setConsent] = useState(false);
  const [signInError, setSignInError] = useState('');
  const signIn = (command: string) => {
    setSignInError('');
    try { runAccountSetup(machineId, provider, command); }
    catch (cause) { setSignInError(cause instanceof Error ? cause.message : 'Could not open the sign-in terminal.'); }
  };
  const consentId = useId();
  const helper = data.helpers.find((h) => h.provider === provider);
  const available = data.accounts.filter((a) => a.provider === provider && !a.registered);
  return (
    <div className='gx-account-setup'>
      <div className='gx-account-heading'>
        <h3>Add a {provider === 'claude' ? 'Claude' : 'Codex'} account</h3>
        <AppTooltip content='Close account setup'>
          <Button variant='outline' size='icon-sm' aria-label='Close account setup' onClick={close}>
            <IconX aria-hidden='true' />
          </Button>
        </AppTooltip>
      </div>
      {!helper?.installed && (
        <>
          <p>Install {provider === 'claude' ? 'claude-swap with uv' : 'xswap'} on this computer first.</p>
          {helper && <CopyCommand command={helper.installCommand} />}
        </>
      )}
      {helper?.error && <p>{helper.error}</p>}
      {signInError && <p role='alert'>{signInError}</p>}
      {helper?.installed && (
        <>
          <label className='gx-account-consent' htmlFor={consentId}>
            <Checkbox id={consentId} checked={consent} onCheckedChange={setConsent} />
            <span>
              Share conversations between my {provider === 'claude' ? 'Claude' : 'Codex'} accounts so sessions can
              resume with another login.
            </span>
          </label>
          {available.map((a) => (
            <div className='gx-account-row' key={a.id}>
              <AccountLogo provider={provider} color={a.color} />
              <div className='gx-account-row-copy'>
                <strong><AccountText text={a.name || `Account ${a.selector}`} /></strong>
                {a.email !== a.name && <small><AccountText text={a.email} /></small>}
                {a.status !== 'ready' && <small role='status'><AccountText text={savedLoginIssue(a)} /></small>}
              </div>
              {a.status === 'ready' ? (
                <Button
                  variant='outline'
                  size='sm'
                  title={!consent ? 'Allow shared conversations first.' : undefined}
                  disabled={busy || !consent}
                  onClick={async () => {
                    if (await request({ operation: 'register', provider, selector: a.selector, shareHistory: true })) {
                      showAccountFlowToast('Account added', 'Start a session by choosing your agent and this account in the project’s sidebar launcher.');
                    }
                  }}
                >
                  Add saved login
                </Button>
              ) : (
                <AccountLoginButton
                  command={provider === 'codex' ? `xswap login ${a.selector}` : helper.loginCommand}
                  disabled={busy}
                  onRun={() => signIn(provider === 'codex' ? `xswap login ${a.selector}` : helper.loginCommand)}
                />
              )}
            </div>
          ))}
          <p>
            Choose Click to run login to open a terminal on this computer. Complete the login, then return here and click Refresh accounts at the top of this section to add your account.
          </p>
          {provider === 'claude' && (
            <p>Sign in without logging out first, so the previous saved login remains usable.</p>
          )}
          <AccountLoginButton
            command={helper.loginCommand}
            disabled={busy || !consent}
            onRun={() => runAccountSetup(machineId, provider, helper.loginCommand)}
          />
        </>
      )}
    </div>
  );
}

function savedLoginIssue(account: AgentAccount): string {
  const nextStep = 'Choose Click to run login and sign in to this account, then click Refresh accounts at the top of this section.';
  if (account.status === 'identityChanged') return `This saved login belongs to a different account. ${nextStep}`;
  if (account.status === 'loginRequired') return account.usageError?.includes('no_credentials')
    ? `This account cannot be added because its saved login credentials are missing. ${nextStep}`
    : `This account needs to be signed in again before it can be added. ${nextStep}`;
  return 'This saved login is unavailable. Refresh to check its connection.';
}
