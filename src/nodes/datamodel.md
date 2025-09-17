# DataModel Node

The `<datamodel>` element is a container node that holds data declarations for the state machine. It serves as the root container for `<data>` elements that define the initial state of the data model.

## Overview

The DataModel node is a fundamental component of SCXML that defines the data model structure and initial values for a state machine. It acts as a container for `<data>` elements, which declare individual data variables with their initial values, types, and sources.

The DataModel node extends BaseNode and enables child execution, allowing it to process all contained `<data>` elements during state machine initialization. This ensures that all data variables are properly initialized before the state machine begins execution.

Unlike executable content nodes, the DataModel node is primarily a structural container that organizes data declarations and coordinates their initialization.

### Children

The `children` array typically contains `<data>` elements that define individual data variables. Each data element specifies:

- Variable identifier (`id`)
- Initial value (`expr` or content)
- Data type (`type`)
- External source (`src`)

## Usage Examples

### Basic Data Model

```xml
<scxml version="1.0" datamodel="ecmascript" initial="main">
  <datamodel>
    <data id="counter" expr="0"/>
    <data id="message">Hello World</data>
    <data id="isActive" expr="false"/>
  </datamodel>

  <state id="main">
    <transition event="increment" target="main">
      <assign location="counter" expr="counter + 1"/>
    </transition>
  </state>
</scxml>
```

### Complex Data Structures

```xml
<scxml version="1.0" datamodel="ecmascript" initial="application">
  <datamodel>
    <data id="user" expr="{ name: '', email: '', role: 'guest' }"/>
    <data id="settings" expr="{ theme: 'light', notifications: true }"/>
    <data id="session" expr="{ startTime: Date.now(), timeout: 3600000 }"/>
    <data id="cache" expr="new Map()"/>
  </datamodel>

  <state id="application">
    <!-- Application logic -->
  </state>
</scxml>
```

### Game State Data Model

```xml
<scxml version="1.0" datamodel="ecmascript" initial="gameRunning">
  <datamodel>
    <data id="playerHealth" expr="100"/>
    <data id="playerScore" expr="0"/>
    <data id="gameTime" expr="0"/>
    <data id="powerUpActive" expr="false"/>
    <data id="level" expr="1"/>
    <data id="inventory" expr="[]"/>
  </datamodel>

  <state id="gameRunning">
    <parallel id="gameSystems">
      <!-- Game systems that use the data model -->
    </parallel>
  </state>
</scxml>
```

### Application Configuration

```xml
<scxml version="1.0" datamodel="ecmascript" initial="startup">
  <datamodel>
    <data id="appVersion">1.0.0</data>
    <data id="apiEndpoint">https://api.example.com</data>
    <data id="maxRetries" expr="3"/>
    <data id="timeout" expr="5000"/>
    <data id="features" expr="{ darkMode: true, analytics: false }"/>
  </datamodel>

  <state id="startup">
    <onentry>
      <assign location="startupTime" expr="Date.now()"/>
    </onentry>
    <transition event="initialized" target="running"/>
  </state>

  <state id="running">
    <!-- Application logic -->
  </state>
</scxml>
```

### Nested Data Models

```xml
<scxml version="1.0" datamodel="ecmascript" initial="main">
  <!-- Global data model -->
  <datamodel>
    <data id="globalCounter" expr="0"/>
    <data id="systemStatus">initializing</data>
  </datamodel>

  <state id="main">
    <!-- Local data model for this state -->
    <datamodel>
      <data id="localVariable">local value</data>
      <data id="stateStartTime" expr="Date.now()"/>
    </datamodel>

    <onentry>
      <assign location="systemStatus">running</assign>
    </onentry>
  </state>
</scxml>
```

### External Data Sources

```xml
<scxml version="1.0" datamodel="ecmascript" initial="loading">
  <datamodel>
    <data id="config" src="config.json"/>
    <data id="userPreferences" src="user-prefs.json"/>
    <data id="localData" expr="{ initialized: false }"/>
  </datamodel>

  <state id="loading">
    <onentry>
      <!-- Data loading logic -->
    </onentry>
    <transition event="dataLoaded" target="ready"/>
  </state>

  <state id="ready">
    <!-- Application ready state -->
  </state>
</scxml>
```

## TypeScript Usage

### Creating a DataModel Node

```typescript
import { DataModelNode, DataNode } from '@your-library/statecharts';

// Basic data model node
const dataModelNode = new DataModelNode({
  datamodel: {
    content: '',
    children: [],
  },
});

console.log(dataModelNode.allowChildren); // true
```

### Creating with Data Children

```typescript
// Create data nodes
const counterData = new DataNode({
  data: {
    id: 'counter',
    expr: '0',
    content: '',
    children: [],
  },
});

const messageData = new DataNode({
  data: {
    id: 'message',
    content: 'Hello World',
    children: [],
  },
});

// Create data model with children
const dataModelNode = new DataModelNode({
  datamodel: {
    content: '',
    children: [],
  },
});

dataModelNode.children.push(counterData, messageData);

console.log(`Data model has ${dataModelNode.children.length} data elements`);
```

### Creating from JSON

```typescript
// From parsed XML/JSON
const result = DataModelNode.createFromJSON({
  datamodel: {
    content: '',
    children: [],
  },
});

if (result.success) {
  const dataModelNode = result.node;
  console.log('DataModel node created successfully');
} else {
  console.error('Validation failed:', result.error);
}

// Direct JSON format (without 'datamodel' wrapper)
const directResult = DataModelNode.createFromJSON({
  content: '',
  children: [],
});
```

### Executing Data Model Initialization

```typescript
import { InternalState } from '@your-library/statecharts';

const dataModelNode = new DataModelNode({
  datamodel: {
    content: '',
    children: [],
  },
});

// Add data nodes as children
// ... (data nodes added)

const initialState: InternalState = {
  data: {},
  _datamodel: 'ecmascript',
};

// Execute data model initialization
const resultState = await dataModelNode.run(initialState);

console.log('Data model initialized:', resultState.data);
```

## Properties

The DataModelNode class exposes the following properties:

- `content: string` - Text content (inherited from BaseNode)
- `children: BaseNode[]` - Child elements, typically `<data>` nodes
- `allowChildren: boolean` - Always `true` to enable child execution
- `isExecutable: boolean` - `false` (not executable content)

## Behavior

### Initialization Process

The DataModel node follows this initialization sequence:

1. **Container Setup**: Creates the data model container structure
2. **Child Execution**: Executes all child `<data>` elements in document order
3. **State Integration**: Integrates initialized data into the state machine's data model
4. **Completion**: Returns the updated state with initialized data

### Child Processing

The DataModel node processes children using the `executeAllChildren` method:

```typescript
async run(state: InternalState): Promise<InternalState> {
  let nextState = { ...state };

  for await (const { state } of this.executeAllChildren(nextState)) {
    nextState = state as InternalState;
  }

  return nextState;
}
```

This ensures that:

- All executable children (typically `<data>` nodes) are processed
- Children are executed in document order
- State changes are accumulated sequentially
- The final state contains all initialized data

### State Machine Integration

The DataModel node integrates with the state machine lifecycle:

1. **SCXML Root Level**: Global data model initialized before state machine execution
2. **State Level**: Local data models initialized when states are entered
3. **Scope Management**: Data variables have appropriate scope (global vs local)
4. **Persistence**: Data persists throughout state machine execution

## Data Model Scope

### Global Data Model

Defined at the SCXML root level:

```xml
<scxml>
  <datamodel>
    <data id="globalVar" expr="'global'"/>
  </datamodel>
  <!-- Available to all states -->
</scxml>
```

### Local Data Model

Defined within specific states:

```xml
<state id="myState">
  <datamodel>
    <data id="localVar" expr="'local'"/>
  </datamodel>
  <!-- Available only within this state -->
</state>
```

## Validation

The DataModel node uses the BaseNodeAttr schema for validation:

- **Content**: Optional string content
- **Children**: Optional array of child elements

### Validation Examples

```typescript
// Valid: Empty data model
{ content: '', children: [] }

// Valid: With content
{ content: 'Data model description', children: [] }

// Valid: With children (data nodes)
{ content: '', children: [dataNode1, dataNode2] }

// All variations are valid as DataModel uses base schema
```

## Performance Considerations

- **Initialization Order**: Data elements are initialized in document order
- **Memory Usage**: All data variables are held in memory throughout execution
- **Scope Efficiency**: Local data models are created/destroyed with state entry/exit
- **Child Processing**: Sequential processing ensures deterministic initialization

## Common Patterns

### Application State Management

```xml
<datamodel>
  <data id="currentUser" expr="null"/>
  <data id="isAuthenticated" expr="false"/>
  <data id="permissions" expr="[]"/>
  <data id="sessionToken" expr="''"/>
</datamodel>
```

### Configuration Management

```xml
<datamodel>
  <data id="apiUrl" src="config/api.json"/>
  <data id="features" src="config/features.json"/>
  <data id="theme" expr="'default'"/>
  <data id="locale" expr="'en-US'"/>
</datamodel>
```

### Game State Tracking

```xml
<datamodel>
  <data id="player" expr="{ health: 100, score: 0, level: 1 }"/>
  <data id="gameState" expr="'menu'"/>
  <data id="inventory" expr="[]"/>
  <data id="achievements" expr="new Set()"/>
</datamodel>
```

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<datamodel>` element is defined in [Section 5.2](https://www.w3.org/TR/scxml/#datamodel) of the specification.

Key specification compliance:

- Container for data declarations
- Supports both global and local scope
- Processes child elements in document order
- Integrates with state machine data model
- Supports multiple data model types (ecmascript, xpath, null)

## See Also

- [Data Node](./data.md) - Individual data variable declarations
- [SCXML Node](./scxml.md) - Root container with global data model
- [State Node](./state.md) - States with local data models
- [Assign Node](./assign.md) - Data model variable assignment
