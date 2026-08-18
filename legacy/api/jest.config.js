module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,js}',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/src/**/*.dto.ts',
    '!<rootDir>/src/**/*.entity.ts',
    '!<rootDir>/src/**/*.schema.ts',
    '!<rootDir>/src/main.ts',
  ],
  coverageProvider: 'v8',
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
  clearMocks: true,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^src/lib/auth$': '<rootDir>/src/test/mocks/auth.mock.ts',
    '^better-auth$': '<rootDir>/src/test/mocks/better-auth.mock.ts',
    '^better-auth/node$': '<rootDir>/src/test/mocks/better-auth-node.mock.ts',
    '^better-auth/adapters/prisma$':
      '<rootDir>/src/test/mocks/better-auth-prisma-adapter.mock.ts',
  },
};
