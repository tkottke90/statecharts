import { readFileSync, watchFile, unwatchFile } from 'fs';
import { resolve } from 'path';
import { StateChart } from '../../src/statechart';
import { XMLValidator } from 'fast-xml-parser';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ValidationOptions {
  file: string;
  json?: boolean;
  watch?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  file: string;
  timestamp: string;
  layers: {
    syntax: {
      valid: boolean;
      error?: {
        message: string;
        line: number;
        column: number;
        code: string;
      };
    };
    schema: {
      valid: boolean;
      skipped?: boolean;
      error?: string;
    };
    semantic: {
      valid: boolean;
      error?: string;
    };
  };
}

async function performValidation(
  filePath: string,
  absolutePath: string,
  xmlContent: string,
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    file: filePath,
    timestamp: new Date().toISOString(),
    layers: {
      syntax: { valid: true },
      schema: { valid: true },
      semantic: { valid: true },
    },
  };

  // Layer 1: XML Syntax Validation
  const syntaxResult = XMLValidator.validate(xmlContent);

  if (syntaxResult !== true) {
    const error = syntaxResult.err;
    result.valid = false;
    result.layers.syntax.valid = false;
    result.layers.syntax.error = {
      message: error.msg,
      line: error.line,
      column: error.col,
      code: error.code,
    };
    return result;
  }

  // Layer 2: XSD Schema Validation
  try {
    // In compiled code, __dirname is dist/cli/commands
    // Schema is at project root: schemas/scxml.xsd
    const schemaPath = resolve(__dirname, '../../../schemas/scxml.xsd');
    const { stdout, stderr } = await execAsync(
      `xmllint --schema "${schemaPath}" "${absolutePath}" --noout 2>&1`,
    );

    const output = stdout + stderr;

    if (output.includes('fails to validate')) {
      result.valid = false;
      result.layers.schema.valid = false;
      result.layers.schema.error = output.trim();
      return result;
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ENOENT') {
        result.layers.schema.skipped = true;
      } else {
        // xmllint returns non-zero exit code on validation failure
        // Output can be in either stdout or stderr
        const errorOutput =
          ('stdout' in error && typeof error.stdout === 'string' ? error.stdout : '') +
          ('stderr' in error && typeof error.stderr === 'string' ? error.stderr : '');

        // Check if it's a validation error (not a system error)
        if (errorOutput.includes('fails to validate') || errorOutput.includes('validity error')) {
          result.valid = false;
          result.layers.schema.valid = false;
          result.layers.schema.error = errorOutput.trim();
          return result;
        }

        // If we got here, it's some other error - treat as validation failure
        if (errorOutput.trim()) {
          result.valid = false;
          result.layers.schema.valid = false;
          result.layers.schema.error = errorOutput.trim();
          return result;
        }
      }
    }
  }

  // Layer 3: SCXML Semantic Validation
  try {
    StateChart.fromXML(xmlContent);
    // If we get here, the statechart is valid
  } catch (error: unknown) {
    result.valid = false;
    result.layers.semantic.valid = false;

    if (error && typeof error === 'object' && 'message' in error) {
      let errorMessage = String(error.message);

      if ('errors' in error && Array.isArray(error.errors)) {
        const errorDetails = error.errors
          .map((err: unknown, i: number) => {
            if (err && typeof err === 'object' && 'message' in err) {
              return `  ${i + 1}. ${err.message}`;
            }
            return `  ${i + 1}. ${String(err)}`;
          })
          .join('\n');
        errorMessage += '\n' + errorDetails;
      }

      result.layers.semantic.error = errorMessage;
    } else {
      result.layers.semantic.error = String(error);
    }
  }

  return result;
}

function printHumanReadable(result: ValidationResult): void {
  console.log(`\n🔍 Validating: ${result.file}\n`);
  console.log('='.repeat(60));

  // Layer 1: Syntax
  console.log('\n📝 Step 1: XML Syntax Validation...');
  if (result.layers.syntax.valid) {
    console.log('✅ XML syntax is valid');
  } else {
    const error = result.layers.syntax.error;
    if (error) {
      console.error(`\n❌ XML Syntax Error: ${error.message}`);
      console.error(`   Location: Line ${error.line}, Column ${error.column}`);
      console.error(`   Error Code: ${error.code}`);
    }
  }

  // Layer 2: Schema
  if (result.layers.syntax.valid) {
    console.log('\n📋 Step 2: XSD Schema Validation...');
    if (result.layers.schema.skipped) {
      console.log('⚠️  xmllint not found - skipping XSD validation');
    } else if (result.layers.schema.valid) {
      console.log('✅ XSD schema validation passed');
    } else {
      console.error('\n❌ XSD Schema Validation Failed:\n');
      console.error(result.layers.schema.error);
    }
  }

  // Layer 3: Semantic
  if (result.layers.syntax.valid && result.layers.schema.valid) {
    console.log('\n🔧 Step 3: SCXML Semantic Validation...');
    if (result.layers.semantic.valid) {
      console.log('✅ SCXML semantic validation passed');
    } else {
      console.error('\n❌ SCXML Semantic Validation Failed:\n');
      console.error(result.layers.semantic.error);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (result.valid) {
    console.log('\n✅ All validations passed!\n');
  } else {
    console.log('\n❌ Validation failed\n');
  }
}

function printJson(result: ValidationResult): void {
  console.log(JSON.stringify(result, null, 2));
}

export async function validateFile(options: ValidationOptions): Promise<void> {
  const { file, json = false, watch = false } = options;

  async function validate(): Promise<void> {
    try {
      const absolutePath = resolve(process.cwd(), file);
      const xmlContent = readFileSync(absolutePath, 'utf-8');

      const result = await performValidation(file, absolutePath, xmlContent);

      if (json) {
        printJson(result);
      } else {
        printHumanReadable(result);
      }

      if (!watch) {
        process.exit(result.valid ? 0 : 1);
      }
    } catch (error: unknown) {
      if (json) {
        const errorResult: ValidationResult = {
          valid: false,
          file,
          timestamp: new Date().toISOString(),
          layers: {
            syntax: { valid: false },
            schema: { valid: false },
            semantic: {
              valid: false,
              error:
                error && typeof error === 'object' && 'message' in error
                  ? String(error.message)
                  : String(error),
            },
          },
        };
        printJson(errorResult);
      } else {
        console.error(
          `\n❌ Error: ${error && typeof error === 'object' && 'message' in error ? error.message : String(error)}\n`,
        );
      }

      if (!watch) {
        process.exit(1);
      }
    }
  }

  if (watch) {
    const absolutePath = resolve(process.cwd(), file);

    if (!json) {
      console.log(`\n👀 Watching ${file} for changes...\n`);
      console.log('Press Ctrl+C to stop\n');
    }

    // Initial validation
    await validate();

    // Watch for changes
    watchFile(absolutePath, { interval: 1000 }, async () => {
      if (!json) {
        console.log(`\n🔄 File changed, re-validating...\n`);
      }
      await validate();
    });

    // Keep process alive
    process.on('SIGINT', () => {
      unwatchFile(absolutePath);
      if (!json) {
        console.log('\n\n👋 Stopped watching\n');
      }
      process.exit(0);
    });
  } else {
    await validate();
  }
}

