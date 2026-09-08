import { useState } from 'react';
import { IconHistoryToggle } from '@tabler/icons-react';
import { Button } from '@/packages/components/ui/button';
import './import-sessions-card.css';

const IMPORT_SESSIONS_INTRO_SEEN_KEY = 'ghostex.sidebar.import-sessions-intro-seen.v1';

export function useImportSessionsIntro(openExternalSessions: () => void) {
  const [isVisible, setIsVisible] = useState(
    () => window.localStorage.getItem(IMPORT_SESSIONS_INTRO_SEEN_KEY) !== 'true'
  );
  const openImportSessions = () => {
    openExternalSessions();
    window.localStorage.setItem(IMPORT_SESSIONS_INTRO_SEEN_KEY, 'true');
    setIsVisible(false);
  };
  return { isVisible, openImportSessions };
}

/** CDXC:Sessions 2026-09-08 DECISION:
 * User: introduce older sessions at the bottom of the sidebar on first launch, with a dark neutral charcoal, rounded, padded card, 7px side margins, and a whitish outline button.
 * Both its Click here button and Import Sessions immediately below Sessions in the hamburger menu open the External list directly.
 */
export function ImportSessionsCard({ onImport }: { onImport: () => void }) {
  return (
    <section className='sidebar-import-sessions-card' aria-label='Continue older sessions'>
      <span className='sidebar-import-sessions-icon' aria-hidden='true'>
        <IconHistoryToggle size={20} stroke={1.6} />
      </span>
      <p>Want to continue your older sessions?</p>
      <Button variant='outline' className='sidebar-import-sessions-button' onClick={onImport}>
        Click here
      </Button>
    </section>
  );
}
