import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.test.js', // Unit tests
      'tests/**/*.test.js', // Integration tests
    ],
    testTimeout: 60000, // 60s timeout for integration tests
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'debug_artifacts/'],
    },
  },
});
