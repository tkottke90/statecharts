# Final Node

The `<final>` element represents a final state in an SCXML state machine. Final states indicate the completion of a state or the entire state machine and automatically generate completion events.

## Overview

Final states are terminal states that signify the end of execution for a particular state or the entire state machine. When a final state is entered, it automatically generates a `done.state.{parent_id}` event to notify the parent state that its execution has completed. Final states can contain entry actions but cannot have outgoing transitions.

## Attributes

| Attribute | Type     | Required | Default | Description                           |
| --------- | -------- | -------- | ------- | ------------------------------------- |
| `id`      | `string` | Yes      | -       | Unique identifier for the final state |

### ID

A unique identifier for the final state within the state machine. This is required and must be a non-empty string. The ID is used for:

- Identifying the final state in the state machine hierarchy
- Generating the appropriate `done.state.{parent_id}` event
- Debugging and state tracking

## Behavior

### Done Event Generation

When a final state is entered, it automatically generates a `done.state.{parent_id}` event:

- **For nested final states**: Generates `done.state.{parent_id}` where `parent_id` is derived from the final state's ID
- **For top-level final states**: No done event is generated (terminates the entire state machine)

### Event Generation Logic

The parent state ID is determined by removing the last segment from the final state's dot-separated ID:

- `game.level1.completed` → generates `done.state.game.level1`
- `healthSystem.dead` → generates `done.state.healthSystem`
- `terminated` → no event (top-level final state)

## Usage Examples

### Basic Final State

```xml
<state id="processing">
  <transition event="complete" target="finished"/>
</state>

<final id="finished">
  <onentry>
    <assign location="completionTime" expr="Date.now()"/>
  </onentry>
</final>
```

### Final State in Compound State

```xml
<state id="gameLevel" initial="playing">
  <state id="playing">
    <transition event="win" target="victory"/>
    <transition event="lose" target="defeat"/>
  </state>

  <final id="victory">
    <onentry>
      <assign location="score" expr="score + 1000"/>
      <raise event="levelComplete"/>
    </onentry>
  </final>

  <final id="defeat">
    <onentry>
      <assign location="lives" expr="lives - 1"/>
    </onentry>
  </final>

  <!-- This transition will be triggered by done.state.gameLevel -->
  <transition event="done.state.gameLevel" target="nextLevel"/>
</state>
```

### Parallel State with Final States

```xml
<parallel id="gameSystems">
  <state id="healthSystem" initial="healthy">
    <state id="healthy">
      <transition event="damage" target="dead" cond="health <= 0"/>
    </state>

    <final id="dead">
      <onentry>
        <raise event="gameOver"/>
      </onentry>
    </final>
  </state>

  <state id="scoreSystem" initial="scoring">
    <state id="scoring">
      <transition event="maxScore" target="completed"/>
    </state>

    <final id="completed"/>
  </state>
</parallel>

<!-- Triggered when healthSystem completes -->
<transition event="done.state.healthSystem" target="gameOver"/>
```

### Top-Level Final State (State Machine Termination)

```xml
<scxml initial="start">
  <state id="start">
    <transition event="shutdown" target="terminated"/>
  </state>

  <!-- This final state terminates the entire state machine -->
  <final id="terminated">
    <onentry>
      <assign location="shutdownTime" expr="Date.now()"/>
    </onentry>
  </final>
</scxml>
```

### Multiple Final States

```xml
<state id="workflow" initial="step1">
  <state id="step1">
    <transition event="success" target="completed"/>
    <transition event="error" target="failed"/>
    <transition event="cancel" target="cancelled"/>
  </state>

  <final id="completed">
    <onentry>
      <assign location="result" expr="'success'"/>
    </onentry>
  </final>

  <final id="failed">
    <onentry>
      <assign location="result" expr="'error'"/>
      <assign location="errorTime" expr="Date.now()"/>
    </onentry>
  </final>

  <final id="cancelled">
    <onentry>
      <assign location="result" expr="'cancelled'"/>
    </onentry>
  </final>
</state>
```

## TypeScript Usage

### Creating a Final Node

```typescript
import { FinalNode } from '@your-library/statecharts';

// Basic final state
const finalState = new FinalNode({
  final: {
    id: 'completed',
    content: '',
    children: [],
  },
});

// Nested final state (will generate done event)
const nestedFinal = new FinalNode({
  final: {
    id: 'game.level1.victory',
    content: '',
    children: [],
  },
});
```

### Creating from JSON

```typescript
// From parsed XML/JSON
const result = FinalNode.createFromJSON({
  final: {
    id: 'finished',
  },
});

if (result.success) {
  const finalNode = result.node;
  console.log(`Created final state: ${finalNode.id}`);
} else {
  console.error('Validation failed:', result.error);
}

// Direct JSON format (without 'final' wrapper)
const directResult = FinalNode.createFromJSON({
  id: 'terminated',
});
```

### Handling Mount Behavior

```typescript
import { InternalState } from '@your-library/statecharts';

const finalNode = new FinalNode({
  final: { id: 'game.combat.victory', content: '', children: [] },
});

const state: InternalState = {
  data: { score: 100 },
  _datamodel: 'ecmascript',
};

// Mount the final state (triggers done event generation)
const result = await finalNode.mount(state);

// Check for generated done event
if (result.state._pendingInternalEvents) {
  const doneEvent = result.state._pendingInternalEvents.find(
    event => event.name === 'done.state.game.combat',
  );
  console.log('Done event generated:', doneEvent);
}
```

## Properties

The FinalNode class exposes the following readonly property:

- `id: string` - The unique final state identifier

## Methods

### mount(state: InternalState): Promise<MountResponse>

Overrides the base mount method to:

1. Execute any onentry actions (inherited from BaseStateNode)
2. Generate the appropriate `done.state.{parent_id}` event if this is not a top-level final state
3. Add the done event to the pending internal events queue
4. Handle any errors during mounting

## Event Generation

Final states automatically generate completion events following the SCXML specification:

- **Event Name**: `done.state.{parent_id}`
- **Event Type**: `internal`
- **Event Data**: Empty object `{}`

The done event is added to the `_pendingInternalEvents` queue and will be processed in the next event processing cycle.

## Validation

The Final node performs validation on its attributes:

- **ID**: Required, must be a non-empty string

Invalid values will cause `createFromJSON()` to return a validation error.

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<final>` element is defined in [Section 3.4](https://www.w3.org/TR/scxml/#final) of the specification.

Key specification compliance:

- Automatic generation of `done.state.{parent_id}` events
- Support for onentry actions
- No outgoing transitions allowed
- Top-level final states terminate the state machine

## See Also

- [State Node](./state.md) - Regular states
- [OnEntry Node](./onentry.md) - Entry actions
- [Transition Node](./transition.md) - State transitions
- [Parallel Node](./parallel.md) - Parallel state execution
