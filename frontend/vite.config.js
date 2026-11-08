import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:3000';
  return {
  plugins: [react(), tailwindcss()],
  // Same-origin API in dev: the browser talks to the Vite server, which forwards to the backend.
  // This keeps the login cookie first-party, so it is always sent (no localhost vs 127.0.0.1 problems).
  server: { proxy: { '/api': target, '/uploads': target } },
  preview: { proxy: { '/api': target, '/uploads': target } },
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/, priority: 3 },
            { name: 'motion', test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/, priority: 2 },
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 2 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  };
});
