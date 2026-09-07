import { useEffect, useId, useState, type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/packages/core-ui/app-tooltip';
import { writeTextToClipboard } from '../annotation-store';

/**
 * CDXC:Docs 2026-09-07 DECISION:
 * User: clicking the file name in the Docs top bar copies it and shows a tooltip.
 * Copy the displayed name or path, including the readable name of mounted folders.
 */
export function ManageDocumentTitle({ title, icon }: { title: string; icon: ReactNode }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const triggerId = useId();

  useEffect(() => {
    if (copyState === 'idle') return;
    const timeout = window.setTimeout(() => {
      setCopyState('idle');
      setTooltipOpen(false);
    }, 1600);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const copyTitle = async () => {
    try {
      await writeTextToClipboard(title);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    setTooltipOpen(true);
  };

  return (
    <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen} triggerId={triggerId}>
      <TooltipTrigger
        id={triggerId}
        closeOnClick={false}
        render={
          <button
            aria-label='Copy file name'
            className='manage-preview-title'
            onClick={() => void copyTitle()}
            type='button'
          >
            {icon}
            <span>{title}</span>
          </button>
        }
      />
      <TooltipContent align='start' alignOffset={20} side='bottom' sideOffset={8}>
        {copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Could not copy file name' : 'Copy file name'}
      </TooltipContent>
    </Tooltip>
  );
}
