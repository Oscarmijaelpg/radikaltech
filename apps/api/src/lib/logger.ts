import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      '*.api_key',
      '*.apiKey',
      '*.access_token',
      '*.accessToken',
      '*.refresh_token',
      '*.refreshToken',
      '*.password',
      '*.secret',
      'env.OPENAI_API_KEY',
      'env.OPENROUTER_API_KEY',
      'env.GEMINI_API_KEY',
      'env.FIRECRAWL_API_KEY',
      'env.TAVILY_API_KEY',
      'env.APIFY_API_KEY',
      'env.SUPABASE_SERVICE_ROLE_KEY',
      'env.SUPABASE_ANON_KEY',
      'env.DATABASE_URL',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
        }
      : undefined,
});

export type Logger = typeof logger;
