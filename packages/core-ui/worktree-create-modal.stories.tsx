/**
 * CDXC:AppModal 2026-08-24:
 * Visual review story for the Add Worktree modal so the Codex-style restyle
 * can be confirmed without launching the app. Renders the real
 * WorktreeCreateModal with mock agents; bridge calls (existing worktrees,
 * base branches) are no-ops, so the selects simply show their empty states.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SidebarAgentButton } from '@/packages/shared/sidebar-agents';
import { WorktreeCreateModal } from './worktree-create-modal';

const AGENTS: SidebarAgentButton[] = [
  { agentId: 'claude', command: 'claude', isDefault: true, name: 'Claude Code' },
  { agentId: 'codex', command: 'codex', isDefault: false, name: 'Codex' },
];

function WorktreeCreateModalStory({ withWorktrees = false }: { withWorktrees?: boolean }) {
  return (
    <div className='ghostex-root h-screen w-screen bg-[#0e0e0e]' data-sidebar-theme='dark-2'>
      <WorktreeCreateModal
        agents={AGENTS}
        defaultAgentId='claude'
        isOpen
        onCancel={() => {}}
        onConfirm={() => {}}
        onRequestExistingWorktrees={
          withWorktrees
            ? (requestId) => {
                window.setTimeout(
                  () =>
                    window.dispatchEvent(
                      new CustomEvent('ghostex-app-modal-host-message', {
                        detail: {
                          type: 'projectWorktreesResult',
                          requestId,
                          ok: true,
                          branches: [
                            'main',
                            'feature/dropdowns',
                            'release/desktop',
                            'origin/main',
                            'fix/search',
                            'feature/accounts',
                            'docs/setup',
                            'release/mobile',
                            'feature/board',
                          ].map((name) => ({ name, current: name === 'main' })),
                          worktrees: [
                            { name: 'Ghostex', branch: 'main', path: '/demo/Ghostex' },
                            { name: 'UI work', branch: 'feature/dropdowns', path: '/demo/Ghostex-ui' },
                          ],
                        },
                      })
                    ),
                  0
                );
              }
            : undefined
        }
        projectName='Ghostex'
      />
    </div>
  );
}

const meta: Meta<typeof WorktreeCreateModalStory> = {
  component: WorktreeCreateModalStory,
  title: 'Modals/App Host/Add Worktree',
};

export default meta;
type Story = StoryObj<typeof WorktreeCreateModalStory>;

export const Create: Story = {};

export const WithExistingWorktrees: Story = { render: () => <WorktreeCreateModalStory withWorktrees /> };
