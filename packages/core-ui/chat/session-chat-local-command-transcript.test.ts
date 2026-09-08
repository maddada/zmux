import { describe, expect, test } from 'vitest';
import type { SessionChatMessage } from '../../shared/session-chat';
import { normalizeSessionChatLocalCommandMessages } from './session-chat-local-command-transcript';

describe('Codex local-command transcript normalization', () => {
  test('splits one structured execution into command and output rows in order', () => {
    const execution: SessionChatMessage = {
      id: 'execution-1',
      role: 'user',
      blocks: [
        {
          type: 'text',
          text: '<bash-input data-ghostex-escaped="html">printf BANG_TEST</bash-input>',
        },
        {
          type: 'text',
          text: '<bash-stdout data-ghostex-escaped="html">BANG_TEST</bash-stdout>',
        },
      ],
      timestamp: 42,
      source: 'transcript',
      byteOffset: 99,
    };

    expect(normalizeSessionChatLocalCommandMessages([execution])).toEqual([
      {
        ...execution,
        id: 'execution-1:command',
        blocks: [execution.blocks[0]],
      },
      {
        ...execution,
        id: 'execution-1:output',
        blocks: [execution.blocks[1]],
      },
    ]);
  });
});
