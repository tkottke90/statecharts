# Transition Node

The `<transition>` element defines state transitions in SCXML state machines. It specifies how the state machine moves from one state to another in response to events, with optional conditions and executable content.

## Overview

The Transition node is a core component of SCXML that enables state machines to respond to events and change states. It defines the trigger event, target state, optional conditions, and executable content that runs during the transition.

The Transition node extends BaseNode and enables child execution, allowing it to contain executable content such as assignments, event raising, and other actions that should occur during the transition process.

Unlike state nodes, transitions are not states themselves but rather the connections between states that define the dynamic behavior of the state machine.

## Attributes

The Transition node has the following attributes:

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `event` | `string` | No | `""` | Event that triggers the transition |
| `target` | `string` | Yes | - | Target state identifier |
| `cond` | `string` | No | - | Condition expression for conditional transitions |

### Event Attribute

The `event` attribute specifies which event triggers the transition:
- **Specific Event**: `"user.click"` - matches exact event name
- **Wildcard**: `"*"` - matches any event
- **Event Pattern**: `"user.*"` - matches events starting with "user."
- **Empty/Eventless**: `""` - automatic transition (no event required)

### Target Attribute

The `target` attribute specifies the destination state:
- **Simple Target**: `"nextState"` - direct state reference
- **Hierarchical Target**: `"parent.child.grandchild"` - nested state path
- **Required**: Must be a non-empty string

### Condition Attribute

The `cond` attribute provides conditional logic:
- **JavaScript Expression**: `"data.count > 5"` - evaluated as boolean
- **Complex Logic**: `"user.authenticated && user.role === 'admin'"`
- **Optional**: If omitted, transition always fires when event matches

## Usage Examples

### Basic Event-Driven Transition

```xml
<state id="idle">
  <transition event="start" target="active"/>
  <transition event="shutdown" target="offline"/>
</state>
```

### Conditional Transitions

```xml
<state id="processing">
  <transition event="complete" target="success" cond="data.errors === 0"/>
  <transition event="complete" target="failed" cond="data.errors > 0"/>
  <transition event="cancel" target="cancelled"/>
</state>
```

### Transitions with Executable Content

```xml
<state id="authenticating">
  <transition event="login.success" target="authenticated">
    <assign location="user.isAuthenticated" expr="true"/>
    <assign location="user.loginTime" expr="Date.now()"/>
    <raise event="authenticationComplete"/>
  </transition>
  
  <transition event="login.failed" target="loginError">
    <assign location="user.failedAttempts" expr="user.failedAttempts + 1"/>
    <raise event="authenticationFailed"/>
  </transition>
</state>
```

### Eventless (Automatic) Transitions

```xml
<state id="initialization">
  <!-- Automatic transition when initialization completes -->
  <transition target="ready" cond="data.initialized === true">
    <assign location="status" expr="'ready'"/>
  </transition>
</state>
```

### Health System Transitions

```xml
<state id="healthy">
  <transition event="damage" target="injured" cond="playerHealth > 50">
    <assign location="playerHealth" expr="playerHealth - 25"/>
  </transition>
  
  <transition event="damage" target="critical" cond="playerHealth <= 50">
    <assign location="playerHealth" expr="playerHealth - 25"/>
  </transition>
</state>

<state id="injured">
  <transition event="heal" target="healthy">
    <assign location="playerHealth" expr="playerHealth + 30"/>
  </transition>
  
  <transition event="damage" target="critical">
    <assign location="playerHealth" expr="playerHealth - 25"/>
  </transition>
</state>
```

### User Session Management

```xml
<state id="authenticated">
  <transition event="logout" target="anonymous">
    <assign location="user.isAuthenticated" expr="false"/>
    <assign location="user.logoutTime" expr="Date.now()"/>
    <raise event="sessionEnded"/>
  </transition>
  
  <transition event="sessionTimeout" target="anonymous">
    <assign location="user.isAuthenticated" expr="false"/>
    <assign location="user.timeoutReason" expr="'inactivity'"/>
    <raise event="sessionTimedOut"/>
  </transition>
</state>
```

### Complex Workflow Transitions

```xml
<state id="documentEditing">
  <transition event="save" target="documentSaved">
    <assign location="document.lastSaved" expr="Date.now()"/>
    <assign location="document.isDirty" expr="false"/>
    <raise event="documentPersisted"/>
  </transition>
  
  <transition event="cancel" target="documentViewing" cond="document.isDirty === false"/>
  
  <transition event="cancel" target="confirmDiscard" cond="document.isDirty === true">
    <assign location="dialog.message" expr="'Unsaved changes will be lost'"/>
  </transition>
</state>
```

### Error Handling Transitions

```xml
<state id="processing">
  <transition event="error" target="errorState">
    <assign location="lastError" expr="_event.data"/>
    <assign location="errorTime" expr="Date.now()"/>
    <assign location="retryCount" expr="0"/>
    <raise event="errorOccurred"/>
  </transition>
  
  <transition event="timeout" target="timeoutState">
    <assign location="timeoutReason" expr="'processing_timeout'"/>
    <raise event="operationTimedOut"/>
  </transition>
</state>
```

### Parallel System Transitions

```xml
<state id="powerUpActive">
  <!-- Multiple ways to exit power-up state -->
  <transition event="powerUpExpired" target="noPowerUp">
    <assign location="powerUpActive" expr="false"/>
    <assign location="powerUpEndReason" expr="'expired'"/>
  </transition>
  
  <transition event="usePowerUp" target="noPowerUp">
    <assign location="powerUpActive" expr="false"/>
    <assign location="powerUpEndReason" expr="'used'"/>
    <raise event="powerUpConsumed"/>
  </transition>
</state>
```

## TypeScript Usage

### Creating a Transition Node

```typescript
import { TransitionNode, AssignNode, RaiseNode } from '@your-library/statecharts';

// Basic event-driven transition
const basicTransition = new TransitionNode({
  transition: {
    event: 'user.click',
    target: 'nextState',
    content: '',
    children: []
  }
});

console.log(basicTransition.event); // 'user.click'
console.log(basicTransition.target); // 'nextState'
console.log(basicTransition.allowChildren); // true
```

### Creating Conditional Transitions

```typescript
// Conditional transition
const conditionalTransition = new TransitionNode({
  transition: {
    event: 'check.status',
    target: 'approved',
    cond: 'data.score >= 80',
    content: '',
    children: []
  }
});

console.log(conditionalTransition.cond); // 'data.score >= 80'
```

### Creating with Executable Content

```typescript
// Create executable content
const statusAssign = new AssignNode({
  assign: {
    location: 'status',
    expr: '"transitioning"',
    content: '',
    children: []
  }
});

const notifyRaise = new RaiseNode({
  raise: {
    event: 'transition.executed',
    content: '',
    children: []
  }
});

// Create transition with executable content
const transitionWithContent = new TransitionNode({
  transition: {
    event: 'trigger',
    target: 'nextState',
    content: '',
    children: []
  }
});

transitionWithContent.children.push(statusAssign, notifyRaise);

console.log(`Transition has ${transitionWithContent.children.length} actions`);
```

### Creating from JSON

```typescript
// From parsed XML/JSON
const result = TransitionNode.createFromJSON({
  transition: {
    event: 'user.action',
    target: 'targetState',
    cond: 'data.ready === true',
    content: '',
    children: []
  }
});

if (result.success) {
  const transitionNode = result.node;
  console.log('Transition node created successfully');
} else {
  console.error('Validation failed:', result.error);
}

// Direct JSON format (without 'transition' wrapper)
const directResult = TransitionNode.createFromJSON({
  event: 'direct.event',
  target: 'directTarget',
  content: '',
  children: []
});
```

### Checking Conditions and Executing

```typescript
import { InternalState } from '@your-library/statecharts';

const conditionalTransition = new TransitionNode({
  transition: {
    event: 'check',
    target: 'approved',
    cond: 'data.score >= 80',
    content: '',
    children: []
  }
});

const state: InternalState = {
  data: { score: 85 },
  _datamodel: 'ecmascript'
};

// Check if condition passes
const conditionPasses = conditionalTransition.checkCondition(state);
console.log('Condition passes:', conditionPasses); // true

// Get target state
const target = conditionalTransition.getTarget(state);
console.log('Target state:', target); // 'approved'

// Execute transition content
const resultState = await conditionalTransition.run(state);
console.log('Transition executed:', resultState);
```

## Properties

The TransitionNode class exposes the following properties:

- `event: string` - Event that triggers the transition
- `target: string` - Target state identifier
- `cond: string | undefined` - Optional condition expression
- `content: string` - Text content (inherited from BaseNode)
- `children: BaseNode[]` - Child executable elements
- `allowChildren: boolean` - Always `true` to enable executable content
- `isEventLess: boolean` - Getter that returns `true` if event is empty
- `isTargetLess: boolean` - Getter that returns `true` if target is empty

## Behavior

### Transition Execution Process

The Transition node follows this execution sequence:

1. **Event Matching**: Check if the current event matches the transition's event
2. **Condition Evaluation**: Evaluate the condition (if present) against current state
3. **Content Execution**: Execute all child executable elements in document order
4. **State Update**: Apply all changes to the state
5. **Target Resolution**: Resolve the target state for the state machine

### Event Matching

Event matching supports several patterns:

```typescript
// Exact match
transition.event === 'user.click'

// Wildcard match
transition.event === '*'  // matches any event

// Empty/eventless
transition.event === ''   // automatic transition
```

### Condition Evaluation

Conditions are JavaScript expressions evaluated in the state context:

```typescript
checkCondition(state: InternalState): boolean {
  if (!this.cond) return true;

  try {
    return evaluateExpression(this.cond, state) === 'true';
  } catch (err) {
    // Generate error event and return false
    return false;
  }
}
```

### Executable Content Processing

The transition processes executable content sequentially:

```typescript
async run(state: InternalState): Promise<InternalState> {
  let currentState = { ...state };

  for (const child of this.children) {
    if (child.isExecutable) {
      try {
        const result = await child.run(currentState);
        currentState = { ...currentState, ...result };
      } catch (error) {
        // Handle execution errors
      }
    }
  }

  return currentState;
}
```

## Transition Types

### Event-Driven Transitions

```xml
<transition event="user.click" target="clicked"/>
<transition event="timer.expired" target="timeout"/>
<transition event="data.received" target="processing"/>
```

### Eventless (Automatic) Transitions

```xml
<!-- Fires immediately when condition becomes true -->
<transition target="ready" cond="data.initialized === true"/>

<!-- Fires immediately (no condition) -->
<transition target="next"/>
```

### Conditional Transitions

```xml
<transition event="submit" target="success" cond="data.valid === true"/>
<transition event="submit" target="error" cond="data.valid === false"/>
```

### Self-Transitions

```xml
<!-- Transition back to the same state -->
<state id="active">
  <transition event="refresh" target="active">
    <assign location="lastRefresh" expr="Date.now()"/>
  </transition>
</state>
```

## Common Patterns

### Guard Conditions

```xml
<state id="processing">
  <transition event="complete" target="success" cond="data.errors === 0"/>
  <transition event="complete" target="failed" cond="data.errors > 0"/>
</state>
```

### State Cleanup on Exit

```xml
<state id="editing">
  <transition event="save" target="saved">
    <assign location="document.lastSaved" expr="Date.now()"/>
    <assign location="document.isDirty" expr="false"/>
  </transition>
</state>
```

### Event Broadcasting

```xml
<state id="processing">
  <transition event="complete" target="finished">
    <assign location="result" expr="_event.data"/>
    <raise event="processingComplete"/>
  </transition>
</state>
```

### Error Handling

```xml
<state id="operation">
  <transition event="error" target="errorState">
    <assign location="lastError" expr="_event.data"/>
    <assign location="errorTime" expr="Date.now()"/>
    <raise event="operationFailed"/>
  </transition>
</state>
```

## Validation

The Transition node uses an extended BaseNodeAttr schema:

- **Event**: Optional string (defaults to empty string)
- **Target**: Required non-empty string
- **Condition**: Optional string expression
- **Content**: Optional string content
- **Children**: Optional array of child elements

### Validation Examples

```typescript
// Valid: Basic transition
{ event: 'trigger', target: 'nextState', content: '', children: [] }

// Valid: Conditional transition
{ event: 'check', target: 'approved', cond: 'data.score >= 80', content: '', children: [] }

// Valid: Eventless transition
{ target: 'automatic', content: '', children: [] }

// Invalid: Missing target
{ event: 'trigger', content: '', children: [] } // Validation fails

// Invalid: Empty target
{ event: 'trigger', target: '', content: '', children: [] } // Validation fails
```

## Performance Considerations

- **Condition Evaluation**: JavaScript expressions are evaluated for each event
- **Sequential Execution**: Child content executes sequentially, not in parallel
- **State Immutability**: Creates new state objects, preserving immutability
- **Error Handling**: Failed conditions or content generate error events
- **Memory Efficiency**: Uses structural sharing where possible

## Error Handling

Transitions handle errors in several ways:

1. **Condition Errors**: Generate `error.transition.condition-failed` events
2. **Execution Errors**: Generate `error.transaction.execution-failed` events
3. **Graceful Degradation**: Failed transitions don't crash the state machine
4. **Error Events**: Provide detailed error information for debugging

## Best Practices

### Use Specific Events

```xml
<!-- Good: Specific event names -->
<transition event="user.login.success" target="authenticated"/>
<transition event="user.login.failed" target="loginError"/>

<!-- Avoid: Generic event names -->
<transition event="success" target="authenticated"/>
```

### Guard with Conditions

```xml
<!-- Good: Clear conditions -->
<transition event="submit" target="processing" cond="form.isValid === true"/>

<!-- Good: Multiple guarded transitions -->
<transition event="age.check" target="adult" cond="user.age >= 18"/>
<transition event="age.check" target="minor" cond="user.age < 18"/>
```

### Clean Up in Transitions

```xml
<!-- Good: Clean up during transitions -->
<transition event="logout" target="anonymous">
  <assign location="user.session" expr="null"/>
  <assign location="user.isAuthenticated" expr="false"/>
  <raise event="sessionEnded"/>
</transition>
```

### Handle Errors Gracefully

```xml
<!-- Good: Explicit error handling -->
<transition event="error" target="errorState">
  <assign location="lastError" expr="_event.data"/>
  <assign location="canRetry" expr="true"/>
</transition>
```

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<transition>` element is defined in [Section 3.3](https://www.w3.org/TR/scxml/#transition) of the specification.

Key specification compliance:
- Event-driven and eventless transitions
- Conditional transitions with guard expressions
- Executable content during transitions
- Proper target resolution and state changes
- Error handling for failed conditions and execution
- Document order execution of child elements

## See Also

- [State Node](./state.md) - States that contain transitions
- [Assign Node](./assign.md) - Variable assignments in transitions
- [Raise Node](./raise.md) - Event generation in transitions
- [OnEntry Node](./onentry.md) - Entry actions for target states
- [OnExit Node](./onexit.md) - Exit actions for source states
