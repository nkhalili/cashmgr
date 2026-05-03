import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
