#!/usr/bin/env node

import { Command } from 'commander';
import { validateFile } from './commands/validate';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Read version from package.json
function getVersion(): string {
  try {
    // In compiled code, __dirname points to dist/cli
    // We need to go up two levels to reach package.json
    const packageJsonPath = resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.0.0';
  } catch (error) {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('statecharts')
  .description('CLI tools for SCXML statecharts')
  .version(getVersion());

program
  .command('validate')
  .description('Validate an SCXML file')
  .requiredOption('-f, --file <path>', 'Path to SCXML file to validate')
  .option(
    '--json',
    'Output validation results in JSON format (for machine consumption)',
  )
  .option(
    '-w, --watch',
    'Watch the file for changes and re-validate automatically',
  )
  .action(async (options) => {
    await validateFile({
      file: options.file,
      json: options.json,
      watch: options.watch,
    });
  });

program.parse();

