import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 3000,
    strictPort: false, // Allow auto-increment to next available port
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      // 'credentialless' (instead of 'require-corp') allows browser extension
      // scripts (e.g. React DevTools) to coexist with cross-origin isolation.
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  base: './',
  build: {
    outDir: 'dist',
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
});
