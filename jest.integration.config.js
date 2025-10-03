/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.integration.ts', '**/?(*.)+(integration).test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.ts',
  ],
  coverageDirectory: 'coverage-integration',
  coverageReporters: ['text', 'lcov'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  // setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration-setup.ts'],
  testTimeout: 120000,
};