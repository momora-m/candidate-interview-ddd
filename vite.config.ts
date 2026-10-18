import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3847,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:4317',
      '/docs': 'http://127.0.0.1:4317',
      '/openapi.yaml': 'http://127.0.0.1:4317',
      '/health': 'http://127.0.0.1:4317',
    },
  },
});
