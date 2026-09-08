import { AccountIndicator } from './indicator';
import { AccountTitlebarStar } from './titlebar-star';
import { AccountConnectFlow } from './connect-flow';
import { accountSetupOwner } from './setup-monitor';
import { AccountPrivacyContext, AccountText, useAccountText, useHideAccountEmails } from './account-text';
import { useEffect, useRef, useMemo, useState, useSyncExternalStore, type RefObject } from 'react';
import { IconBook, IconChevronRight, IconPlus, IconRefresh, IconX } from '@tabler/icons-react';
import { Checkbox } from '@/packages/components/ui/checkbox';
import { AppTooltip } from '../app-tooltip';
import { Button } from '@/packages/components/ui/button';
import { Switch } from '@/packages/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/packages/components/ui/select';
import { SettingsInput, SettingsSection } from '../settings-modal/fields';
import type {
  AccountProvider,
  AgentAccount,
  AgentAccountsRequest,
  AgentAccountsState,
} from '@/packages/shared/agent-accounts';
import { getAccountsConnections, getAccountsConnectionRevision, subscribeAccountsConnections, showAccountFlowToast } from './transport';
import { CopyCommand } from './copy-command';
import { AccountConnectionGuide } from './connection-guide';
import { useAccounts } from './use-accounts';
import { AccountIdentity, AccountLogo, PolicyControls } from './controls';
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
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let lastCompleted = '';
    const poll = async () => {
      const results = await Promise.allSettled(connections.map(async (connection) => ({ connection, jobs: (await connection.request({ operation: 'setupStatus', owner: accountSetupOwner() })).setupJobs ?? [] })));
      if (stopped) return;
      const completed = results.flatMap((result) => result.status === 'fulfilled' ? result.value.jobs.filter((job) => job.status === 'complete').map((job) => ({connection: result.value.connection, job})) : []).sort((a,b) => a.job.createdAt - b.job.createdAt).at(-1);
      if (completed && completed.job.id !== lastCompleted) {
        lastCompleted = completed.job.id;
        setSelected(completed.connection.id);
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2500);
    return () => { stopped = true; clearInterval(timer); };
  }, [active, connections]);
  const connection = connections.find((c) => c.id === selected) ?? connections[0];
  // CDXC:Settings 2026-09-08 DECISION: Refresh accounts every time the Accounts page opens and show loading on the Refresh accounts button itself.
  const { data, error, busy, refreshing, request } = useAccounts(connection?.request, false, active, true);
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
            <div className='gx-account-heading gx-account-manager-toolbar'>
              <p>Accounts refresh automatically when you open this page.</p>
              {/* CDXC:Settings 2026-09-07 DECISION: Refresh is a labeled, brighter button at the top of Accounts, outside the add-account panel so returning users can find it immediately. */}
              <Button
                variant='secondary'
                size='sm'
                className='gx-account-refresh'
                disabled={busy}
                aria-busy={refreshing}
                aria-live='polite'
                onClick={async () => {
                  if (await request({ operation: 'list', refresh: true })) {
                    showAccountFlowToast('Accounts refreshed', 'Saved accounts and usage are up to date.');
                  }
                }}
              >
                <IconRefresh aria-hidden='true' />
                {refreshing ? 'Refreshing…' : 'Refresh accounts'}
              </Button>
            </div>
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
  const [highlighted, setHighlighted] = useState<string>();
  const [pendingJob, setPendingJob] = useState<import('@/packages/shared/agent-accounts').AccountSetupJob>();
  const completedJob = useRef('');
  useEffect(() => {
    let closed = false;
    const poll = async () => {
      try {
        const connection = getAccountsConnections().find((c) => c.id === machineId);
        const jobs = (await connection?.request({ operation: 'setupStatus', owner: accountSetupOwner() }))?.setupJobs ?? [];
        if (closed) return;
        setPendingJob(jobs.filter((job) => !['complete','failed'].includes(job.status)).at(-1));
        const complete = jobs.filter((job) => job.status === 'complete').at(-1);
        if (complete?.accountId && complete.id !== completedJob.current) {
          completedJob.current = complete.id;
          setHighlighted(complete.accountId);
          setAdding(undefined);
          setGuide(undefined);
          setEditing(complete.accountId);
          await request({ operation: 'list', refresh: true });
        }
      } catch { /* Keep the account error and retry controls owned by useAccounts. */ }
    };
    void poll(); const timer = setInterval(() => void poll(), 2000);
    return () => { closed = true; clearInterval(timer); };
  }, [machineId, request]);
  useEffect(() => {
    if (highlighted) document.getElementById(`account-${highlighted}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlighted, data]);
  return (
    <div className='gx-account-manager'>
      {pendingJob && !adding && !editing && <AccountConnectFlow machineId={machineId} provider={pendingJob.provider} initialJob={pendingJob} />}
      <AccountConnectionGuide provider={guide} helpers={data.helpers} machineId={machineId} busy={busy} onClose={() => setGuide(undefined)} />

      {(['claude', 'codex'] as const).map((provider) => {
        const label = provider === 'claude' ? 'Claude' : 'Codex';
        const accounts = data.accounts.filter((a) => a.provider === provider && a.registered).sort((a,b) => Number(a.selector) - Number(b.selector));
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
                <div key={account.id} id={`account-${account.id}`} data-highlighted={highlighted === account.id} className='gx-account-saved' data-editing={editing === account.id}>
                  <div className='gx-account-row'>
                    <AccountIdentity account={account} />
                    <div className='gx-account-row-copy'>
                      <strong><AccountText text={account.name} /></strong>
                      {account.email !== account.name && <small><AccountText text={account.email || 'Saved login unavailable'} /></small>}
                      {account.usageError && <small>{account.usageError}</small>}
                    </div>
                    <div className='gx-account-row-actions'>
                      <AccountTitlebarStar account={account} busy={busy} request={request} machineId={machineId} />
                      {account.status === 'ready' ? (
                        <span className='gx-account-status'>{account.eligible ? 'Available' : 'Manual only'}</span>
                      ) : (
                        <Button variant='outline' size='sm' onClick={() => setEditing(account.id)}>Reconnect</Button>
                      )}
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
                    <AccountEditor accounts={accounts} account={account} machineId={machineId} busy={busy} request={request} close={() => setEditing(undefined)} />
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
                    {defaultAccount && <AccountLogo provider={defaultAccount.provider} slot={defaultAccount.selector} />} <AccountText text={defaultAccount?.name ?? 'Choose an account'} /> · {policy.enabled ? (policy.atLimit === 'wait' ? 'Wait for reset' : 'Switch at a limit') : 'Auto-continue off'}
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

                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id} label={account.name}><AccountLogo provider={account.provider} slot={account.selector} /><AccountText text={account.name} /></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <small>Quick launch uses this saved account.</small>
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
  accounts,
  account,
  machineId,
  busy,
  request,
  close,
}: {
  accounts: AgentAccount[];
  account: AgentAccount;
  machineId: string;
  busy: boolean;
  request: Mutation;
  close: () => void;
}) {
  const hideEmails = useHideAccountEmails();
  const [name, setName] = useState(account.name);
  const [indicator, setIndicator] = useState(account.indicator ?? '');
  const [eligible, setEligible] = useState(account.eligible);
  const [remove, setRemove] = useState(false);
  const [reconnect, setReconnect] = useState(account.status !== 'ready');
  const [swapTarget, setSwapTarget] = useState('');
  return (
    <div className='gx-account-editor'>
      <label className='gx-account-field'>
        Account name
        <SettingsInput type={hideEmails && name.includes('@') ? 'password' : 'text'} autoComplete='off' maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className='gx-account-field'>
        Account indicator
        <SettingsInput aria-label='Account indicator' value={indicator} maxLength={2} placeholder={account.selector} autoComplete='off' onChange={(event) => setIndicator(event.target.value.match(/[\p{L}\p{N}-]/u)?.[0] ?? '')} />
        <small>One letter or number, such as w for work. Enter - to hide the indicator, or leave blank to use slot {account.selector}.</small>
      </label>
      <div className='gx-account-preview'>
        <span className='gx-account-color-preview-label'>Session icon preview</span>
        <div>
          <span className='gx-account-mark'><AccountLogo provider={account.provider} /><AccountIndicator value={indicator || account.selector} /></span>
          <span>{account.provider === 'codex' ? 'Codex' : 'Claude'} · <AccountText text={name} /></span>
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
            if (await request({ operation: 'update', id: account.id, name, color: account.color, eligible, indicator })) close();
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
      {reconnect && <AccountConnectFlow machineId={machineId} provider={account.provider} account={account} />}
      {accounts.length > 1 && <div className='gx-account-field'>
        <label>Swap slot {account.selector} with</label>
        {account.provider === 'claude' && <p>Stop sessions using either account before swapping Claude slots.</p>}
        <div className='gx-account-row-actions'><Select value={swapTarget} onValueChange={(value) => setSwapTarget(value ?? '')}>
          <SelectTrigger aria-label='Account to swap slots with'><SelectValue placeholder='Choose an account' /></SelectTrigger>
          <SelectContent>{accounts.filter((other) => other.id !== account.id).map((other) => <SelectItem key={other.id} value={other.id} label={`Slot ${other.selector} ${other.name}`}>Slot {other.selector} · <AccountText text={other.name} /></SelectItem>)}</SelectContent>
        </Select><Button variant='outline' disabled={busy || !swapTarget} onClick={() => void request({operation:'swapSlots',firstId:account.id,secondId:swapTarget})}>Swap slots</Button></div>
      </div>}
      {remove && (
        <div className='gx-account-error'>
          <strong><AccountLogo provider={account.provider} slot={account.selector} /> Remove <AccountText text={account.name} /> from Ghostex?</strong>
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
function AccountSetup({ provider, machineId, data, busy, request, close }: {
  provider: AccountProvider; machineId: string; data: AgentAccountsState; busy: boolean; request: Mutation; close: () => void;
}) {
  const [selected, setSelected] = useState('new');
  const [consent, setConsent] = useState(false);
  const helper = data.helpers.find((h) => h.provider === provider);
  const available = data.accounts.filter((a) => a.provider === provider && !a.registered);
  const account = available.find((a) => a.id === selected);
  return <div className='gx-account-setup'>
    <div className='gx-account-heading'><h3>Add a {provider === 'claude' ? 'Claude' : 'Codex'} account</h3><Button variant='ghost' size='icon-sm' aria-label='Close account setup' onClick={close}><IconX /></Button></div>
    {!helper?.installed ? helper && <CopyCommand command={helper.installCommand} /> : <>
      {available.length > 0 && <Select value={selected} onValueChange={(value) => setSelected(value ?? 'new')}><SelectTrigger aria-label='Login to add'><SelectValue /></SelectTrigger><SelectContent><SelectItem value='new'>Sign in to a new account</SelectItem>{available.map((a) => <SelectItem key={a.id} value={a.id} label={a.name || a.email}><AccountLogo provider={provider} slot={a.selector} /><AccountText text={a.name || a.email} /></SelectItem>)}</SelectContent></Select>}
      {account?.status === 'ready' ? <div className='gx-account-connect-flow'>
        <label className='gx-account-consent'><Checkbox checked={consent} onCheckedChange={setConsent} /><span>Share conversations between my {provider === 'claude' ? 'Claude' : 'Codex'} accounts.</span></label>
        <Button variant='secondary' disabled={busy || !consent} onClick={async () => { if (await request({operation:'register',provider,selector:account.selector,shareHistory:true})) close(); }}>Add account</Button>
      </div> : <AccountConnectFlow key={selected} machineId={machineId} provider={provider} account={account} />}
    </>}
  </div>;
}
