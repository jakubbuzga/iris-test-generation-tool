module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Look for test files in 'src' and a potential top-level 'tests' directory
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  // Match .test.ts or .spec.ts files
  testRegex: '(/__tests__/.*|(\.|/)(test|spec))\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
