# Getting Started with Statecharts

This guide will walk you through the essential steps to get up and running with the TypeScript statecharts library. You'll learn how to install the library, create your first state machine, and execute it in your application.

## Overview

The statecharts library provides a complete implementation of the [W3C SCXML specification](https://www.w3.org/TR/scxml/) for TypeScript/JavaScript applications. It allows you to define complex state machines using XML and execute them with full SCXML compliance.

**Key Features:**
- 🎯 **SCXML Compliant** - Full implementation of W3C SCXML specification
- 🔧 **TypeScript Support** - Complete type safety and IntelliSense
- 🚀 **Easy Integration** - Simple 4-step setup process
- 📊 **Event-Driven** - Robust event processing and state transitions
- 🧪 **Well Tested** - Comprehensive test coverage

## Quick Start (4 Steps)

### Step 1: Install the Module

Install the statecharts library using npm:

```bash
npm install statecharts
```

**Requirements:**
- Node.js >= 20.0.0
- TypeScript (recommended for type safety)

### Step 2: Create Your XML State Machine

Define your state machine using SCXML XML format. Here's a simple example:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<scxml version="1.0" datamodel="ecmascript" initial="idle">
  <datamodel>
    <data id="counter" expr="0"/>
    <data id="message">Hello World</data>
  </datamodel>
  
  <state id="idle">
    <onentry>
      <assign location="message" expr="'System is idle'"/>
    </onentry>
    <transition event="start" target="active"/>
  </state>
  
  <state id="active">
    <onentry>
      <assign location="message" expr="'System is running'"/>
    </onentry>
    <transition event="increment" target="active">
      <assign location="counter" expr="counter + 1"/>
    </transition>
    <transition event="stop" target="idle"/>
  </state>
</scxml>
```

### Step 3: Parse XML with StateChart.fromXML

Import the library and parse your XML string:

```typescript
import { StateChart } from 'statecharts';

// Your XML state machine definition
const xmlString = `
  <scxml version="1.0" datamodel="ecmascript" initial="idle">
    <datamodel>
      <data id="counter" expr="0"/>
      <data id="message">Hello World</data>
    </datamodel>
    
    <state id="idle">
      <onentry>
        <assign location="message" expr="'System is idle'"/>
      </onentry>
      <transition event="start" target="active"/>
    </state>
    
    <state id="active">
      <onentry>
        <assign location="message" expr="'System is running'"/>
      </onentry>
      <transition event="increment" target="active">
        <assign location="counter" expr="counter + 1"/>
      </transition>
      <transition event="stop" target="idle"/>
    </state>
  </scxml>
`;

// Parse the XML into a StateChart instance
const stateChart = StateChart.fromXML(xmlString);
```

### Step 4: Execute the State Machine

Start the state machine by calling the `execute` method:

```typescript
async function runStateMachine() {
  try {
    // Define initial state data
    const initialState = {
      data: {},  // Will be populated by datamodel
      _datamodel: 'ecmascript'
    };

    // Execute the state machine
    const result = await stateChart.execute(initialState);
    
    // Check the results
    console.log('Final state data:', result.data);
    // Output: { counter: 0, message: 'System is idle' }
    
    console.log('State machine executed successfully!');
  } catch (error) {
    console.error('State machine execution failed:', error);
  }
}

runStateMachine();
```

## Complete Working Example

Here's a complete, runnable example that demonstrates all four steps:

```typescript
import { StateChart } from 'statecharts';

// Step 2: Define XML state machine
const trafficLightXML = `
  <scxml version="1.0" datamodel="ecmascript" initial="red">
    <datamodel>
      <data id="currentColor">red</data>
      <data id="duration" expr="0"/>
    </datamodel>
    
    <state id="red">
      <onentry>
        <assign location="currentColor" expr="'red'"/>
        <assign location="duration" expr="5000"/>
      </onentry>
      <transition event="timer" target="green"/>
    </state>
    
    <state id="green">
      <onentry>
        <assign location="currentColor" expr="'green'"/>
        <assign location="duration" expr="3000"/>
      </onentry>
      <transition event="timer" target="yellow"/>
    </state>
    
    <state id="yellow">
      <onentry>
        <assign location="currentColor" expr="'yellow'"/>
        <assign location="duration" expr="1000"/>
      </onentry>
      <transition event="timer" target="red"/>
    </state>
  </scxml>
`;

async function trafficLightDemo() {
  // Step 3: Parse XML with StateChart.fromXML
  const stateChart = StateChart.fromXML(trafficLightXML);
  
  // Step 4: Execute the state machine
  const initialState = {
    data: {},
    _datamodel: 'ecmascript'
  };
  
  let currentState = await stateChart.execute(initialState);
  console.log('Initial:', currentState.data);
  // Output: { currentColor: 'red', duration: 5000 }
  
  // Send events to trigger transitions
  stateChart.sendEventByName('timer');
  currentState = await stateChart.macrostep(currentState);
  console.log('After timer 1:', currentState.data);
  // Output: { currentColor: 'green', duration: 3000 }
  
  stateChart.sendEventByName('timer');
  currentState = await stateChart.macrostep(currentState);
  console.log('After timer 2:', currentState.data);
  // Output: { currentColor: 'yellow', duration: 1000 }
  
  stateChart.sendEventByName('timer');
  currentState = await stateChart.macrostep(currentState);
  console.log('After timer 3:', currentState.data);
  // Output: { currentColor: 'red', duration: 5000 }
}

trafficLightDemo().catch(console.error);
```

## Working with Events

After your state machine is running, you can send events to trigger transitions:

### Sending Events by Name

```typescript
// Simple event
stateChart.sendEventByName('start');

// Event with data
stateChart.sendEventByName('userInput', { 
  username: 'john', 
  action: 'login' 
});

// Process the events
const newState = await stateChart.macrostep(currentState);
```

### Sending Event Objects

```typescript
import { SCXMLEvent } from 'statecharts';

// Create a complete event object
const customEvent: SCXMLEvent = {
  name: 'customEvent',
  type: 'external',
  sendid: '',
  origin: '',
  origintype: '',
  invokeid: '',
  data: { 
    timestamp: Date.now(),
    source: 'user-interface'
  }
};

// Add to event queue
stateChart.addEvent(customEvent);

// Process the event
const newState = await stateChart.macrostep(currentState);
```

## Error Handling

Always wrap state machine operations in try-catch blocks:

```typescript
async function safeExecution() {
  try {
    const stateChart = StateChart.fromXML(xmlString);
    const result = await stateChart.execute(initialState);
    console.log('Success:', result.data);
  } catch (error) {
    if (error.message.includes('Invalid Format')) {
      console.error('XML parsing error:', error.message);
    } else if (error.message.includes('Could not parse')) {
      console.error('State machine creation error:', error.message);
    } else {
      console.error('Execution error:', error);
    }
  }
}
```

## Common Patterns

### Loading XML from Files

```typescript
import { readFileSync } from 'fs';
import { StateChart } from 'statecharts';

// Load XML from file
const xmlContent = readFileSync('./state-machine.xml', 'utf8');
const stateChart = StateChart.fromXML(xmlContent);
```

### State Machine with Timeouts

```typescript
const timerXML = `
  <scxml version="1.0" initial="waiting">
    <state id="waiting">
      <transition event="timeout" target="expired"/>
      <transition event="complete" target="finished"/>
    </state>
    <state id="expired">
      <!-- Handle timeout -->
    </state>
    <final id="finished"/>
  </scxml>
`;

const stateChart = StateChart.fromXML(timerXML);

// Execute with timeout option
const result = await stateChart.execute(
  { data: {}, _datamodel: 'ecmascript' },
  { timeout: 5000 } // 5 second timeout
);
```

### Parallel State Processing

```typescript
const parallelXML = `
  <scxml version="1.0" initial="running">
    <state id="running">
      <parallel id="systems">
        <state id="audio">
          <transition event="mute" target="muted"/>
          <state id="muted">
            <transition event="unmute" target="audio"/>
          </state>
        </state>
        <state id="video">
          <transition event="pause" target="paused"/>
          <state id="paused">
            <transition event="play" target="video"/>
          </state>
        </state>
      </parallel>
    </state>
  </scxml>
`;

const stateChart = StateChart.fromXML(parallelXML);
const result = await stateChart.execute({ data: {}, _datamodel: 'ecmascript' });

// Both audio and video systems run in parallel
stateChart.sendEventByName('mute');   // Affects only audio
stateChart.sendEventByName('pause');  // Affects only video
```

## Best Practices

### 1. XML Structure

- Always include `version` and `datamodel` attributes
- Use meaningful state and event names
- Keep state machines focused and not overly complex
- Use comments to document complex logic

### 2. Error Handling

```typescript
async function robustExecution(xmlString: string) {
  try {
    // Validate XML structure first
    if (!xmlString.includes('<scxml')) {
      throw new Error('Invalid SCXML: Missing root element');
    }

    const stateChart = StateChart.fromXML(xmlString);
    const result = await stateChart.execute({
      data: {},
      _datamodel: 'ecmascript'
    });

    return { success: true, data: result.data };
  } catch (error) {
    console.error('State machine error:', error);
    return { success: false, error: error.message };
  }
}
```

### 3. Performance Considerations

- Keep data models lightweight
- Avoid deeply nested state hierarchies
- Use parallel states judiciously
- Monitor memory usage with large state machines

### 4. Testing

```typescript
import { StateChart } from 'statecharts';

describe('State Machine Tests', () => {
  let stateChart: StateChart;

  beforeEach(() => {
    stateChart = StateChart.fromXML(xmlString);
  });

  it('should initialize correctly', async () => {
    const result = await stateChart.execute({
      data: {},
      _datamodel: 'ecmascript'
    });

    expect(result.data).toBeDefined();
    expect(result._datamodel).toBe('ecmascript');
  });

  it('should handle events correctly', async () => {
    let state = await stateChart.execute({
      data: {},
      _datamodel: 'ecmascript'
    });

    stateChart.sendEventByName('start');
    state = await stateChart.macrostep(state);

    expect(state.data.message).toBe('System is running');
  });
});
```

## Next Steps

Now that you have the basics working, explore these advanced topics:

### 📚 **Core Documentation**
- **[SCXML Nodes](../src/nodes/README.md)** - Complete reference for all available SCXML elements
- **[Model Classes](../src/models/README.md)** - Understanding the underlying architecture
- **[Error Handling](../src/errors/Errors.md)** - Comprehensive error handling guide

### 🔧 **Advanced Features**
- **[State Node](../src/nodes/state.md)** - Advanced state configuration and hierarchies
- **[Transition Node](../src/nodes/transition.md)** - Complex transition logic and conditions
- **[Parallel Node](../src/nodes/parallel.md)** - Concurrent state processing
- **[Data Management](../src/nodes/datamodel.md)** - Working with data models and variables

### 🎯 **Specific Use Cases**
- **[Assign Node](../src/nodes/assign.md)** - Variable assignment and data manipulation
- **[Raise Node](../src/nodes/raise.md)** - Internal event generation
- **[OnEntry/OnExit](../src/nodes/onentry.md)** - State lifecycle actions

### 📖 **Standards and Specifications**
- **[W3C SCXML Specification](https://www.w3.org/TR/scxml/)** - Official SCXML standard
- **[SCXML Tutorial](https://www.w3.org/TR/scxml/#tutorial)** - W3C's official tutorial

## Support and Community

- **Issues**: Report bugs and request features on GitHub
- **Documentation**: All documentation is available in the repository
- **Examples**: Check the `docs/` directory for more examples
- **Testing**: Run `npm test` to see comprehensive test examples

Happy state machine building! 🎉
