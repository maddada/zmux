import { IconCheck, IconStackPush } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { Button } from '@/packages/components/ui/button';

/** CDXC:SavedPrompts 2026-09-06 DECISION: User: add Save prompt between Copy and Rewind on user messages, using the input box's stack-push icon. */
export function SessionChatSavePromptButton({
  prompt,
  onSave,
}: {
  prompt: string;
  onSave: (prompt: string) => Promise<void>;
}) {
  const pendingRef = useRef(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const label =
    status === 'saved'
      ? 'Prompt saved'
      : status === 'saving'
        ? 'Saving prompt'
        : status === 'error'
          ? 'Could not save prompt. Click to retry.'
          : 'Save prompt';
  return (
    <Button
      aria-label={label}
      disabled={status === 'saving'}
      onClick={async () => {
        if (pendingRef.current) return;
        pendingRef.current = true;
        setStatus('saving');
        try {
          await onSave(prompt);
          setStatus('saved');
        } catch {
          setStatus('error');
        } finally {
          pendingRef.current = false;
        }
      }}
      size='icon-xs'
      title={label}
      variant='ghost'
    >
      {status === 'saved' ? (
        <IconCheck aria-hidden='true' stroke={2} />
      ) : (
        <IconStackPush aria-hidden='true' stroke={2} />
      )}
      <span className='sr-only' role='status'>
        {status === 'error' || status === 'saved' ? label : ''}
      </span>
    </Button>
  );
}
