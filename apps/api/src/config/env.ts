import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'debe empezar con postgresql:// (o postgres://)',
    }),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  APIFY_API_KEY: z.string().optional(),
  GOOGLE_PROJECT_ID: z.string().optional(),
  GOOGLE_LOCATION: z.string().optional(),
  GOOGLE_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_ACCESS_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

const OPTIONAL_KEYS: Array<keyof Env> = [
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
  'GEMINI_API_KEY',
  'FIRECRAWL_API_KEY',
  'TAVILY_API_KEY',
  'APIFY_API_KEY',
  'GOOGLE_PROJECT_ID',
  'GOOGLE_LOCATION',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_ACCESS_TOKEN',
];

function formatIssue(issue: z.ZodIssue): string {
  const path = issue.path.join('.') || '(root)';
  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return `  • ${path}: requerido`;
  }
  return `  • ${path}: ${issue.message}`;
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map(formatIssue).join('\n');

  const configured = OPTIONAL_KEYS.filter((k) => {
    const v = process.env[k as string];
    return typeof v === 'string' && v.length > 0;
  });

  // eslint-disable-next-line no-console
  console.error(
    [
      '',
      '\u274c Variables de entorno faltantes o invalidas:',
      issues,
      '',
      configured.length > 0
        ? `\u2705 Configuradas correctamente:\n  \u2022 ${configured.join(', ')}`
        : '\u2139  No hay claves opcionales configuradas.',
      '',
      'Crea/actualiza apps/api/.env y reinicia.',
      '',
    ].join('\n'),
  );
  throw new Error('Invalid environment configuration');
}

export const env: Env = parsed.data;
