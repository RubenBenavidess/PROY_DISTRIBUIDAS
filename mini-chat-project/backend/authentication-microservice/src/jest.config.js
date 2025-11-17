export default {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  transform: {},
  globals: {
    'jest': true
  }
};
