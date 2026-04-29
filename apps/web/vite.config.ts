import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mts', '.ts', '.mtsx', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
  server: {
    port: 5173,
    // Permite Host headers de Quick Tunnels de Cloudflare para exponer el dev
    // server a testers externos. No afecta producción (prod se sirve estático).
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Normalize path separators for Windows
          const p = id.replace(/\\/g, '/');

          if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(p)) {
            return 'react-vendor';
          }
          if (p.includes('/node_modules/@tanstack/')) return 'tanstack';
          if (p.includes('/node_modules/@supabase/')) return 'supabase';
          if (p.includes('/node_modules/@radix-ui/')) return 'radix';
          if (p.includes('/node_modules/recharts/') || p.includes('/node_modules/d3-')) return 'recharts';
          if (
            p.includes('/node_modules/jspdf/') ||
            p.includes('/node_modules/html2canvas/')
          ) {
            return 'pdf';
          }
          if (
            p.includes('/node_modules/react-markdown/') ||
            p.includes('/node_modules/remark-') ||
            p.includes('/node_modules/micromark') ||
            p.includes('/node_modules/mdast-') ||
            p.includes('/node_modules/unist-') ||
            p.includes('/node_modules/hast-')
          ) {
            return 'markdown';
          }
          if (
            p.includes('/node_modules/react-hook-form/') ||
            p.includes('/node_modules/@hookform/') ||
            p.includes('/node_modules/zod/')
          ) {
            return 'forms';
          }
          if (p.includes('/node_modules/date-fns/')) return 'date';
          if (p.includes('/node_modules/lucide-react/')) return 'icons';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
