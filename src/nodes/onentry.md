# OnEntry Node

The `<onentry>` element is an executable content container that defines actions to be executed when a state is entered. It serves as a wrapper for executable content that runs during state entry.

## Overview

The OnEntry node is a fundamental component of SCXML that enables states to perform actions when they are entered. It acts as a container for executable content such as assignments, event raising, and other actions that should occur during state entry.

The OnEntry node extends BaseExecutableNode and enables child execution, allowing it to process all contained executable elements in document order. This ensures that entry actions are executed sequentially and deterministically when a state is entered.

Unlike simple executable nodes, the OnEntry node is specifically designed as a container that coordinates the execution of multiple entry actions within a single state entry operation.

## Children

The `children` array contains executable elements that define the entry actions:

- `<assign>` - Variable assignments
- `<raise>` - Event generation
- `<log>` - Logging actions
- Custom executable content

## Usage Examples

### Basic State Entry Actions

```xml
<state id="active">
  <onentry>
    <assign location="status" expr="'active'"/>
    <assign location="entryTime" expr="Date.now()"/>
  </onentry>

  <transition event="deactivate" target="inactive"/>
</state>
```

### Game State Initialization

```xml
<state id="gameRunning">
  <onentry>
    <assign location="gameTime" expr="0"/>
    <assign location="playerHealth" expr="100"/>
    <assign location="score" expr="0"/>
    <raise event="gameStarted"/>
  </onentry>

  <parallel id="gameSystems">
    <!-- Game systems -->
  </parallel>
</state>
```

### User Session Management

```xml
<state id="authenticated">
  <onentry>
    <assign location="user.isAuthenticated" expr="true"/>
    <assign location="user.loginTime" expr="Date.now()"/>
    <assign location="session.timeout" expr="3600000"/>
    <raise event="sessionStarted"/>
  </onentry>

  <state id="dashboard">
    <!-- User dashboard -->
  </state>
</state>
```

### Application Initialization

```xml
<state id="startup">
  <onentry>
    <assign location="app.status" expr="'initializing'"/>
    <assign location="app.version" expr="'1.0.0'"/>
    <assign location="app.startTime" expr="Date.now()"/>
    <raise event="initializationStarted"/>
  </onentry>

  <transition event="initialized" target="running"/>
</state>
```

### Complex Entry Logic

```xml
<state id="processing">
  <onentry>
    <!-- Initialize processing state -->
    <assign location="process.status" expr="'starting'"/>
    <assign location="process.startTime" expr="Date.now()"/>
    <assign location="process.progress" expr="0"/>

    <!-- Set up processing environment -->
    <assign location="process.workerId" expr="Math.random().toString(36)"/>
    <assign location="process.priority" expr="'normal'"/>

    <!-- Notify system of processing start -->
    <raise event="processingStarted"/>
    <raise event="workerAssigned"/>
  </onentry>

  <transition event="processComplete" target="completed"/>
  <transition event="processError" target="error"/>
</state>
```

### Parallel System Entry

```xml
<parallel id="gameSystems">
  <onentry>
    <assign location="systemsActive" expr="true"/>
    <assign location="systemStartTime" expr="Date.now()"/>
  </onentry>

  <state id="healthSystem" initial="healthy">
    <onentry>
      <assign location="playerHealth" expr="100"/>
    </onentry>
    <!-- Health system states -->
  </state>

  <state id="scoreSystem" initial="scoring">
    <onentry>
      <assign location="playerScore" expr="0"/>
    </onentry>
    <!-- Score system states -->
  </state>
</parallel>
```

### Conditional Entry Actions

```xml
<state id="userProfile">
  <onentry>
    <assign location="profile.lastAccess" expr="Date.now()"/>
    <assign location="profile.visitCount" expr="profile.visitCount + 1"/>

    <!-- Conditional welcome message -->
    <assign location="welcomeMessage"
            expr="profile.visitCount === 1 ? 'Welcome!' : 'Welcome back!'"/>

    <!-- Raise appropriate event -->
    <raise event="profileAccessed"/>
  </onentry>

  <transition event="updateProfile" target="editing"/>
</state>
```

### Final State Entry

```xml
<final id="gameOver">
  <onentry>
    <assign location="game.endTime" expr="Date.now()"/>
    <assign location="game.duration" expr="Date.now() - game.startTime"/>
    <assign location="game.status" expr="'completed'"/>
    <raise event="gameCompleted"/>
  </onentry>
</final>
```

## TypeScript Usage

### Creating an OnEntry Node

```typescript
import { OnEntryNode, AssignNode, RaiseNode } from '@your-library/statecharts';

// Basic onentry node
const onEntryNode = new OnEntryNode({
  onentry: {
    content: '',
    children: [],
  },
});

console.log(onEntryNode.isExecutable); // true
console.log(onEntryNode.allowChildren); // true
```

### Creating with Executable Children

```typescript
// Create executable children
const statusAssign = new AssignNode({
  assign: {
    location: 'status',
    expr: '"active"',
    content: '',
    children: [],
  },
});

const timeAssign = new AssignNode({
  assign: {
    location: 'entryTime',
    expr: 'Date.now()',
    content: '',
    children: [],
  },
});

const notifyRaise = new RaiseNode({
  raise: {
    event: 'stateEntered',
    content: '',
    children: [],
  },
});

// Create onentry with children
const onEntryNode = new OnEntryNode({
  onentry: {
    content: '',
    children: [],
  },
});

onEntryNode.children.push(statusAssign, timeAssign, notifyRaise);

console.log(`OnEntry has ${onEntryNode.children.length} actions`);
```

### Creating from JSON

```typescript
// From parsed XML/JSON
const result = OnEntryNode.createFromJSON({
  onentry: {
    content: '',
    children: [],
  },
});

if (result.success) {
  const onEntryNode = result.node;
  console.log('OnEntry node created successfully');
} else {
  console.error('Validation failed:', result.error);
}

// Direct JSON format (without 'onentry' wrapper)
const directResult = OnEntryNode.createFromJSON({
  content: '',
  children: [],
});
```

### Executing Entry Actions

```typescript
import { InternalState } from '@your-library/statecharts';

const onEntryNode = new OnEntryNode({
  onentry: {
    content: '',
    children: [],
  },
});

// Add executable children
// ... (children added)

const state: InternalState = {
  data: { counter: 0 },
  _datamodel: 'ecmascript',
};

// Execute entry actions
const resultState = await onEntryNode.run(state);

console.log('Entry actions executed:', resultState.data);
```

## Properties

The OnEntryNode class exposes the following properties:

- `content: string` - Text content (inherited from BaseNode)
- `children: BaseNode[]` - Child executable elements
- `allowChildren: boolean` - Always `true` to enable child execution
- `isExecutable: boolean` - Always `true` (inherited from BaseExecutableNode)

## Behavior

### Execution Process

The OnEntry node follows this execution sequence:

1. **State Entry**: Triggered when the containing state is entered
2. **Child Processing**: Executes all child executable elements in document order
3. **Sequential Execution**: Each child completes before the next begins
4. **State Integration**: Updates are accumulated and applied to the state
5. **Completion**: Returns the final updated state

### Child Processing

The OnEntry node processes children using the `executeAllChildren` method:

```typescript
async run(state: InternalState): Promise<InternalState> {
  let nextState = { ...state };

  for await (const { state } of this.executeAllChildren(nextState)) {
    nextState = state;
  }

  return nextState;
}
```

This ensures that:

- All executable children are processed sequentially
- Children are executed in document order
- State changes are accumulated across all children
- The final state contains all entry action results

### State Machine Integration

The OnEntry node integrates with the state machine lifecycle:

1. **State Entry**: Automatically executed when state is entered
2. **Before Transitions**: Entry actions complete before transition processing
3. **Parallel States**: Each parallel region executes its own entry actions
4. **Nested States**: Parent entry actions execute before child entry actions

## Entry Action Timing

### Execution Order

When a state is entered, actions execute in this order:

1. **Parent State Entry**: Parent state onentry actions (if any)
2. **Current State Entry**: Current state onentry actions
3. **Child State Entry**: Child state onentry actions (if compound state)

### Example Timing

```xml
<state id="parent">
  <onentry>
    <assign location="step" expr="1"/> <!-- Executes first -->
  </onentry>

  <state id="child" initial="grandchild">
    <onentry>
      <assign location="step" expr="2"/> <!-- Executes second -->
    </onentry>

    <state id="grandchild">
      <onentry>
        <assign location="step" expr="3"/> <!-- Executes third -->
      </onentry>
    </state>
  </state>
</state>
```

## Common Patterns

### State Initialization

```xml
<state id="initialized">
  <onentry>
    <assign location="initialized" expr="true"/>
    <assign location="initTime" expr="Date.now()"/>
    <assign location="version" expr="'1.0.0'"/>
  </onentry>
</state>
```

### Event Notification

```xml
<state id="active">
  <onentry>
    <assign location="status" expr="'active'"/>
    <raise event="stateActivated"/>
    <raise event="statusChanged"/>
  </onentry>
</state>
```

### Resource Allocation

```xml
<state id="processing">
  <onentry>
    <assign location="workerId" expr="allocateWorker()"/>
    <assign location="resourcesAllocated" expr="true"/>
    <assign location="startTime" expr="Date.now()"/>
  </onentry>
</state>
```

### Conditional Setup

```xml
<state id="userState">
  <onentry>
    <assign location="userType" expr="user.premium ? 'premium' : 'basic'"/>
    <assign location="features" expr="getUserFeatures(userType)"/>
    <assign location="limits" expr="getUserLimits(userType)"/>
  </onentry>
</state>
```

## Validation

The OnEntry node uses the BaseExecutableNodeAttr schema for validation:

- **Content**: Optional string content
- **Children**: Optional array of child elements

### Validation Examples

```typescript
// Valid: Empty onentry
{ content: '', children: [] }

// Valid: With executable children
{ content: '', children: [assignNode, raiseNode] }

// Valid: With content
{ content: 'Entry description', children: [] }

// All variations are valid as OnEntry uses base executable schema
```

## Performance Considerations

- **Sequential Processing**: Children execute sequentially, not in parallel
- **State Immutability**: Creates new state objects, preserving immutability
- **Memory Efficiency**: Uses structural sharing where possible
- **Execution Order**: Document order ensures deterministic behavior

## Error Handling

Entry actions can handle errors through:

1. **Try-Catch in Expressions**: JavaScript expressions can include error handling
2. **Error Events**: Failed actions can generate error events
3. **State Recovery**: Error states can be defined for recovery
4. **Graceful Degradation**: Non-critical actions can fail without stopping execution

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<onentry>` element is defined in [Section 3.8.1](https://www.w3.org/TR/scxml/#onentry) of the specification.

Key specification compliance:

- Container for executable content during state entry
- Executes children in document order
- Integrates with state machine entry semantics
- Supports all standard executable content elements
- Proper timing relative to state entry process

## See Also

- [OnExit Node](./onexit.md) - Exit actions for state departure
- [Assign Node](./assign.md) - Variable assignments in entry actions
- [Raise Node](./raise.md) - Event generation in entry actions
- [State Node](./state.md) - States that contain entry actions
- [Parallel Node](./parallel.md) - Parallel states with entry actions
