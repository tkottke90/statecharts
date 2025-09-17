# OnExit Node

The `<onexit>` element is an executable content container that defines actions to be executed when a state is exited. It serves as a wrapper for executable content that runs during state departure.

## Overview

The OnExit node is a fundamental component of SCXML that enables states to perform cleanup actions when they are exited. It acts as a container for executable content such as resource cleanup, logging, event notification, and other actions that should occur during state exit.

The OnExit node extends BaseExecutableNode and enables child execution, allowing it to process all contained executable elements in document order. This ensures that exit actions are executed sequentially and deterministically when a state is exited.

Unlike simple executable nodes, the OnExit node is specifically designed as a container that coordinates the execution of multiple exit actions within a single state departure operation.

### Children

The `children` array contains executable elements that define the exit actions:

- `<assign>` - Variable assignments and cleanup
- `<raise>` - Event generation for notifications
- `<log>` - Logging actions
- Custom executable content

## Usage Examples

### Basic State Exit Actions

```xml
<state id="active">
  <onexit>
    <assign location="status" expr="'inactive'"/>
    <assign location="exitTime" expr="Date.now()"/>
    <raise event="stateExited"/>
  </onexit>

  <transition event="deactivate" target="inactive"/>
</state>
```

### Resource Cleanup

```xml
<state id="processing">
  <onexit>
    <!-- Clean up temporary data -->
    <assign location="tempData" expr="null"/>
    <assign location="workerId" expr="null"/>

    <!-- Log completion -->
    <assign location="processLog" expr="'Processing completed'"/>

    <!-- Notify system -->
    <raise event="resourcesReleased"/>
  </onexit>

  <transition event="complete" target="finished"/>
  <transition event="cancel" target="cancelled"/>
</state>
```

### Session Management

```xml
<state id="authenticated">
  <onexit>
    <assign location="user.isAuthenticated" expr="false"/>
    <assign location="user.logoutTime" expr="Date.now()"/>
    <assign location="session.active" expr="false"/>
    <raise event="sessionEnded"/>
  </onexit>

  <transition event="logout" target="anonymous"/>
  <transition event="sessionTimeout" target="anonymous"/>
</state>
```

### Game State Cleanup

```xml
<state id="powerUpActive">
  <onentry>
    <assign location="powerUpActive" expr="true"/>
  </onentry>

  <onexit>
    <!-- Always clean up power-up state when exiting -->
    <assign location="powerUpActive" expr="false"/>
    <assign location="powerUpEndTime" expr="Date.now()"/>
    <raise event="powerUpDeactivated"/>
  </onexit>

  <transition event="powerUpExpired" target="noPowerUp"/>
  <transition event="usePowerUp" target="noPowerUp"/>
</state>
```

### Connection Management

```xml
<state id="connected">
  <onexit>
    <!-- Close connection resources -->
    <assign location="connection.status" expr="'disconnected'"/>
    <assign location="connection.handle" expr="null"/>
    <assign location="connection.lastDisconnect" expr="Date.now()"/>

    <!-- Notify disconnection -->
    <raise event="connectionClosed"/>
  </onexit>

  <transition event="disconnect" target="disconnected"/>
  <transition event="networkError" target="error"/>
</state>
```

### Application Shutdown

```xml
<state id="running">
  <onexit>
    <!-- Save application state -->
    <assign location="app.lastShutdown" expr="Date.now()"/>
    <assign location="app.status" expr="'shutting_down'"/>

    <!-- Clean up resources -->
    <assign location="app.activeConnections" expr="0"/>
    <assign location="app.tempFiles" expr="[]"/>

    <!-- Log shutdown -->
    <assign location="shutdownLog" expr="'Application shutdown initiated'"/>
    <raise event="shutdownStarted"/>
  </onexit>

  <transition event="shutdown" target="stopped"/>
</state>
```

### Data Persistence

```xml
<state id="editing">
  <onexit>
    <!-- Auto-save on exit -->
    <assign location="document.lastSaved" expr="Date.now()"/>
    <assign location="document.isDirty" expr="false"/>

    <!-- Clear editing state -->
    <assign location="editor.selection" expr="null"/>
    <assign location="editor.clipboard" expr="null"/>

    <!-- Notify save completion -->
    <raise event="documentSaved"/>
  </onexit>

  <transition event="save" target="saved"/>
  <transition event="cancel" target="viewing"/>
</state>
```

### Error Recovery

```xml
<state id="error">
  <onexit>
    <!-- Clear error state -->
    <assign location="lastError" expr="null"/>
    <assign location="errorCount" expr="0"/>
    <assign location="recoveryAttempts" expr="0"/>

    <!-- Log recovery -->
    <assign location="recoveryLog" expr="'Error state cleared'"/>
    <raise event="errorRecovered"/>
  </onexit>

  <transition event="retry" target="processing"/>
  <transition event="reset" target="idle"/>
</state>
```

## TypeScript Usage

### Creating an OnExit Node

```typescript
import { OnExitNode, AssignNode, RaiseNode } from '@your-library/statecharts';

// Basic onexit node
const onExitNode = new OnExitNode({
  onexit: {
    content: '',
    children: [],
  },
});

console.log(onExitNode.isExecutable); // true
console.log(onExitNode.allowChildren); // true
```

### Creating with Cleanup Actions

```typescript
// Create cleanup actions
const clearDataAssign = new AssignNode({
  assign: {
    location: 'tempData',
    expr: 'null',
    content: '',
    children: [],
  },
});

const logExitAssign = new AssignNode({
  assign: {
    location: 'exitLog',
    expr: '"State cleanup completed"',
    content: '',
    children: [],
  },
});

const notifyRaise = new RaiseNode({
  raise: {
    event: 'cleanup.complete',
    content: '',
    children: [],
  },
});

// Create onexit with children
const onExitNode = new OnExitNode({
  onexit: {
    content: '',
    children: [],
  },
});

onExitNode.children.push(clearDataAssign, logExitAssign, notifyRaise);

console.log(`OnExit has ${onExitNode.children.length} cleanup actions`);
```

### Creating from JSON

```typescript
// From parsed XML/JSON
const result = OnExitNode.createFromJSON({
  onexit: {
    content: '',
    children: [],
  },
});

if (result.success) {
  const onExitNode = result.node;
  console.log('OnExit node created successfully');
} else {
  console.error('Validation failed:', result.error);
}

// Direct JSON format (without 'onexit' wrapper)
const directResult = OnExitNode.createFromJSON({
  content: '',
  children: [],
});
```

### Executing Exit Actions

```typescript
import { InternalState } from '@your-library/statecharts';

const onExitNode = new OnExitNode({
  onexit: {
    content: '',
    children: [],
  },
});

// Add cleanup actions
// ... (children added)

const state: InternalState = {
  data: { tempData: 'cleanup me', persistentData: 'keep me' },
  _datamodel: 'ecmascript',
};

// Execute exit actions
const resultState = await onExitNode.run(state);

console.log('Exit actions executed:', resultState.data);
```

## Properties

The OnExitNode class exposes the following properties:

- `content: string` - Text content (inherited from BaseNode)
- `children: BaseNode[]` - Child executable elements
- `allowChildren: boolean` - Always `true` to enable child execution
- `isExecutable: boolean` - Always `true` (inherited from BaseExecutableNode)

## Behavior

### Execution Process

The OnExit node follows this execution sequence:

1. **State Exit**: Triggered when the containing state is exited
2. **Child Processing**: Executes all child executable elements in document order
3. **Sequential Execution**: Each child completes before the next begins
4. **State Integration**: Updates are accumulated and applied to the state
5. **Completion**: Returns the final updated state

### Child Processing

The OnExit node processes children using the `executeAllChildren` method:

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
- The final state contains all exit action results

### State Machine Integration

The OnExit node integrates with the state machine lifecycle:

1. **State Exit**: Automatically executed when state is exited
2. **Before Transition**: Exit actions complete before transition processing
3. **Parallel States**: Each parallel region executes its own exit actions
4. **Nested States**: Child exit actions execute before parent exit actions

## Exit Action Timing

### Execution Order

When a state is exited, actions execute in this order:

1. **Child State Exit**: Child state onexit actions (if compound state)
2. **Current State Exit**: Current state onexit actions
3. **Parent State Exit**: Parent state onexit actions (if transitioning out of parent)

### Example Timing

```xml
<state id="parent">
  <onexit>
    <assign location="step" expr="3"/> <!-- Executes third -->
  </onexit>

  <state id="child" initial="grandchild">
    <onexit>
      <assign location="step" expr="2"/> <!-- Executes second -->
    </onexit>

    <state id="grandchild">
      <onexit>
        <assign location="step" expr="1"/> <!-- Executes first -->
      </onexit>
    </state>
  </state>
</state>
```

## Common Patterns

### Resource Cleanup

```xml
<state id="resourceOwner">
  <onexit>
    <assign location="resources.allocated" expr="false"/>
    <assign location="resources.handle" expr="null"/>
    <assign location="resources.count" expr="0"/>
  </onexit>
</state>
```

### Event Notification

```xml
<state id="active">
  <onexit>
    <assign location="status" expr="'inactive'"/>
    <raise event="stateDeactivated"/>
    <raise event="statusChanged"/>
  </onexit>
</state>
```

### Data Persistence

```xml
<state id="editing">
  <onexit>
    <assign location="document.lastModified" expr="Date.now()"/>
    <assign location="document.autoSaved" expr="true"/>
    <raise event="documentPersisted"/>
  </onexit>
</state>
```

### Connection Cleanup

```xml
<state id="connected">
  <onexit>
    <assign location="connection.active" expr="false"/>
    <assign location="connection.lastDisconnect" expr="Date.now()"/>
    <raise event="connectionClosed"/>
  </onexit>
</state>
```

## Validation

The OnExit node uses the BaseExecutableNodeAttr schema for validation:

- **Content**: Optional string content
- **Children**: Optional array of child elements

### Validation Examples

```typescript
// Valid: Empty onexit
{ content: '', children: [] }

// Valid: With executable children
{ content: '', children: [assignNode, raiseNode] }

// Valid: With content
{ content: 'Exit description', children: [] }

// All variations are valid as OnExit uses base executable schema
```

## Performance Considerations

- **Sequential Processing**: Children execute sequentially, not in parallel
- **State Immutability**: Creates new state objects, preserving immutability
- **Memory Efficiency**: Uses structural sharing where possible
- **Execution Order**: Document order ensures deterministic behavior
- **Cleanup Timing**: Exit actions complete before state transitions

## Error Handling

Exit actions can handle errors through:

1. **Try-Catch in Expressions**: JavaScript expressions can include error handling
2. **Error Events**: Failed actions can generate error events
3. **Graceful Degradation**: Non-critical cleanup can fail without stopping execution
4. **Recovery Actions**: Error states can be defined for cleanup failures

## Best Practices

### Always Clean Up Resources

```xml
<state id="fileProcessor">
  <onexit>
    <!-- Always close file handles -->
    <assign location="fileHandle" expr="null"/>
    <assign location="tempFiles" expr="[]"/>
    <assign location="processingComplete" expr="true"/>
  </onexit>
</state>
```

### Notify State Changes

```xml
<state id="userSession">
  <onexit>
    <!-- Always notify session end -->
    <assign location="sessionActive" expr="false"/>
    <raise event="sessionEnded"/>
  </onexit>
</state>
```

### Preserve Important Data

```xml
<state id="workingState">
  <onexit>
    <!-- Save work before exiting -->
    <assign location="lastWorkSaved" expr="Date.now()"/>
    <assign location="workInProgress" expr="false"/>
    <!-- Don't clear the actual work data -->
  </onexit>
</state>
```

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<onexit>` element is defined in [Section 3.8.2](https://www.w3.org/TR/scxml/#onexit) of the specification.

Key specification compliance:

- Container for executable content during state exit
- Executes children in document order
- Integrates with state machine exit semantics
- Supports all standard executable content elements
- Proper timing relative to state exit process

## See Also

- [OnEntry Node](./onentry.md) - Entry actions for state entry
- [Assign Node](./assign.md) - Variable assignments in exit actions
- [Raise Node](./raise.md) - Event generation in exit actions
- [State Node](./state.md) - States that contain exit actions
- [Parallel Node](./parallel.md) - Parallel states with exit actions
