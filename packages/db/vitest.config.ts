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
        'src/adapters/**', // Platform-specific SQLite adapters
        'src/seed.ts', // Seed data script
        'src/migration-runner.ts', // Migration infrastructure
      ],
    },
  },
});
