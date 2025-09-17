# State Node

The `<state>` element represents an individual state in an SCXML state machine. States can be atomic (leaf states) or compound (containing child states), and can include entry/exit actions and transitions.

## Overview

State nodes are the fundamental building blocks of SCXML state machines. They encapsulate specific states of the machine and can contain transitions, entry/exit actions, and nested child states. The StateNode class extends BaseStateNode, providing full state machine functionality including mounting/unmounting behavior and child state management.

## Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` | `string` | Yes | - | Unique identifier for the state |
| `initial` | `string` | No | `""` | ID of the initial child state (for compound states) |

### ID

A unique identifier for the state within the state machine. This is required and must be a non-empty string. The ID is used for:
- Targeting states in transitions
- Referencing states in the state machine hierarchy
- Debugging and state tracking

### Initial

For compound states (states with child states), this specifies which child state should be entered by default. If not specified, the state machine will use other mechanisms to determine the initial child state:
1. An explicit `<initial>` child element
2. The first child state in document order

## State Types

### Atomic States

Atomic states are leaf states that contain no child states. They represent the actual operational states of the machine.

```xml
<state id="idle">
  <onentry>
    <assign location="status" expr="'ready'"/>
  </onentry>
  
  <transition event="start" target="active"/>
</state>
```

### Compound States

Compound states contain one or more child states and must specify which child state is initially active.

```xml
<state id="gameRunning" initial="playing">
  <state id="playing">
    <transition event="pause" target="paused"/>
  </state>
  
  <state id="paused">
    <transition event="resume" target="playing"/>
  </state>
</state>
```

## Usage Examples

### Basic State with Transitions

```xml
<state id="idle">
  <transition event="start" target="active"/>
  <transition event="shutdown" target="offline"/>
</state>
```

### State with Entry and Exit Actions

```xml
<state id="active">
  <onentry>
    <assign location="startTime" expr="Date.now()"/>
    <assign location="status" expr="'running'"/>
  </onentry>
  
  <onexit>
    <assign location="endTime" expr="Date.now()"/>
    <assign location="status" expr="'stopped'"/>
  </onexit>
  
  <transition event="stop" target="idle"/>
</state>
```

### Compound State with Initial State

```xml
<state id="healthSystem" initial="healthy">
  <onentry>
    <assign location="playerHealth" expr="100"/>
  </onentry>

  <state id="healthy">
    <transition event="damage" target="injured" cond="playerHealth > 50">
      <assign location="playerHealth" expr="playerHealth - 25"/>
    </transition>
  </state>

  <state id="injured">
    <transition event="heal" target="healthy">
      <assign location="playerHealth" expr="playerHealth + 30"/>
    </transition>
  </state>
</state>
```

### Nested State Hierarchy

```xml
<state id="application" initial="loading">
  <state id="loading">
    <transition event="loaded" target="main"/>
  </state>
  
  <state id="main" initial="dashboard">
    <state id="dashboard">
      <transition event="navigate.settings" target="settings"/>
    </state>
    
    <state id="settings">
      <transition event="navigate.back" target="dashboard"/>
    </state>
  </state>
</state>
```

## TypeScript Usage

### Creating a State Node

```typescript
import { StateNode } from '@your-library/statecharts';

// Atomic state
const idleState = new StateNode({
  state: {
    id: 'idle',
    content: '',
    children: []
  }
});

// Compound state with initial child
const gameState = new StateNode({
  state: {
    id: 'gameRunning',
    initial: 'playing',
    content: '',
    children: []
  }
});
```

### Creating from JSON

```typescript
// From parsed XML/JSON
const result = StateNode.createFromJSON({
  state: {
    id: 'active',
    initial: 'substate1'
  }
});

if (result.success) {
  const stateNode = result.node;
  console.log(`Created state: ${stateNode.id}`);
  console.log(`Initial child: ${stateNode.initial}`);
} else {
  console.error('Validation failed:', result.error);
}

// Direct JSON format (without 'state' wrapper)
const directResult = StateNode.createFromJSON({
  id: 'myState',
  content: 'State content',
  initial: 'childState'
});
```

## Properties

The StateNode class exposes the following readonly properties:

- `id: string` - The unique state identifier
- `initial: string` - The initial child state ID (empty string if not specified)

## Inherited Functionality

StateNode inherits from BaseStateNode, providing additional functionality:

### State Classification
- `isAtomic: boolean` - True if the state has no child states
- `initialState: string` - Computed initial child state

### Child State Management
- `getChildState(id?: string)` - Get child states by ID or all child states
- `getChildrenOfType<T>(typeCtor)` - Get children of specific type

### Entry/Exit Behavior
- `mount(state): Promise<MountResponse>` - Execute entry actions and determine next state
- `unmount(state): Promise<InternalState>` - Execute exit actions

### Action Handlers
- `getOnEntryNodes()` - Get all onentry action nodes
- `getOnExitNodes()` - Get all onexit action nodes

## Validation

The State node performs validation on its attributes:

- **ID**: Required, must be a non-empty string
- **Initial**: Optional string, no format restrictions

Invalid values will cause `createFromJSON()` to return a validation error.

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<state>` element is defined in [Section 3.3](https://www.w3.org/TR/scxml/#state) of the specification.

## See Also

- [SCXML Node](./scxml.md) - Root state machine container
- [Transition Node](./transition.md) - State transitions
- [OnEntry Node](./onentry.md) - Entry actions
- [OnExit Node](./onexit.md) - Exit actions
- [Parallel Node](./parallel.md) - Parallel state execution
