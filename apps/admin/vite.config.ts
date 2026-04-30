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
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const p = id.replace(/\\/g, '/');
          if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(p)) {
            return 'react-vendor';
          }
          if (p.includes('/node_modules/@tanstack/')) return 'tanstack';
          if (p.includes('/node_modules/@supabase/')) return 'supabase';
          if (p.includes('/node_modules/@radix-ui/')) return 'radix';
          if (p.includes('/node_modules/recharts/') || p.includes('/node_modules/d3-')) return 'recharts';
          if (p.includes('/node_modules/date-fns/')) return 'date';
          if (p.includes('/node_modules/lucide-react/')) return 'icons';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
