# Raise Node

The `<raise>` element generates internal events within SCXML state machines. It allows states and transitions to trigger events that can be processed by the state machine's event handling system.

## Overview

The Raise node is an executable content element that creates internal events during state machine execution. It enables states, transitions, and other executable content to generate events that can trigger transitions, notify other parts of the system, or coordinate complex behaviors.

The Raise node extends BaseExecutableNode and generates internal events that are added to the state machine's pending event queue. These events are processed according to SCXML event processing rules and can trigger transitions or other event-driven behaviors.

Unlike external events that come from outside the state machine, raised events are generated internally and processed immediately during the current execution cycle.

## Attributes

The Raise node has the following attributes:

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `event` | `string` | No* | - | Static event name to raise |
| `eventexpr` | `string` | No* | - | Expression that evaluates to event name |

**Note**: Exactly one of `event` or `eventexpr` must be specified, but not both.

### Event Attribute

The `event` attribute specifies a static event name:
- **Simple Event**: `"userAction"` - basic event name
- **Namespaced Event**: `"user.login.success"` - hierarchical event name
- **System Event**: `"system.initialized"` - system-level event
- **State Event**: `"state.entered"` - state-specific event

### EventExpr Attribute

The `eventexpr` attribute provides dynamic event generation:
- **Variable-based**: `"data.eventType"` - event name from data
- **Conditional**: `"user.authenticated ? 'auth.success' : 'auth.failed'"` - conditional event
- **Computed**: `"'user.' + data.action + '.complete'"` - constructed event name
- **Function-based**: `"generateEventName(data.context)"` - function-generated event

## Usage Examples

### Basic Event Raising

```xml
<state id="processing">
  <onentry>
    <assign location="status" expr="'processing'"/>
    <raise event="processingStarted"/>
  </onentry>
  
  <transition event="complete" target="finished">
    <assign location="status" expr="'completed'"/>
    <raise event="processingComplete"/>
  </transition>
</state>
```

### Dynamic Event Generation

```xml
<state id="userAction">
  <transition event="performAction" target="actionComplete">
    <assign location="actionType" expr="_event.data.type"/>
    <raise eventexpr="'action.' + actionType + '.executed'"/>
  </transition>
</state>
```

### State Entry Notifications

```xml
<state id="authenticated">
  <onentry>
    <assign location="user.isAuthenticated" expr="true"/>
    <assign location="user.loginTime" expr="Date.now()"/>
    <raise event="authenticationComplete"/>
    <raise event="sessionStarted"/>
  </onentry>
</state>
```

### Error Handling with Events

```xml
<state id="dataValidation">
  <transition event="validate" target="validated" cond="data.isValid === true">
    <raise event="validationSuccess"/>
  </transition>
  
  <transition event="validate" target="validationError" cond="data.isValid === false">
    <assign location="errors" expr="data.validationErrors"/>
    <raise event="validationFailed"/>
  </transition>
</state>
```

### Workflow Coordination

```xml
<state id="documentProcessing">
  <transition event="process" target="processing">
    <assign location="startTime" expr="Date.now()"/>
    <raise event="processingStarted"/>
  </transition>
  
  <transition event="complete" target="completed">
    <assign location="endTime" expr="Date.now()"/>
    <assign location="duration" expr="endTime - startTime"/>
    <raise event="processingComplete"/>
    <raise event="documentReady"/>
  </transition>
</state>
```

### Conditional Event Raising

```xml
<state id="userRegistration">
  <transition event="register" target="registered">
    <assign location="user.registered" expr="true"/>
    <assign location="user.registrationTime" expr="Date.now()"/>
    
    <!-- Conditional event based on user type -->
    <raise eventexpr="user.isPremium ? 'premiumUserRegistered' : 'basicUserRegistered'"/>
    
    <!-- Always raise general registration event -->
    <raise event="userRegistered"/>
  </transition>
</state>
```

### System State Broadcasting

```xml
<state id="systemStartup">
  <onentry>
    <assign location="system.status" expr="'starting'"/>
    <raise event="systemStarting"/>
  </onentry>
  
  <transition target="systemReady" cond="system.initialized === true">
    <assign location="system.status" expr="'ready'"/>
    <assign location="system.readyTime" expr="Date.now()"/>
    <raise event="systemReady"/>
    <raise event="servicesAvailable"/>
  </transition>
</state>
```

### Game Event Management

```xml
<final id="dead">
  <onentry>
    <assign location="playerHealth" expr="0"/>
    <assign location="gameEndReason" expr="'player_death'"/>
    <raise event="gameOver"/>
    <raise event="playerDied"/>
  </onentry>
</final>
```

### Multi-step Process Coordination

```xml
<state id="fileUpload">
  <transition event="uploadStart" target="uploading">
    <assign location="upload.status" expr="'uploading'"/>
    <assign location="upload.startTime" expr="Date.now()"/>
    <raise event="uploadStarted"/>
  </transition>
  
  <transition event="uploadProgress" target="uploading">
    <assign location="upload.progress" expr="_event.data.progress"/>
    <raise eventexpr="'uploadProgress.' + Math.floor(_event.data.progress / 10) * 10"/>
  </transition>
  
  <transition event="uploadComplete" target="uploaded">
    <assign location="upload.status" expr="'completed'"/>
    <assign location="upload.endTime" expr="Date.now()"/>
    <raise event="uploadCompleted"/>
    <raise event="fileProcessingReady"/>
  </transition>
</state>
```

### Session Management Events

```xml
<state id="userSession">
  <onentry>
    <assign location="session.active" expr="true"/>
    <assign location="session.startTime" expr="Date.now()"/>
    <raise event="sessionStarted"/>
  </onentry>
  
  <onexit>
    <assign location="session.active" expr="false"/>
    <assign location="session.endTime" expr="Date.now()"/>
    <assign location="session.duration" expr="session.endTime - session.startTime"/>
    <raise event="sessionEnded"/>
    <raise eventexpr="session.duration > 3600000 ? 'longSessionEnded' : 'shortSessionEnded'"/>
  </onexit>
</state>
```

## TypeScript Usage

### Creating a Raise Node with Static Event

```typescript
import { RaiseNode } from '@your-library/statecharts';

// Basic raise node with static event
const staticRaise = new RaiseNode({
  raise: {
    event: 'userAction'
  }
});

console.log(staticRaise.event); // 'userAction'
console.log(staticRaise.eventexpr); // undefined
console.log(staticRaise.isExecutable); // true
```

### Creating a Raise Node with Dynamic Event

```typescript
// Raise node with dynamic event expression
const dynamicRaise = new RaiseNode({
  raise: {
    eventexpr: 'data.eventType + ".completed"'
  }
});

console.log(dynamicRaise.event); // undefined
console.log(dynamicRaise.eventexpr); // 'data.eventType + ".completed"'
```

### Creating from JSON

```typescript
// From parsed XML/JSON with static event
const staticResult = RaiseNode.createFromJSON({
  raise: {
    event: 'notification.sent'
  }
});

if (staticResult.success) {
  const raiseNode = staticResult.node;
  console.log('Static raise node created:', raiseNode.event);
} else {
  console.error('Validation failed:', staticResult.error);
}

// From parsed XML/JSON with dynamic event
const dynamicResult = RaiseNode.createFromJSON({
  raise: {
    eventexpr: 'user.role + ".actionPerformed"'
  }
});

if (dynamicResult.success) {
  const raiseNode = dynamicResult.node;
  console.log('Dynamic raise node created:', raiseNode.eventexpr);
}
```

### Executing Raise Nodes

```typescript
import { InternalState } from '@your-library/statecharts';

const raiseNode = new RaiseNode({
  raise: {
    event: 'testEvent'
  }
});

const state: InternalState = {
  data: { counter: 0 },
  _datamodel: 'ecmascript',
  _pendingInternalEvents: []
};

// Execute the raise node
const resultState = await raiseNode.run(state);

console.log('Events raised:', resultState._pendingInternalEvents?.length); // 1
console.log('Event name:', resultState._pendingInternalEvents?.[0].name); // 'testEvent'
console.log('Event type:', resultState._pendingInternalEvents?.[0].type); // 'internal'
```

### Dynamic Event Execution

```typescript
const dynamicRaiseNode = new RaiseNode({
  raise: {
    eventexpr: 'data.action + ".completed"'
  }
});

const stateWithData: InternalState = {
  data: { action: 'upload' },
  _datamodel: 'ecmascript',
  _pendingInternalEvents: []
};

// Execute with dynamic event
const result = await dynamicRaiseNode.run(stateWithData);

console.log('Dynamic event name:', result._pendingInternalEvents?.[0].name); // 'upload.completed'
```

## Properties

The RaiseNode class exposes the following properties:

- `event: string | undefined` - Static event name (mutually exclusive with eventexpr)
- `eventexpr: string | undefined` - Dynamic event expression (mutually exclusive with event)
- `isExecutable: boolean` - Always `true` (inherited from BaseExecutableNode)

## Behavior

### Event Generation Process

The Raise node follows this execution sequence:

1. **Attribute Resolution**: Determine whether to use static event or evaluate expression
2. **Event Name Resolution**: Get the final event name (static or computed)
3. **Event Creation**: Create an internal SCXML event object
4. **Queue Addition**: Add the event to the pending internal events queue
5. **State Return**: Return the updated state with the new event

### Static vs Dynamic Events

#### Static Events (`event` attribute)
```typescript
// Direct event name usage
eventName = this.event; // "userAction"
```

#### Dynamic Events (`eventexpr` attribute)
```typescript
// Expression evaluation
eventName = evaluateExpression(this.eventexpr, state); // Computed at runtime
```

### Event Object Structure

Generated events follow the SCXML event structure:

```typescript
const eventToRaise: SCXMLEvent = {
  name: eventName,        // Resolved event name
  type: 'internal',       // Always internal for raised events
  sendid: '',            // Empty for internal events
  origin: '',            // Empty for internal events
  origintype: '',        // Empty for internal events
  invokeid: '',          // Empty for internal events
  data: {}               // Empty data object
};
```

### Error Handling

The Raise node handles errors gracefully:

1. **Expression Errors**: Failed eventexpr evaluation generates error events
2. **Attribute Errors**: Missing or invalid attributes generate error events
3. **Error Event Generation**: Errors become platform events in the queue
4. **Graceful Degradation**: Errors don't crash the state machine

Error events follow this structure:

```typescript
const errorEvent: SCXMLEvent = {
  name: 'error.raise.bad-attribute',  // Specific error type
  type: 'platform',                  // Platform error type
  sendid: '',
  origin: '',
  origintype: '',
  invokeid: '',
  data: {
    error: errorMessage,              // Error details
    source: 'raise'                   // Error source
  }
};
```

## Event Processing

### Internal Event Queue

Raised events are added to the `_pendingInternalEvents` array:

```typescript
const pendingEvents = state._pendingInternalEvents || [];
return {
  ...state,
  _pendingInternalEvents: [...pendingEvents, eventToRaise]
};
```

### Event Processing Order

1. **Immediate Processing**: Internal events are processed in the current execution cycle
2. **Queue Order**: Events are processed in the order they were raised
3. **Transition Triggering**: Events can trigger transitions immediately
4. **Cascading Events**: Raised events can trigger other raise nodes

### Event Accumulation

Multiple raise nodes accumulate events in the queue:

```xml
<transition event="trigger" target="next">
  <raise event="firstEvent"/>
  <raise event="secondEvent"/>
  <raise event="thirdEvent"/>
</transition>
```

Results in three events in the pending queue, processed in order.

## Common Patterns

### State Change Notifications

```xml
<state id="processing">
  <onentry>
    <raise event="processingStarted"/>
  </onentry>

  <onexit>
    <raise event="processingEnded"/>
  </onexit>
</state>
```

### Conditional Event Broadcasting

```xml
<transition event="complete" target="finished">
  <assign location="success" expr="_event.data.success"/>
  <raise eventexpr="success ? 'operationSuccess' : 'operationFailed'"/>
</transition>
```

### Multi-Event Coordination

```xml
<transition event="userLogin" target="authenticated">
  <assign location="user.authenticated" expr="true"/>
  <raise event="authenticationComplete"/>
  <raise event="sessionStarted"/>
  <raise event="userWelcome"/>
</transition>
```

### Error Event Generation

```xml
<transition event="error" target="errorState">
  <assign location="lastError" expr="_event.data"/>
  <raise event="errorOccurred"/>
  <raise eventexpr="'error.' + _event.data.type"/>
</transition>
```

## Validation

The Raise node uses a custom schema with mutual exclusion:

- **Event XOR EventExpr**: Exactly one of `event` or `eventexpr` must be specified
- **Event**: Optional string for static event names
- **EventExpr**: Optional string for dynamic event expressions

### Validation Examples

```typescript
// Valid: Static event
{ event: 'userAction' }

// Valid: Dynamic event
{ eventexpr: 'data.eventType + ".completed"' }

// Invalid: Both attributes
{ event: 'static', eventexpr: 'dynamic' } // Validation fails

// Invalid: Neither attribute
{} // Validation fails

// Invalid: Empty event
{ event: '' } // Validation fails (empty string not allowed)
```

## Performance Considerations

- **Expression Evaluation**: Dynamic events require JavaScript evaluation
- **Event Queue Growth**: Multiple raises can grow the pending event queue
- **Memory Efficiency**: Events are lightweight objects with minimal data
- **Processing Order**: Events are processed sequentially, not in parallel
- **State Immutability**: Creates new state objects, preserving immutability

## Best Practices

### Use Descriptive Event Names

```xml
<!-- Good: Descriptive event names -->
<raise event="user.authentication.success"/>
<raise event="document.processing.complete"/>

<!-- Avoid: Generic event names -->
<raise event="success"/>
<raise event="done"/>
```

### Namespace Events Hierarchically

```xml
<!-- Good: Hierarchical namespacing -->
<raise event="system.startup.complete"/>
<raise event="user.session.timeout"/>
<raise event="data.validation.failed"/>
```

### Use Dynamic Events for Flexibility

```xml
<!-- Good: Dynamic events for variable scenarios -->
<raise eventexpr="'user.' + data.action + '.completed'"/>
<raise eventexpr="data.success ? 'operation.success' : 'operation.failed'"/>
```

### Coordinate Complex Workflows

```xml
<!-- Good: Multiple events for coordination -->
<transition event="processComplete" target="finished">
  <assign location="result" expr="_event.data"/>
  <raise event="processingComplete"/>
  <raise event="resultReady"/>
  <raise event="notifyUsers"/>
</transition>
```

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<raise>` element is defined in [Section 6.3](https://www.w3.org/TR/scxml/#raise) of the specification.

Key specification compliance:
- Internal event generation with proper event structure
- Mutual exclusion of `event` and `eventexpr` attributes
- Expression evaluation for dynamic event names
- Error handling with platform error events
- Integration with SCXML event processing model
- Proper event queue management

## See Also

- [Transition Node](./transition.md) - Transitions triggered by raised events
- [Assign Node](./assign.md) - Variable assignments often used with raise
- [OnEntry Node](./onentry.md) - Entry actions that can raise events
- [OnExit Node](./onexit.md) - Exit actions that can raise events
- [State Node](./state.md) - States that contain raise nodes
