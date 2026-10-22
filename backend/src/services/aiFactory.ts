import { AIService } from './aiTypes';
import { DemoAIService } from './demoAIService';
import { Gemma4AIService } from './gemma4Service';
import { GoogleAIService } from './googleAIService';
import { OpenRouterService } from './openRouterService';
import { getAIConfig, loadAIConfig } from './aiConfig';

let aiServiceInstance: AIService | null = null;
let gemma4Instance: Gemma4AIService | null = null;
let googleAIInstance: GoogleAIService | null = null;
let openRouterInstance: OpenRouterService | null = null;
let currentProvider: string | null = null;

export function resetAIService(): void {
  aiServiceInstance = null;
  currentProvider = null;
}

export function getGemma4Service(): Gemma4AIService {
  if (!gemma4Instance) gemma4Instance = new Gemma4AIService();
  return gemma4Instance;
}

export function getGoogleAIService(): GoogleAIService {
  if (!googleAIInstance) googleAIInstance = new GoogleAIService();
  return googleAIInstance;
}

export function getOpenRouterService(): OpenRouterService {
  if (!openRouterInstance) openRouterInstance = new OpenRouterService();
  return openRouterInstance;
}

export function getAIService(): AIService {
  const config = getAIConfig();
  const provider = config.provider || 'demo';

  if (aiServiceInstance && currentProvider === provider) return aiServiceInstance;
  currentProvider = provider;

  switch (provider) {
    case 'googleai':
      console.log(`🤖 AI Provider: Google AI Studio (model: ${config.googleModel})`);
      aiServiceInstance = getGoogleAIService();
      break;

    case 'openrouter':
      console.log(`🤖 AI Provider: OpenRouter (model: ${config.openrouterModel})`);
      aiServiceInstance = getOpenRouterService();
      break;

    case 'gemma4':
      console.log(`🤖 AI Provider: Gemma 4 via Ollama (model: ${config.gemmaModel} @ ${config.gemmaEndpoint})`);
      aiServiceInstance = getGemma4Service();
      break;

    case 'demo':
    default:
      console.log('🤖 AI Provider: Built-in Demo Engine');
      aiServiceInstance = new DemoAIService();
      break;
  }

  return aiServiceInstance;
}
