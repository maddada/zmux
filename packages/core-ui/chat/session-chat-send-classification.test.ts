import { describe, expect, test } from 'vitest';
import { classifySessionChatSend } from './session-chat-send-classification';

describe('session chat send classification', () => {
  test('line-leading bang input is a local command, not an agent prompt', () => {
    expect(classifySessionChatSend('! printf BANG_OK')).toBe('local-command');
    expect(classifySessionChatSend(' ! printf BANG_OK')).toBe('chat');
  });
});
