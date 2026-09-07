import { useState } from 'react';
import { IconPlayerPlay } from '@tabler/icons-react';
import { Button } from '@/packages/components/ui/button';
import { AppTooltip } from '../app-tooltip';

/** CDXC:Settings 2026-09-07 DECISION: Login commands are hidden in Accounts and its tutorial. Click to run login starts the flow; hovering the button reveals the command. This replaces the visible login command boxes and Log in to fix label. */
export function AccountLoginButton({
  command,
  disabled,
  onRun,
}: {
  command: string;
  disabled?: boolean;
  onRun: () => void;
}) {
  const [error, setError] = useState('');
  return (
    <div className='gx-account-login-action'>
      <AppTooltip content={<code>{command}</code>}>
        <Button
          variant='outline'
          size='sm'
          disabled={disabled}
          onClick={() => {
            setError('');
            try {
              onRun();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Could not open the sign-in terminal.');
            }
          }}
        >
          <IconPlayerPlay aria-hidden='true' />
          Click to run login
        </Button>
      </AppTooltip>
      {error && <p role='alert'>{error}</p>}
    </div>
  );
}
