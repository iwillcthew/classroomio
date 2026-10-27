export const AGENT_MODEL_IDS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gpt-5.4-mini',
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'claude-haiku-5-5',
  'kimi-k2.6'
] as const;

export type AgentModelId = (typeof AGENT_MODEL_IDS)[number];
export type AgentModelProvider = 'google' | 'openai' | 'anthropic' | 'moonshot';
export type AgentModelCostTier = 'low' | 'high';

export interface AgentModelDescriptor {
  provider: AgentModelProvider;
  label: string;
  /** The exact model id passed to the provider SDK. */
  backendModelId: string;
  /** Whether this model is available on the free plan. */
  isFree: boolean;
  /** Cost tier shown in the model picker — 'low' ($) or 'high' ($$$). */
  costTier: AgentModelCostTier;
  /** Context window size in tokens. Used to show context usage indicator. */
  contextWindow: number;
}

export const AGENT_MODELS: Record<AgentModelId, AgentModelDescriptor> = {
  'gemini-3.1-flash-lite': {
    provider: 'google',
    label: 'Gemini 3.1 Flash Lite',
    backendModelId: 'gemini-3.1-flash-lite',
    isFree: true,
    costTier: 'low',
    contextWindow: 1_048_576
  },
  'gemini-3.5-flash-lite': {
    provider: 'google',
    label: 'Gemini 3.5 Flash Lite',
    backendModelId: 'gemini-3.5-flash-lite',
    isFree: true,
    costTier: 'low',
    contextWindow: 1_048_576
  },
  'gemini-3.8-flash': {
    provider: 'google',
    label: 'Gemini 3.8 Flash',
    backendModelId: 'gemini-3.8-flash',
    isFree: true,
    costTier: 'low',
    contextWindow: 1_048_576
  },
  'gpt-5.4-mini': {
    provider: 'openai',
    label: 'GPT-5.4 Mini',
    backendModelId: 'gpt-5.4-mini',
    isFree: false,
    costTier: 'low',
    contextWindow: 400_000
  },
  'claude-opus-5-5': {
    provider: 'anthropic',
    label: 'Claude Opus 5.5',
    backendModelId: 'claude-opus-5-5',
    isFree: false,
    costTier: 'high',
    contextWindow: 1_000_000
  },
  'claude-sonnet-5-5': {
    provider: 'anthropic',
    label: 'Claude Sonnet 5.5',
    backendModelId: 'claude-sonnet-5-5',
    isFree: false,
    costTier: 'high',
    contextWindow: 1_000_000
  },
  'claude-haiku-5-5': {
    provider: 'anthropic',
    label: 'Claude Haiku 5.5',
    backendModelId: 'claude-haiku-5-5',
    isFree: false,
    costTier: 'low',
    contextWindow: 1_000_000
  },
  'kimi-k2.6': {
    provider: 'moonshot',
    label: 'Kimi K2.6',
    backendModelId: 'kimi-k2.6',
    isFree: true,
    costTier: 'low',
    contextWindow: 262_144
  }
};

export const UI_PICKER_MODEL_IDS = [
  'kimi-k2.6',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gpt-5.4-mini',
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'claude-haiku-5-5'
] as const satisfies readonly AgentModelId[];

export const DEFAULT_PICKER_MODEL_ID: AgentModelId = 'gemini-3.1-flash-lite';
