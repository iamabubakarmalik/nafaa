/**
 * Unit tests — `pnpm test` (apps/api). Type check alag se `tsc` karta hai,
 * is liye yahan sirf transpile (tez). tsconfig NodeNext hai; tests CommonJS me.
 */
const path = require('path');

// Monorepo me jest-environment-node ke do version (29 aur 30) hain. Jest 30
// ka apna wala seedha do, warna 29 wala uth kar "clearMocksOnScope" toot-ta hai.
const jestConfigDir = path.dirname(require.resolve('jest-config/package.json', { paths: [path.dirname(require.resolve('jest'))] }));
const testEnvironment = require.resolve('jest-environment-node', { paths: [jestConfigDir] });

/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment,
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          isolatedModules: true,
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'ES2022',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          resolveJsonModule: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // NodeNext imports me ".js" likha hota hai — jest ko .ts file dikhao
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  clearMocks: true,
};
