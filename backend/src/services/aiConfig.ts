import { db } from '../db/database';

export type AIProvider = 'gemma4' | 'googleai' | 'openrouter' | 'openai' | 'demo';

export interface AIConfig {
  provider: AIProvider;
  // Gemma 4 via Ollama (local)
  gemmaModel: string;
  gemmaEndpoint: string;
  gemmaApiKey: string;
  // Google AI Studio (cloud, free API key)
  googleApiKey: string;
  googleModel: string;
  // OpenRouter (cloud, free tier)
  openrouterApiKey: string;
  openrouterModel: string;
  // OpenAI
  openaiApiKey: string;
  openaiModel: string;
  // Shared inference settings
  thinkingMode: boolean;
  temperature: number;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: (process.env.AI_PROVIDER as AIProvider) || 'demo',
  gemmaModel: process.env.GEMMA_MODEL || 'gemma4:31b',
  gemmaEndpoint: process.env.GEMMA_ENDPOINT || 'http://localhost:11434',
  gemmaApiKey: process.env.GEMMA_API_KEY || '',
  googleApiKey: process.env.GOOGLE_AI_KEY || '',
  googleModel: process.env.GOOGLE_AI_MODEL || 'gemma-3-27b-it',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openrouterModel: process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  thinkingMode: true,
  temperature: 0.2,
};

let currentConfig: AIConfig = { ...DEFAULT_CONFIG };

export function loadAIConfig(): AIConfig {
  try {
    const rows = db.prepare('SELECT key, value FROM app_settings WHERE key LIKE "ai_%"').all() as { key: string; value: string }[];
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.key, r.value);

    if (map.has('ai_provider')) currentConfig.provider = map.get('ai_provider') as AIProvider;
    if (map.has('ai_gemma_model')) currentConfig.gemmaModel = map.get('ai_gemma_model')!;
    if (map.has('ai_gemma_endpoint')) currentConfig.gemmaEndpoint = map.get('ai_gemma_endpoint')!;
    if (map.has('ai_gemma_api_key')) currentConfig.gemmaApiKey = map.get('ai_gemma_api_key')!;
    if (map.has('ai_google_api_key')) currentConfig.googleApiKey = map.get('ai_google_api_key')!;
    if (map.has('ai_google_model')) currentConfig.googleModel = map.get('ai_google_model')!;
    if (map.has('ai_openrouter_api_key')) currentConfig.openrouterApiKey = map.get('ai_openrouter_api_key')!;
    if (map.has('ai_openrouter_model')) currentConfig.openrouterModel = map.get('ai_openrouter_model')!;
    if (map.has('ai_openai_api_key')) currentConfig.openaiApiKey = map.get('ai_openai_api_key')!;
    if (map.has('ai_openai_model')) currentConfig.openaiModel = map.get('ai_openai_model')!;
    if (map.has('ai_thinking_mode')) currentConfig.thinkingMode = map.get('ai_thinking_mode') === 'true';
    if (map.has('ai_temperature')) currentConfig.temperature = parseFloat(map.get('ai_temperature')!) || 0.2;
  } catch (err) {
    // Table may not exist yet on initial boot
  }

  return { ...currentConfig };
}

export function saveAIConfig(newConfig: Partial<AIConfig>): AIConfig {
  currentConfig = { ...currentConfig, ...newConfig };

  const insert = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  const set = (key: string, val: string) => insert.run(key, val);

  if (newConfig.provider !== undefined)          set('ai_provider', currentConfig.provider);
  if (newConfig.gemmaModel !== undefined)        set('ai_gemma_model', currentConfig.gemmaModel);
  if (newConfig.gemmaEndpoint !== undefined)     set('ai_gemma_endpoint', currentConfig.gemmaEndpoint);
  if (newConfig.gemmaApiKey !== undefined)       set('ai_gemma_api_key', currentConfig.gemmaApiKey);
  if (newConfig.googleApiKey !== undefined)      set('ai_google_api_key', currentConfig.googleApiKey);
  if (newConfig.googleModel !== undefined)       set('ai_google_model', currentConfig.googleModel);
  if (newConfig.openrouterApiKey !== undefined)  set('ai_openrouter_api_key', currentConfig.openrouterApiKey);
  if (newConfig.openrouterModel !== undefined)   set('ai_openrouter_model', currentConfig.openrouterModel);
  if (newConfig.openaiApiKey !== undefined)      set('ai_openai_api_key', currentConfig.openaiApiKey);
  if (newConfig.openaiModel !== undefined)       set('ai_openai_model', currentConfig.openaiModel);
  if (newConfig.thinkingMode !== undefined)      set('ai_thinking_mode', String(currentConfig.thinkingMode));
  if (newConfig.temperature !== undefined)       set('ai_temperature', String(currentConfig.temperature));

  return { ...currentConfig };
}

export function getAIConfig(): AIConfig {
  return { ...currentConfig };
}
