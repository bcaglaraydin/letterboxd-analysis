import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60s default timeout

    // Test file patterns
    include: [
      'src/**/__tests__/**/*.test.js', // Unit tests
      'tests/integration/**/*.test.js', // Integration tests
      'tests/e2e/**/*.test.js', // E2E tests
    ],

    // Exclude manual/benchmark scripts
    exclude: ['tests/manual/**', 'node_modules/**'],

    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/manual/'],
    },
  },
});
