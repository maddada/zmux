import { useState } from 'react';
import { IconArrowsMaximize, IconX } from '@tabler/icons-react';
import { Button } from '@/packages/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/packages/components/ui/dialog';
import { QrCode } from '@/packages/components/ui/qr-code';

/**
 * CDXC:RemotePairing 2026-09-06 DECISION:
 * User: add an enlarge button for the pairing QR that opens a 250×250 preview with a backdrop over the whole Settings dialog.
 */
export function RemotePairingQrPreview({ computerName, value }: { computerName: string; value: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <div className='settings-remote-qr-preview-trigger'>
        <QrCode alt='Easy Connect pairing code' className='settings-remote-qr' size={144} value={value} />
        <DialogTrigger render={<Button size='sm' variant='outline' />}>
          <IconArrowsMaximize aria-hidden='true' />
          Enlarge QR
        </DialogTrigger>
      </div>
      <DialogContent className='ghostex-settings-shadcn settings-remote-qr-preview-dialog' nested>
        <div className='settings-remote-qr-preview-heading'>
          <DialogHeader>
            <DialogTitle>Connect your phone</DialogTitle>
          </DialogHeader>
          <Button aria-label='Close QR preview' onClick={() => setOpen(false)} size='icon-sm' variant='ghost'>
            <IconX aria-hidden='true' />
          </Button>
        </div>
        <DialogDescription>
          On your phone, open Ghostex → <em>Connect your computer</em> → <em>Scan code</em>.
        </DialogDescription>
        <QrCode
          alt={`Easy Connect pairing code for ${computerName}`}
          className='settings-remote-qr-preview-code'
          size={250}
          value={value}
        />
        <p className='settings-remote-qr-preview-caption'>
          {computerName}
          <span>The QR refreshes automatically after pairing.</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
