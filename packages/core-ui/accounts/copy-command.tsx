import { useEffect, useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { Button } from '@/packages/components/ui/button';
import { AppTooltip } from '../app-tooltip';
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <div className='gx-account-command-block'>
      <div className='gx-account-command'>
        <code>{command}</code>
        <div className='gx-account-command-actions'>
          <AppTooltip content={copied ? 'Copied' : 'Copy command'}>
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={copied ? 'Command copied' : 'Copy command'}
              onClick={() => {
                setError('');
                void navigator.clipboard.writeText(command).then(
                  () => setCopied(true),
                  () => setError('Select the command and copy it.')
                );
              }}
            >
              {copied ? <IconCheck aria-hidden='true' /> : <IconCopy aria-hidden='true' />}
            </Button>
          </AppTooltip>
        </div>
      </div>
      <span className='sr-only' role='status'>
        {copied ? 'Command copied' : ''}
      </span>
      {error && <p role='alert'>{error}</p>}
    </div>
  );
}
