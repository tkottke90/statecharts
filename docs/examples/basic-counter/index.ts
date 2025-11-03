#!/usr/bin/env tsx

import { StateChart } from '../../../dist/index.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

/**
 * Basic Counter Example with Data Persistence
 *
 * This tool demonstrates a simple statechart that:
 * 1. Reads existing counter data from a JSON file (if it exists)
 * 2. Initializes the statechart with the existing data or defaults
 * 3. Runs the statechart to increment the counter
 * 4. Saves the updated statechart data back to the JSON file
 */

// Define the counter data interface
interface CounterData {
  count: number;
  lastIncrement: string | null;
  totalExecutions: number;
  [key: string]: unknown; // Allow additional properties for compatibility
}

// Define the complete state interface
interface CounterState {
  data: any;
  _datamodel: 'ecmascript';
}

/**
 * Prompts the user to run the counter again using readline
 * @returns Promise<boolean> - true if user wants to run again, false otherwise
 */
async function promptUserRunAgain(): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Configure stdin to read single characters
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const askQuestion = () => {
      process.stdout.write('\n🔄 Run counter again? (y/N): ');

      const onData = (key: string) => {
        const char = key.toLowerCase();

        if (char === 'y') {
          process.stdout.write('y\n');
          cleanup();
          resolve(true);
        } else if (char === 'n' || char === '\r' || char === '\n') {
          process.stdout.write('n\n');
          cleanup();
          resolve(false);
        } else if (char === '\u0003') { // Ctrl+C
          process.stdout.write('\n');
          cleanup();
          process.exit(0);
        } else {
          process.stdout.write(`\n❌ Invalid input '${key}'. Please enter 'y' for yes or 'n' for no.\n`);
          askQuestion(); // Re-prompt
        }
      };

      const cleanup = () => {
        process.stdin.removeListener('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        rl.close();
      };

      process.stdin.on('data', onData);
    };

    askQuestion();
  });
}

async function main() {
  const dataFilePath = join(__dirname, 'counter-data.json');

  console.log('🔢 Basic Counter Example with Data Persistence');
  console.log('='.repeat(50));

  try {
    let fileContent = '{}';

    // Step 1: Read existing data from JSON file (or use defaults)
    let existingData: CounterData = {
      count: 0,
      lastIncrement: null,
      totalExecutions: 0
    };

    if (existsSync(dataFilePath)) {
      console.log('📖 Reading existing counter data from file...');
      fileContent = readFileSync(dataFilePath, 'utf-8');
    } else {
      console.log('📄 No existing data file found, starting with defaults');
    }

    console.log('');

    // Step 2: Load the statechart XML and pass in persistence data
    const xmlPath = join(__dirname, 'statechart.xml');
    const xmlContent = readFileSync(xmlPath, 'utf-8');

    let stateChart: StateChart  = StateChart.fromXML(xmlContent, {
      persistence: fileContent
    });
    
    // Step 3: Initialize the StateChart with existing data
    const initialState: CounterState = {
      data: stateChart.data,
      _datamodel: 'ecmascript'
    };

    console.log('⚙️  Executing statechart...');

    // Step 4: Trigger state change with an event
    stateChart.addEvent({
      name: 'count',
      type: 'external',
      sendid: '',
      origin: '',
      origintype: '',
      invokeid: '',
      data: {}
    })

    // Step 5: Start processing the events
    const result = await stateChart.execute(initialState);

    console.log([
      '',
      '✅ Statechart execution completed',
      `   Current State: ${stateChart.state.join(',')}`,
      ''
    ].join('\n'));

    // Step 6: Display the results
    const updatedData = result.data as unknown as CounterData;
    console.log('📊 Updated Counter Data:');
    console.log(`   Count: ${updatedData.count}`);
    console.log(`   Last increment: ${updatedData.lastIncrement}`);
    console.log(`   Total executions: ${updatedData.totalExecutions}`);
    console.log('');

    // Step 7: Save the updated state back to the JSON file
    writeFileSync(dataFilePath, JSON.stringify(stateChart, null, 2), 'utf-8');
    console.log(`💾 Counter data saved to: ${dataFilePath}`);
    console.log('');

    // Step 8: Show the increment
    const increment = updatedData.count - initialState.data.count;
    if (increment > 0) {
      console.log(`🎉 Counter incremented by ${increment}!`);
    } else {
      console.log('ℹ️  Counter value unchanged');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function runLoop() {
  let runAgain = true;

  try {
    while (runAgain) {
      console.clear();
      await main();
      runAgain = await promptUserRunAgain();
    }

    console.log('\n👋 Goodbye!');
  } catch (err) {
    console.error('Unhandled error:', err);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  runLoop().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}