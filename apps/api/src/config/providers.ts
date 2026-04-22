import { env } from './env.js';

export const PROVIDER_URLS = {
  openai: {
    chatCompletions: 'https://api.openai.com/v1/chat/completions',
    embeddings: 'https://api.openai.com/v1/embeddings',
    imageGenerations: 'https://api.openai.com/v1/images/generations',
  },
  openrouter: {
    chatCompletions: 'https://openrouter.ai/api/v1/chat/completions',
    embeddings: 'https://openrouter.ai/api/v1/embeddings',
    imageGenerations: 'https://openrouter.ai/api/v1/images/generations',
  },
  tavily: {
    search: 'https://api.tavily.com/search',
  },
  firecrawl: {
    scrape: 'https://api.firecrawl.dev/v1/scrape',
  },
} as const;

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
export const APIFY_BASE_URL = 'https://api.apify.com/v2/acts';

export function geminiGenerateContentUrl(model: string, apiKey: string): string {
  return `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
}

export function apifyRunSyncUrl(actorId: string, token: string): string {
  // Apify requiere que los slashes en los actorIds se reemplacen por ~ en las URLs de su API v2
  const formattedId = actorId.replace('/', '~');
  return `${APIFY_BASE_URL}/${formattedId}/run-sync-get-dataset-items?token=${token}`;
}

export const LLM_MODELS = {
  chat: {
    openai: 'gpt-4o-mini',
    openrouter: 'openai/gpt-4o-mini',
  },
  evaluator: 'gpt-4o',
  embedding: {
    base: 'text-embedding-3-small',
    dims: 1536,
    openrouter: 'openai/text-embedding-3-small',
  },
  vision: {
    gemini: 'gemini-2.5-flash',
  },
  image: {
    dalle3: 'dall-e-3',
    geminiCandidates: [
      'gemini-2.5-flash-image',
      'gemini-2.0-flash-preview-image-generation',
      'gemini-2.5-flash-image-preview',
    ] as const,
    geminiDefault: 'gemini-2.5-flash-image',
  },
} as const;

export const APIFY_ACTORS = {
  instagram: 'dSCLg0C3YEZ83HzYX',
  tiktok: 'OtzYfK1ndEGdwWFKQ',
} as const;

export function preferredChatProvider(): 'openrouter' | 'openai' {
  return env.OPENROUTER_API_KEY ? 'openrouter' : 'openai';
}

export function preferredChatEndpoint(): string {
  return preferredChatProvider() === 'openrouter'
    ? PROVIDER_URLS.openrouter.chatCompletions
    : PROVIDER_URLS.openai.chatCompletions;
}

export function preferredChatModel(): string {
  return preferredChatProvider() === 'openrouter'
    ? LLM_MODELS.chat.openrouter
    : LLM_MODELS.chat.openai;
}
