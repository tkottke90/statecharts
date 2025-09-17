import { createDefaultPreset } from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  testPathIgnorePatterns: ['node_modules', 'dist', 'scripts'],
  watchPathIgnorePatterns: ['node_modules', 'dist', 'scripts'],
  // moduleNameMapping: {
  //   "^(\\.{1,2}/.*)\\.js$": "$1",
  // },
};
