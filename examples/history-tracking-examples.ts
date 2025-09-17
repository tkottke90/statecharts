/**
 * State Execution History - Usage Examples
 * 
 * This file demonstrates various ways to use the State Execution History system
 * for debugging, monitoring, and visualizing SCXML state machine execution.
 */

import { StateChart } from '../src/statechart';
import { HistoryEventType, HistoryTrackingOptions } from '../src/models/history';

// Example 1: Basic History Tracking Setup
export function basicHistorySetup() {
  const xmlString = `
    <scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript">
      <state id="idle">
        <transition event="start" target="active"/>
      </state>
      <state id="active">
        <onentry>
          <assign location="startTime" expr="Date.now()"/>
        </onentry>
        <transition event="stop" target="idle"/>
        <transition event="error" target="error"/>
      </state>
      <state id="error">
        <transition event="reset" target="idle"/>
      </state>
    </scxml>
  `;

  // Create StateChart with history tracking enabled
  const stateChart = StateChart.fromXMLWithOptions(xmlString, {
    history: {
      enabled: true,
      maxEntries: 1000,
      includeInternalState: true,
      trackTiming: true,
      trackCausality: true,
    }
  });

  return stateChart;
}

// Example 2: Real-time History Monitoring
export function realTimeMonitoring() {
  const stateChart = basicHistorySetup();
  const history = stateChart.getHistory();

  // Listen for all history events
  history.on('history', (payload) => {
    const { entry, totalEntries } = payload;
    
    console.log(`[${new Date(entry.timestamp).toISOString()}] ${entry.type}`);
    
    switch (entry.type) {
      case HistoryEventType.STATE_ENTRY:
        console.log(`  → Entered state: ${entry.metadata.enteredState}`);
        break;
      case HistoryEventType.STATE_EXIT:
        console.log(`  ← Exited state: ${entry.metadata.exitedState}`);
        break;
      case HistoryEventType.EVENT_PROCESSED:
        console.log(`  📨 Processed event: ${entry.event?.name}`);
        break;
      case HistoryEventType.ERROR:
        console.log(`  ❌ Error: ${entry.error?.message}`);
        break;
    }
    
    if (entry.duration) {
      console.log(`  ⏱️  Duration: ${entry.duration}ms`);
    }
    
    console.log(`  📊 Total entries: ${totalEntries}`);
  });

  // Listen for memory management events
  history.on('pruned', (data) => {
    console.log(`🧹 Pruned ${data.removedCount} old entries to manage memory`);
  });

  return { stateChart, history };
}

// Example 3: Performance Analysis
export async function performanceAnalysis() {
  const stateChart = basicHistorySetup();
  const history = stateChart.getHistory();

  // Execute some state machine operations
  await stateChart.execute({ data: {} });
  stateChart.sendEvent('start');
  await new Promise(resolve => setTimeout(resolve, 100));
  stateChart.sendEvent('stop');
  await new Promise(resolve => setTimeout(resolve, 50));

  // Analyze performance
  const stats = history.getStats();
  console.log('📈 Performance Statistics:');
  console.log(`  Total entries: ${stats.totalEntries}`);
  console.log(`  Memory usage: ${(stats.memoryUsage / 1024).toFixed(2)} KB`);
  console.log(`  Execution timespan: ${stats.newestEntry - stats.oldestEntry}ms`);

  // Find slow operations
  const slowOperations = history.getAllEntries()
    .filter(entry => entry.duration && entry.duration > 10)
    .sort((a, b) => (b.duration || 0) - (a.duration || 0));

  console.log('\n🐌 Slowest Operations:');
  slowOperations.slice(0, 5).forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.type}: ${entry.duration}ms`);
  });

  // Analyze event types
  console.log('\n📊 Events by Type:');
  Object.entries(stats.entriesByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

// Example 4: Debugging State Transitions
export function debugStateTransitions() {
  const stateChart = basicHistorySetup();
  const history = stateChart.getHistory();

  // Helper function to trace execution path
  function traceExecutionPath() {
    const stateEntries = history.query({
      eventTypes: [HistoryEventType.STATE_ENTRY, HistoryEventType.STATE_EXIT],
      sortOrder: 'asc'
    });

    console.log('🔍 State Transition Trace:');
    stateEntries.entries.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toISOString();
      const stateName = entry.metadata.enteredState || entry.metadata.exitedState;
      const action = entry.type === HistoryEventType.STATE_ENTRY ? 'ENTER' : 'EXIT';
      
      console.log(`  ${index + 1}. [${timestamp}] ${action} ${stateName}`);
      
      if (entry.duration) {
        console.log(`     Duration: ${entry.duration}ms`);
      }
    });
  }

  // Helper function to find problematic transitions
  function findProblematicTransitions() {
    const errors = history.query({
      eventTypes: [HistoryEventType.ERROR]
    });

    if (errors.entries.length > 0) {
      console.log('\n❌ Errors Found:');
      errors.entries.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.error?.message}`);
        console.log(`     State: ${entry.stateConfiguration.join(', ')}`);
        console.log(`     Time: ${new Date(entry.timestamp).toISOString()}`);
      });
    } else {
      console.log('\n✅ No errors found in execution history');
    }
  }

  return { traceExecutionPath, findProblematicTransitions };
}

// Example 5: Custom Query Patterns
export function customQueryPatterns() {
  const stateChart = basicHistorySetup();
  const history = stateChart.getHistory();

  // Query 1: Find all events in a specific time window
  function getEventsInTimeWindow(startTime: number, endTime: number) {
    return history.query({
      timeRange: { start: startTime, end: endTime },
      sortOrder: 'asc'
    });
  }

  // Query 2: Get events for a specific state
  function getEventsForState(stateName: string) {
    return history.query({
      stateFilter: stateName,
      eventTypes: [HistoryEventType.STATE_ENTRY, HistoryEventType.STATE_EXIT]
    });
  }

  // Query 3: Find events matching a pattern
  function getEventsByPattern(pattern: RegExp) {
    return history.query({
      eventNamePattern: pattern
    });
  }

  // Query 4: Get paginated results
  function getPaginatedHistory(page: number, pageSize: number) {
    return history.query({
      limit: pageSize,
      offset: page * pageSize,
      sortOrder: 'desc'
    });
  }

  // Query 5: Get causality chain for a specific entry
  function getCausalityChain(entryId: string) {
    const entry = history.getEntry(entryId);
    if (!entry) return null;

    const chain = [entry];
    
    // Get parent chain
    let currentEntry = entry;
    while (currentEntry.parentId) {
      const parent = history.getEntry(currentEntry.parentId);
      if (parent) {
        chain.unshift(parent);
        currentEntry = parent;
      } else {
        break;
      }
    }

    // Get children
    function addChildren(parentEntry: any, level = 0) {
      parentEntry.childIds.forEach((childId: string) => {
        const child = history.getEntry(childId);
        if (child) {
          chain.push({ ...child, level });
          addChildren(child, level + 1);
        }
      });
    }

    addChildren(entry, 1);
    return chain;
  }

  return {
    getEventsInTimeWindow,
    getEventsForState,
    getEventsByPattern,
    getPaginatedHistory,
    getCausalityChain
  };
}

// Example 6: Production Monitoring Setup
export function productionMonitoringSetup() {
  // Optimized configuration for production use
  const productionHistoryOptions: HistoryTrackingOptions = {
    enabled: true,
    maxEntries: 100,                    // Smaller buffer for production
    includeInternalState: false,        // Reduce memory usage
    trackTiming: true,                  // Keep timing for performance monitoring
    trackCausality: false,              // Disable causality to save memory
    trackedEventTypes: [                // Track only essential events
      HistoryEventType.STATE_ENTRY,
      HistoryEventType.STATE_EXIT,
      HistoryEventType.ERROR,
      HistoryEventType.EVENT_PROCESSED
    ]
  };

  const xmlString = `
    <scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript">
      <state id="operational">
        <transition event="error" target="error"/>
      </state>
      <state id="error">
        <transition event="recover" target="operational"/>
      </state>
    </scxml>
  `;

  const stateChart = StateChart.fromXMLWithOptions(xmlString, {
    history: productionHistoryOptions
  });

  const history = stateChart.getHistory();

  // Set up production monitoring
  history.on('history', (payload) => {
    const { entry } = payload;
    
    // Log errors to monitoring system
    if (entry.type === HistoryEventType.ERROR) {
      console.error('State machine error:', {
        error: entry.error?.message,
        state: entry.stateConfiguration,
        timestamp: entry.timestamp
      });
      
      // Send to monitoring service (e.g., Sentry, DataDog, etc.)
      // monitoringService.captureError(entry.error, {
      //   context: 'state-machine',
      //   state: entry.stateConfiguration,
      //   timestamp: entry.timestamp
      // });
    }

    // Track performance metrics
    if (entry.duration && entry.duration > 1000) { // > 1 second
      console.warn('Slow state machine operation:', {
        type: entry.type,
        duration: entry.duration,
        state: entry.stateConfiguration
      });
    }
  });

  // Periodic health check
  setInterval(() => {
    const stats = history.getStats();
    console.log('State machine health:', {
      totalEntries: stats.totalEntries,
      memoryUsage: stats.memoryUsage,
      errorCount: stats.entriesByType[HistoryEventType.ERROR] || 0
    });
  }, 60000); // Every minute

  return { stateChart, history };
}

// Example 7: History Export/Import for Testing
export function historyExportImportExample() {
  const stateChart = basicHistorySetup();
  const history = stateChart.getHistory();

  // Function to save history to file (Node.js)
  function saveHistoryToFile(filename: string) {
    const fs = require('fs');
    const path = require('path');

    try {
      const exportedHistory = history.export();
      const fullPath = path.resolve(filename);

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, JSON.stringify(exportedHistory, null, 2));
      console.log(`History saved to ${fullPath}`);
      console.log(`Exported ${exportedHistory.length} history entries`);
    } catch (error) {
      console.error(`Failed to save history to ${filename}:`, error.message);
    }
  }

  // Function to load history from file
  function loadHistoryFromFile(filename: string) {
    const fs = require('fs');
    const path = require('path');

    try {
      const fullPath = path.resolve(filename);

      if (!fs.existsSync(fullPath)) {
        console.warn(`History file not found: ${fullPath}`);
        return;
      }

      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const exportedHistory = JSON.parse(fileContent);

      history.clear(); // Clear existing history
      history.import(exportedHistory);

      console.log(`History loaded from ${fullPath}`);
      console.log(`Imported ${exportedHistory.length} history entries`);
    } catch (error) {
      console.error(`Failed to load history from ${filename}:`, error.message);
    }
  }

  // Async versions for better performance
  async function saveHistoryToFileAsync(filename: string) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const exportedHistory = history.export();
      const fullPath = path.resolve(filename);

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(fullPath, JSON.stringify(exportedHistory, null, 2));
      console.log(`History saved to ${fullPath}`);
      console.log(`Exported ${exportedHistory.length} history entries`);
    } catch (error) {
      console.error(`Failed to save history to ${filename}:`, error.message);
    }
  }

  async function loadHistoryFromFileAsync(filename: string) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const fullPath = path.resolve(filename);
      const fileContent = await fs.readFile(fullPath, 'utf8');
      const exportedHistory = JSON.parse(fileContent);

      history.clear(); // Clear existing history
      history.import(exportedHistory);

      console.log(`History loaded from ${fullPath}`);
      console.log(`Imported ${exportedHistory.length} history entries`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`History file not found: ${filename}`);
      } else {
        console.error(`Failed to load history from ${filename}:`, error.message);
      }
    }
  }

  // Function to compare two history exports
  function compareHistoryExports(export1: any[], export2: any[]) {
    if (export1.length !== export2.length) {
      console.log(`Different lengths: ${export1.length} vs ${export2.length}`);
      return false;
    }

    for (let i = 0; i < export1.length; i++) {
      const entry1 = export1[i];
      const entry2 = export2[i];

      if (entry1.type !== entry2.type || entry1.timestamp !== entry2.timestamp) {
        console.log(`Difference at index ${i}:`, { entry1, entry2 });
        return false;
      }
    }

    console.log('History exports are identical');
    return true;
  }

  // Function to backup history with timestamp
  function backupHistoryWithTimestamp(baseFilename: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${baseFilename}-${timestamp}.json`;
    saveHistoryToFile(backupFilename);
    return backupFilename;
  }

  // Function to list available history files
  function listHistoryFiles(directory: string = './') {
    const fs = require('fs');
    const path = require('path');

    try {
      const files = fs.readdirSync(directory)
        .filter((file: string) => file.endsWith('.json') && file.includes('history'))
        .map((file: string) => {
          const fullPath = path.join(directory, file);
          const stats = fs.statSync(fullPath);
          return {
            filename: file,
            path: fullPath,
            size: stats.size,
            modified: stats.mtime
          };
        })
        .sort((a: any, b: any) => b.modified.getTime() - a.modified.getTime());

      console.log('Available history files:');
      files.forEach((file: any, index: number) => {
        console.log(`  ${index + 1}. ${file.filename} (${file.size} bytes, ${file.modified.toISOString()})`);
      });

      return files;
    } catch (error) {
      console.error(`Failed to list history files in ${directory}:`, error.message);
      return [];
    }
  }

  return {
    saveHistoryToFile,
    loadHistoryFromFile,
    saveHistoryToFileAsync,
    loadHistoryFromFileAsync,
    compareHistoryExports,
    backupHistoryWithTimestamp,
    listHistoryFiles
  };
}

// Example usage demonstration
export async function demonstrateHistoryTracking() {
  console.log('🚀 Starting State Execution History Demonstration\n');

  // 1. Basic setup
  console.log('1. Setting up basic history tracking...');
  const { stateChart, history } = realTimeMonitoring();

  // 2. Execute some operations
  console.log('\n2. Executing state machine operations...');
  await stateChart.execute({ data: { counter: 0 } });
  stateChart.sendEvent('start');
  await new Promise(resolve => setTimeout(resolve, 50));
  stateChart.sendEvent('stop');

  // 3. Performance analysis
  console.log('\n3. Analyzing performance...');
  await performanceAnalysis();

  // 4. Debug transitions
  console.log('\n4. Debugging state transitions...');
  const { traceExecutionPath, findProblematicTransitions } = debugStateTransitions();
  traceExecutionPath();
  findProblematicTransitions();

  // 5. Demonstrate file system operations
  console.log('\n5. Demonstrating history export/import...');
  const {
    saveHistoryToFile,
    loadHistoryFromFile,
    saveHistoryToFileAsync,
    loadHistoryFromFileAsync,
    backupHistoryWithTimestamp,
    listHistoryFiles
  } = historyExportImportExample();

  // Save current history
  const historyFile = './demo-history.json';
  saveHistoryToFile(historyFile);

  // Create a backup with timestamp
  const backupFile = backupHistoryWithTimestamp('./demo-history-backup');

  // List available history files
  listHistoryFiles('./');

  // Demonstrate async operations
  console.log('\n6. Demonstrating async file operations...');
  await saveHistoryToFileAsync('./demo-history-async.json');

  // Clear history and reload from file
  history.clear();
  console.log('History cleared, entries:', history.getAllEntries().length);

  await loadHistoryFromFileAsync('./demo-history-async.json');
  console.log('History reloaded, entries:', history.getAllEntries().length);

  console.log('\n✅ History tracking demonstration complete!');
}

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateHistoryTracking().catch(console.error);
}
