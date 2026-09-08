import { agentModelCatalogEffortLabel, type AgentModelCatalog } from '@/packages/shared/agent-model-catalog';
import type { ModelPickerRequest } from './session-chat-model-picker';

const SHORT_MODEL_LABELS: Record<string, string> = {
  'gpt-6-astra': 'Astra',
  'gpt-5.6-sol': 'Sol',
  'gpt-5.6-terra': 'Terra',
  'gpt-5.6-luna': 'Luna',
  fable: 'Fable',
  'opus[1m]': 'Opus (1m)',
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
};
/** Shared by the in-pane chat picker and the terminal's native modal host. */
export function createModelPickerRequest(
  catalog: AgentModelCatalog,
  provider: 'claude' | 'codex',
  selectedModel?: string,
  selectedEffort?: string
): ModelPickerRequest | undefined {
  const agent = catalog.agents[provider];
  const models = agent.models
    .filter((model) => !model.group)
    .map((model) => ({
      value: model.value,
      label: SHORT_MODEL_LABELS[model.value] ?? model.label,
      version: provider === 'codex' ? model.label.replace(/\s+(Astra|Sol|Terra|Luna)$/, '') : undefined,
      efforts: model.efforts.map((value) => ({ value, label: agentModelCatalogEffortLabel(catalog, value) })),
      defaultEffort: model.defaultEffort ?? agent.defaultEffort,
    }));
  // Detection may not have arrived yet. The catalog default is a starting cursor, not a claim about the running agent.
  const model =
    models.find((entry) => entry.value === selectedModel) ??
    models.find((entry) => entry.value === agent.models.find((model) => model.default)?.value) ??
    models[0];
  if (!model) return;
  const effort =
    model.efforts.find((entry) => entry.value === selectedEffort)?.value ??
    model.efforts.find((entry) => entry.value === model.defaultEffort)?.value ??
    model.efforts[0]?.value ??
    '';
  const efforts = agent.efforts.map((value) => ({ value, label: agentModelCatalogEffortLabel(catalog, value) }));
  return {
    requestId: crypto.randomUUID(),
    provider,
    models,
    efforts,
    model: model.value,
    effort,
  };
}
