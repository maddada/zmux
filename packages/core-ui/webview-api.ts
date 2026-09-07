import type { SidebarToExtensionMessage } from '../shared/session-grid-contract';
import type { AgentAccountsRequest, AgentAccountsState } from '../shared/agent-accounts';

export type WebviewApi = {
  postMessage: (message: SidebarToExtensionMessage) => void;
  requestGroupAccounts?: (groupId: string, request: AgentAccountsRequest) => Promise<AgentAccountsState>;
  requestSessionAccounts?: (sessionId: string, request: AgentAccountsRequest) => Promise<AgentAccountsState>;
};
