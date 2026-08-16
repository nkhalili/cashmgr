import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/*.d.ts',
        '**/index.ts',
        'src/database/**', // Browser-specific WASM/IndexedDB adapter
        'src/hooks/**', // React hooks need jsdom + @testing-library/react
        'src/logging/web-file-logger.ts', // Browser-specific OPFS file I/O
      ],
    },
  },
});
