import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Timeout configuration - longer in CI
    testTimeout: process.env.CI ? 60000 : 30000,
    hookTimeout: process.env.CI ? 30000 : 15000,
    teardownTimeout: process.env.CI ? 30000 : 15000,
    // Retry flaky tests in CI
    retry: process.env.CI ? 2 : 0,
    // Use forks for better isolation (prevents hanging)
    pool: 'forks',
    // Test file patterns
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/mocks/**', 'tests/fixtures/**', 'tests/e2e/fixtures/**'],
    // Fail fast in CI
    bail: process.env.CI ? 1 : 0,
    // Verbose output for debugging
    reporters: process.env.CI ? ['verbose', 'junit'] : ['verbose'],
    outputFile: process.env.CI ? { junit: './test-results/junit.xml' } : undefined,
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
      '@tests': join(__dirname, 'tests'),
    },
  },
});
