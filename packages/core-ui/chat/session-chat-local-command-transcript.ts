import type { SessionChatBlock, SessionChatMessage, SessionChatTextBlock } from '../../shared/session-chat';

const CODEX_LOCAL_COMMAND_INPUT = '<bash-input data-ghostex-escaped="html">';
const CODEX_LOCAL_COMMAND_OUTPUT = '<bash-stdout data-ghostex-escaped="html">';

function isTextBlock(block: SessionChatBlock | undefined): block is SessionChatTextBlock {
  return block?.type === 'text';
}

export function normalizeSessionChatLocalCommandMessages(
  messages: readonly SessionChatMessage[]
): SessionChatMessage[] {
  const normalized: SessionChatMessage[] = [];
  for (const message of messages) {
    const command = message.blocks[0];
    const output = message.blocks[1];
    if (
      message.role !== 'user' ||
      message.source !== 'transcript' ||
      message.blocks.length !== 2 ||
      !isTextBlock(command) ||
      !isTextBlock(output) ||
      !command.text.startsWith(CODEX_LOCAL_COMMAND_INPUT) ||
      !output.text.startsWith(CODEX_LOCAL_COMMAND_OUTPUT)
    ) {
      normalized.push(message);
      continue;
    }
    normalized.push(
      { ...message, id: `${message.id}:command`, blocks: [command] },
      { ...message, id: `${message.id}:output`, blocks: [output] }
    );
  }
  return normalized;
}
