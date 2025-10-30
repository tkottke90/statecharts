# Basic Counter Example with Data Persistence

This example demonstrates the fundamental concepts of the statecharts library through a simple counter application that persists data between runs. It's perfect for developers who are new to statecharts and want to understand the core concepts.

## What This Example Does

The basic example creates a statechart that:

1. **Reads existing data** from a JSON file (if it exists)
2. **Initializes the statechart** with the existing data or defaults
3. **Executes the statechart** to increment a counter
4. **Saves the updated data** back to the JSON file
5. **Displays the results** with helpful console output

Each time you run the example, the counter increments by 1 and the execution count increases, demonstrating how statecharts can maintain state across multiple runs.

## Key Concepts Demonstrated

### 🎯 SCXML State Machine Definition
The example uses a simple XML file (`statechart.xml`) that defines:
- **Data model**: Variables for `count`, `lastIncrement`, and `totalExecutions`
- **States**: A single `counter` state and a `done` final state
- **Entry actions**: Logic that runs when entering the counter state
- **Transitions**: Automatic progression from counter to done state

### 💾 Data Persistence
Shows how to:
- Read existing statechart data from JSON files
- Initialize statecharts with pre-existing data
- Save statechart results back to persistent storage
- Handle cases where no previous data exists

### 🔄 State Execution
Demonstrates:
- Loading XML statechart definitions
- Creating StateChart instances from XML
- Executing statecharts with initial data
- Handling execution results and timeouts

## Files in This Example

- **`index.ts`** - Main TypeScript application that orchestrates the example
- **`statechart.xml`** - SCXML state machine definition
- **`test-simple.xml`** - Alternative simple statechart for testing
- **`counter-data.json`** - Generated file that stores persistent counter data

## Running the Example

### Prerequisites

Make sure you have the statecharts library installed and built:

```bash
# From the repository root
npm install
npm run build
```

### Execute the Example

```bash
# Navigate to the basic example directory
cd docs/examples/basic

# Run the example
npx tsx index.ts
```

### Expected Output

On first run:
```
🔢 Basic Counter Example with Data Persistence
==================================================
📄 No existing data file found, starting with defaults

⚙️  Executing statechart...
✅ Statechart execution completed

📊 Updated Counter Data:
   Count: 1
   Last increment: 2024-10-28T10:30:45.123Z
   Total executions: 1

💾 Counter data saved to: /path/to/counter-data.json

🎉 Counter incremented by 1!

Run this command again to increment the counter further.
```

On subsequent runs:
```
🔢 Basic Counter Example with Data Persistence
==================================================
📖 Reading existing counter data from file...
   Previous count: 1
   Last increment: 2024-10-28T10:30:45.123Z
   Total executions: 1

⚙️  Executing statechart...
✅ Statechart execution completed

📊 Updated Counter Data:
   Count: 2
   Last increment: 2024-10-28T10:31:12.456Z
   Total executions: 2

💾 Counter data saved to: /path/to/counter-data.json

🎉 Counter incremented by 1!

Run this command again to increment the counter further.
```

## Understanding the Statechart XML

<augment_code_snippet path="docs/examples/basic/statechart.xml" mode="EXCERPT">
````xml
<scxml version="1.0" datamodel="ecmascript" initial="counter">
  <datamodel>
    <data id="count" expr="0" />
    <data id="lastIncrement" expr="null" />
    <data id="totalExecutions" expr="0" />
  </datamodel>

  <state id="counter">
    <onentry>
      <assign location="count" expr="data.count + 1" />
      <assign location="lastIncrement" expr="new Date().toISOString()" />
      <assign location="totalExecutions" expr="data.totalExecutions + 1" />
      <raise event="increment.complete" />
    </onentry>
    <transition event="increment.complete" target="done" />
  </state>

  <final id="done" />
</scxml>
````
</augment_code_snippet>

### Key Elements Explained

- **`<datamodel>`**: Defines the data variables available to the statechart
- **`<data>`**: Individual data variables with initial values
- **`<state>`**: Defines a state in the state machine
- **`<onentry>`**: Actions that execute when entering a state
- **`<assign>`**: Updates data variables with new values
- **`<raise>`**: Triggers an internal event
- **`<transition>`**: Defines how to move between states
- **`<final>`**: A terminal state that ends execution

## Understanding the TypeScript Code

The main application follows this pattern:

1. **Read existing data** from JSON file or use defaults
2. **Load the XML** statechart definition
3. **Create StateChart instance** from XML
4. **Execute the statechart** with initial state
5. **Process the results** and save back to JSON

<augment_code_snippet path="docs/examples/basic/index.ts" mode="EXCERPT">
````typescript
// Load the statechart XML
const xmlContent = readFileSync(xmlPath, 'utf-8');
const stateChart = StateChart.fromXML(xmlContent);

// Execute with initial state
const result = await stateChart.execute(initialState, {
  timeout: 5000,
});
````
</augment_code_snippet>

## Next Steps

After understanding this basic example, you might want to explore:

1. **[Event-Driven Example](../event-driven/)** - Learn how to handle external events
2. **[Tic-Tac-Toe Example](../tic-tac-toe/)** - See a more complex interactive application
3. **[Getting Started Guide](../../Getting_Started.md)** - Comprehensive library documentation

## Troubleshooting

### Common Issues

**Error: "Cannot find module"**
- Make sure you've run `npm run build` from the repository root
- Verify the `dist/` directory exists with compiled JavaScript files

**Error: "Permission denied"**
- Ensure the example directory is writable for creating `counter-data.json`

**Timeout errors**
- The example uses a 5-second timeout; complex statecharts might need longer

### Getting Help

If you encounter issues:
1. Check the main [README](../../../README.md) for installation instructions
2. Review the [Getting Started guide](../../Getting_Started.md)
3. Look at other examples for different patterns
4. File an issue on the project repository
