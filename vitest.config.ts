import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      // Exclude mobile app tests - they use Jest instead
      'apps/mobile/**',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'packages/core/src/**/*.ts',
        'packages/db/src/**/*.ts',
        'apps/web/src/**/*.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/*.d.ts',
        '**/index.ts',
        'apps/web/src/database/**', // Browser-specific WASM/IndexedDB adapter
        'apps/web/src/hooks/**', // React hooks need jsdom + @testing-library/react
        'packages/db/src/adapters/**', // Platform-specific SQLite adapters
        'packages/db/src/seed.ts', // Seed data script
        'packages/db/src/migration-runner.ts', // Migration infrastructure
        'packages/core/src/api/**', // External HTTP API calls
      ],
    },
  },
});
