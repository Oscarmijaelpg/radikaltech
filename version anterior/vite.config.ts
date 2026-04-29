import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Fallback: if root .env is missing, try node_modules/.env (local dev only)
    let fallbackEnv: Record<string, string> = {};
    const fallbackPath = path.resolve(__dirname, 'node_modules', '.env');
    if (fs.existsSync(fallbackPath)) {
      try {
        const parsed = dotenv.parse(fs.readFileSync(fallbackPath));
        fallbackEnv = parsed;
      } catch {
        // ignore parse errors silently
      }
    }
    const mergedEnv = { ...fallbackEnv, ...env };

    return {
      server: {
        port: 1111,
        host: '0.0.0.0',
        proxy: {
          '/openai-api': {
            target: 'https://api.openai.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/openai-api/, '')
          }
        }
      },
      plugins: [
        react(),
        tailwindcss()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(mergedEnv.GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(mergedEnv.GEMINI_API_KEY || env.GEMINI_API_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(mergedEnv.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(mergedEnv.VITE_SUPABASE_ANON_KEY),
        'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(mergedEnv.VITE_OPENROUTER_API_KEY || mergedEnv.OPENROUTER_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
