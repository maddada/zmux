import { Toaster } from 'sonner';

/** CDXC:Settings 2026-09-07 WHY: Account sign-in closes Settings to open a terminal. Its next-step toast must remain mounted in the app shell after the Settings dialog closes. */
export function AppToastHost() {
  return (
    <Toaster
      id='app-modal'
      position='bottom-center'
      theme='dark'
      closeButton
      toastOptions={{
        style: {
          background: 'var(--popover)',
          border: '1px solid var(--border)',
          color: 'var(--popover-foreground)',
        },
      }}
    />
  );
}
