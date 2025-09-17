# Parallel Node

The `<parallel>` element defines a parallel state where multiple child states are active simultaneously. Unlike regular compound states that have only one active child at a time, parallel states enable concurrent execution of all child states.

## Overview

The Parallel node represents one of the most powerful features of SCXML - the ability to model concurrent behavior within a state machine. When a parallel state is entered, all of its child states become active simultaneously, allowing the state machine to process events in multiple regions concurrently.

This is fundamentally different from regular compound states where only one child state is active at any given time. Parallel states are essential for modeling complex systems that have multiple independent subsystems running concurrently.

The Parallel node extends BaseStateNode and overrides key behaviors to support simultaneous child state activation.

## Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` | `string` | Yes | - | Unique identifier for the parallel state |
| `initial` | `string` | No | - | Not typically used in parallel states |

### ID

The `id` attribute is required and must be unique within the state machine. It identifies the parallel state and is used for:
- Targeting in transitions
- Generating done events (`done.state.{id}`)
- State machine navigation and debugging

### Initial

While the `initial` attribute is inherited from BaseStateNode, it's not typically used in parallel states since all child states are entered simultaneously by default.

## Key Behaviors

### Simultaneous Entry
- **All child states entered**: When the parallel state is entered, ALL child states become active simultaneously
- **Concurrent execution**: Events are processed by all active child states
- **Independent regions**: Each child state operates independently

### Event Processing
- **Broadcast to all**: Events are sent to all active child states
- **Independent responses**: Each child state can respond independently
- **No interference**: Child states don't interfere with each other's event processing

### Completion
- **Done when all complete**: The parallel state is "done" when ALL child states reach final states
- **Done event generation**: Generates `done.state.{parallel_id}` event when complete
- **Partial completion**: Individual child completions don't affect the parallel state

## Usage Examples

### Basic Parallel State

```xml
<parallel id="gameSystems">
  <!-- Health Management System -->
  <state id="healthSystem" initial="healthy">
    <state id="healthy">
      <transition event="damage" target="injured"/>
    </state>
    <state id="injured">
      <transition event="heal" target="healthy"/>
    </state>
  </state>

  <!-- Score Management System -->
  <state id="scoreSystem" initial="scoring">
    <state id="scoring">
      <transition event="collectCoin" target="scoring">
        <assign location="score" expr="score + 10"/>
      </transition>
    </state>
  </state>
</parallel>
```

### Game State Management

```xml
<state id="gameRunning">
  <parallel id="gameSystems">
    <!-- Health Management -->
    <state id="healthSystem" initial="healthy">
      <onentry>
        <assign location="playerHealth" expr="100"/>
      </onentry>

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

      <state id="critical">
        <transition event="heal" target="injured">
          <assign location="playerHealth" expr="playerHealth + 30"/>
        </transition>
        <transition event="damage" target="dead" cond="playerHealth <= 25">
          <assign location="playerHealth" expr="0"/>
        </transition>
      </state>

      <final id="dead">
        <onentry>
          <raise event="gameOver"/>
        </onentry>
      </final>
    </state>

    <!-- Score Management -->
    <state id="scoreSystem" initial="scoring">
      <state id="scoring">
        <transition event="collectCoin" target="scoring">
          <assign location="playerScore" expr="playerScore + 10"/>
        </transition>
        <transition event="collectGem" target="scoring">
          <assign location="playerScore" expr="playerScore + 50"/>
        </transition>
        <transition event="killEnemy" target="scoring">
          <assign location="playerScore" expr="playerScore + 100"/>
        </transition>
      </state>
    </state>

    <!-- Power-up Management -->
    <state id="powerUpSystem" initial="noPowerUp">
      <state id="noPowerUp">
        <transition event="collectPowerUp" target="powerUpActive">
          <assign location="powerUpActive" expr="true"/>
        </transition>
      </state>

      <state id="powerUpActive">
        <onentry>
          <assign location="powerUpActive" expr="true"/>
        </onentry>
        <onexit>
          <assign location="powerUpActive" expr="false"/>
        </onexit>

        <transition event="powerUpExpired" target="noPowerUp"/>
        <transition event="usePowerUp" target="noPowerUp"/>
      </state>
    </state>
  </parallel>

  <!-- Exit when health system completes (player dies) -->
  <transition event="gameOver" target="gameOver"/>
</state>
```

### Multi-System Application

```xml
<parallel id="applicationSystems">
  <!-- User Interface System -->
  <state id="uiSystem" initial="idle">
    <state id="idle">
      <transition event="userAction" target="processing"/>
    </state>
    <state id="processing">
      <transition event="actionComplete" target="idle"/>
    </state>
  </state>

  <!-- Background Services -->
  <state id="backgroundServices" initial="running">
    <state id="running">
      <transition event="pause" target="paused"/>
    </state>
    <state id="paused">
      <transition event="resume" target="running"/>
    </state>
  </state>

  <!-- Network System -->
  <state id="networkSystem" initial="connected">
    <state id="connected">
      <transition event="networkError" target="disconnected"/>
    </state>
    <state id="disconnected">
      <transition event="reconnect" target="connected"/>
    </state>
  </state>
</parallel>
```

### Parallel with Entry/Exit Actions

```xml
<parallel id="systemManager">
  <onentry>
    <assign location="systemStartTime" expr="Date.now()"/>
    <assign location="activeSystemCount" expr="3"/>
  </onentry>

  <onexit>
    <assign location="systemShutdownTime" expr="Date.now()"/>
    <assign location="activeSystemCount" expr="0"/>
  </onexit>

  <state id="system1" initial="active">
    <state id="active"/>
    <final id="complete"/>
  </state>

  <state id="system2" initial="active">
    <state id="active"/>
    <final id="complete"/>
  </state>

  <state id="system3" initial="active">
    <state id="active"/>
    <final id="complete"/>
  </state>
</parallel>
```

## TypeScript Usage

### Creating a Parallel Node

```typescript
import { ParallelNode } from '@your-library/statecharts';

// Basic parallel node
const parallelNode = new ParallelNode({
  parallel: {
    id: 'gameSystems',
    content: '',
    children: []
  }
});

console.log(parallelNode.id); // 'gameSystems'
console.log(parallelNode.isAtomic); // false (always)
console.log(parallelNode.initialState); // '' (empty)
```

### Creating from JSON

```typescript
// From parsed XML/JSON
const result = ParallelNode.createFromJSON({
  parallel: {
    id: 'applicationSystems',
    content: '',
    children: []
  }
});

if (result.success) {
  const parallelNode = result.node;
  console.log(`Parallel state: ${parallelNode.id}`);
  console.log(`Child states: ${parallelNode.activeChildStates.length}`);
} else {
  console.error('Validation failed:', result.error);
}

// Direct JSON format (without 'parallel' wrapper)
const directResult = ParallelNode.createFromJSON({
  id: 'myParallelState'
});
```

### Working with Child States

```typescript
import { StateNode } from '@your-library/statecharts';

const parallelNode = new ParallelNode({
  parallel: {
    id: 'systems',
    content: '',
    children: []
  }
});

// Add child states
const healthSystem = new StateNode({
  state: {
    id: 'healthSystem',
    content: '',
    children: []
  }
});

const scoreSystem = new StateNode({
  state: {
    id: 'scoreSystem',
    content: '',
    children: []
  }
});

parallelNode.children.push(healthSystem, scoreSystem);

// Get all active child states
const activeChildren = parallelNode.activeChildStates;
console.log(`Active children: ${activeChildren.length}`); // 2

// Check if parallel state is complete
console.log(`Is complete: ${parallelNode.isComplete}`);
```

### Mounting Parallel States

```typescript
import { InternalState } from '@your-library/statecharts';

const parallelNode = new ParallelNode({
  parallel: {
    id: 'gameSystems',
    content: '',
    children: []
  }
});

const state: InternalState = {
  data: { gameTime: 0 },
  _datamodel: 'ecmascript'
};

// Mount the parallel state
const mountResponse = await parallelNode.mount(state);

console.log(mountResponse.node.id); // 'gameSystems'
console.log(mountResponse.childPath); // 'region1,region2' (comma-separated)
```

## Properties

The ParallelNode class exposes the following properties:

- `id: string` - The unique identifier for the parallel state
- `initial: string | undefined` - Initial state (typically unused in parallel states)
- `isAtomic: boolean` - Always `false` for parallel states
- `initialState: string` - Always empty string (all children are "initial")
- `activeChildStates: BaseStateNode[]` - All child states (all active simultaneously)
- `isComplete: boolean` - True when all child states have reached final states
- `allowChildren: boolean` - Always `true` (inherited from BaseStateNode)

## Parallel State Behavior

### Entry Behavior

1. **OnEntry Actions**: Execute any `<onentry>` actions first
2. **Child Entry**: Signal that ALL child states should be entered
3. **Simultaneous Activation**: All child states become active at once
4. **Path Generation**: Create comma-separated child path for StateChart

### Event Processing

1. **Event Broadcasting**: Events are sent to all active child states
2. **Independent Processing**: Each child state processes events independently
3. **No Coordination**: Child states don't coordinate their responses
4. **Concurrent Transitions**: Multiple child states can transition simultaneously

### Exit Behavior

1. **Child Exit**: All active child states are exited
2. **OnExit Actions**: Execute any `<onexit>` actions
3. **State Cleanup**: Clean up all parallel region state

### Completion Detection

The parallel state is considered complete when:
- All child states have reached final states
- OR the parallel state has no child states (empty parallel state)

When complete, the parallel state generates a `done.state.{parallel_id}` event.

## State Machine Integration

### Active State Chain

In the StateChart's active state chain, parallel states create multiple concurrent paths:

```
gameRunning
gameRunning.gameSystems
gameRunning.gameSystems.healthSystem.healthy
gameRunning.gameSystems.scoreSystem.scoring
gameRunning.gameSystems.powerUpSystem.noPowerUp
```

### Child Path Format

Parallel states return a special child path format:
- **Regular states**: Single child ID (`"childState"`)
- **Parallel states**: Comma-separated child IDs (`"child1,child2,child3"`)

This signals to the StateChart that all children should be entered simultaneously.

## Validation

The Parallel node performs validation using the BaseStateNodeAttr schema:

- **ID**: Required, must be non-empty string
- **Initial**: Optional string (typically unused)
- **Content**: Optional string content
- **Children**: Optional array of child elements

### Validation Examples

```typescript
// Valid: Basic parallel state
{ id: 'systems' }

// Valid: With initial (though not typically used)
{ id: 'systems', initial: 'defaultRegion' }

// Invalid: Missing ID
{ content: 'test' } // Validation error

// Invalid: Empty ID
{ id: '' } // Validation error
```

## Performance Considerations

- **Concurrent Processing**: Events are processed by all child states simultaneously
- **Memory Usage**: Maintains state for all child regions concurrently
- **Event Complexity**: Event processing complexity scales with number of child states
- **State Space**: Total state space is the product of all child state spaces

## Common Patterns

### Independent Systems

Use parallel states for truly independent subsystems:

```xml
<parallel id="applicationSystems">
  <state id="userInterface" initial="idle"/>
  <state id="dataSync" initial="syncing"/>
  <state id="backgroundTasks" initial="running"/>
</parallel>
```

### Coordinated Systems

Use events for coordination between parallel regions:

```xml
<parallel id="coordinatedSystems">
  <state id="producer" initial="producing">
    <state id="producing">
      <transition event="itemProduced" target="producing">
        <raise event="itemAvailable"/>
      </transition>
    </state>
  </state>

  <state id="consumer" initial="waiting">
    <state id="waiting">
      <transition event="itemAvailable" target="consuming"/>
    </state>
    <state id="consuming">
      <transition event="itemConsumed" target="waiting"/>
    </state>
  </state>
</parallel>
```

### System Lifecycle

Use final states to coordinate parallel system shutdown:

```xml
<parallel id="systemLifecycle">
  <state id="service1" initial="running">
    <state id="running">
      <transition event="shutdown" target="stopped"/>
    </state>
    <final id="stopped"/>
  </state>

  <state id="service2" initial="running">
    <state id="running">
      <transition event="shutdown" target="stopped"/>
    </state>
    <final id="stopped"/>
  </state>
</parallel>
```

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<parallel>` element is defined in [Section 3.4](https://www.w3.org/TR/scxml/#parallel) of the specification.

Key specification compliance:
- All child states are entered simultaneously when parallel state is entered
- Events are processed by all active child states
- Parallel state is "done" when all child states reach final states
- Generates `done.state.{parallel_id}` event when complete
- Supports onentry and onexit actions
- Proper integration with state machine execution model

## See Also

- [State Node](./state.md) - Child states within parallel regions
- [Final Node](./final.md) - Terminal states for parallel completion
- [OnEntry Node](./onentry.md) - Entry actions for parallel states
- [OnExit Node](./onexit.md) - Exit actions for parallel states
- [Transition Node](./transition.md) - Transitions between parallel states

When a parallel state is entered, all of its child states are entered simultaneously. The parallel state is considered to be active as long as at least one of its child states is active. When all of the child states have completed, the parallel state completes.

