# Assign Node

The `<assign>` element is an executable content node that assigns values to variables in the state machine's data model. It supports both expression evaluation and literal content assignment.

## Overview

The Assign node is one of the core executable content elements in SCXML, used to modify the state machine's data model during execution. It can assign values using JavaScript expressions or literal content, and supports complex nested object paths using dot notation and array indexing.

The Assign node extends BaseExecutableNode, making it executable within transitions, onentry actions, onexit actions, and other executable contexts.

## Attributes

| Attribute  | Type     | Required | Default | Description                                         |
| ---------- | -------- | -------- | ------- | --------------------------------------------------- |
| `location` | `string` | Yes      | -       | The data model location to assign to                |
| `expr`     | `string` | No\*     | -       | JavaScript expression to evaluate for the value     |
| `content`  | `string` | No\*     | `""`    | Literal content to assign (inherited from BaseNode) |

\*Either `expr` or content must be specified, but not both.

### Location

The `location` attribute specifies where in the data model to assign the value. It supports:

- Simple property names: `"status"`
- Nested object paths: `"user.profile.name"`
- Array indexing: `"items[0].name"`
- Complex paths: `"app.config.database.connection.host"`

### Expression vs Content

The Assign node supports two mutually exclusive ways to specify the value:

1. **Expression (`expr`)**: Expression to evaluate based on the the configured `datamodel` on the root `<scxml>` node
2. **Content**: Literal string value or child element content

## Usage Examples

### Basic Assignment with Expression

```xml
<assign location="status" expr="'active'"/>
<assign location="timestamp" expr="Date.now()"/> <!-- Requires <scxml datamodel="ecmascript"> -->
<assign location="count" expr="count + 1"/>
```

### Assignment with Literal Content

```xml
<assign location="message">Hello World</assign>
<assign location="status">ready</assign>
```

### Complex Object Assignment

```xml
<assign location="user.profile.name" expr="'John Doe'"/>
<assign location="user.profile.email" expr="'john@example.com'"/>
<assign location="user.settings.theme" expr="'dark'"/>
```

### Array Operations

```xml
<assign location="items[0].status" expr="'completed'"/>
<assign location="scores[scores.length]" expr="newScore"/>
<assign location="history.push" expr="currentState"/>
```

### In State Entry Actions

```xml
<state id="active">
  <onentry>
    <assign location="startTime" expr="Date.now()"/>
    <assign location="status" expr="'running'"/>
    <assign location="attempts" expr="attempts + 1"/>
  </onentry>

  <transition event="complete" target="finished"/>
</state>
```

### In Transitions

```xml
<state id="processing">
  <transition event="success" target="completed">
    <assign location="result" expr="'success'"/>
    <assign location="completedAt" expr="Date.now()"/>
  </transition>

  <transition event="error" target="failed">
    <assign location="result" expr="'error'"/>
    <assign location="errorMessage" expr="_event.data.message"/>
  </transition>
</state>
```

### Game State Management

```xml
<state id="playing">
  <transition event="collectCoin" target="playing">
    <assign location="playerScore" expr="playerScore + 10"/>
    <assign location="coinsCollected" expr="coinsCollected + 1"/>
  </transition>

  <transition event="damage" target="injured" cond="playerHealth > 25">
    <assign location="playerHealth" expr="playerHealth - 25"/>
    <assign location="lastDamageTime" expr="Date.now()"/>
  </transition>
</state>
```

### Complex Data Structures

```xml
<state id="initialization">
  <onentry>
    <assign location="app.config.database.host" expr="'localhost'"/>
    <assign location="app.config.database.port" expr="5432"/>
    <assign location="app.config.features.logging" expr="true"/>
    <assign location="app.version" expr="'1.0.0'"/>
  </onentry>
</state>
```

## TypeScript Usage

### Creating an Assign Node

```typescript
import { AssignNode } from '@your-library/statecharts';

// Assignment with expression
const assignNode = new AssignNode({
  assign: {
    location: 'user.name',
    expr: '"John Doe"',
    content: '',
    children: [],
  },
});

// Assignment with content
const contentAssignNode = new AssignNode({
  assign: {
    location: 'status',
    content: 'active',
    children: [],
  },
});
```

### Creating from JSON

```typescript
// From parsed XML/JSON with expression
const result = AssignNode.createFromJSON({
  assign: {
    location: 'counter',
    expr: 'counter + 1',
  },
});

if (result.success) {
  const assignNode = result.node;
  console.log(`Assigning to: ${assignNode.location}`);
  console.log(`Expression: ${assignNode.expr}`);
} else {
  console.error('Validation failed:', result.error);
}

// Direct JSON format (without 'assign' wrapper)
const directResult = AssignNode.createFromJSON({
  location: 'message',
  content: 'Hello World',
});
```

### Executing Assignment

```typescript
import { InternalState } from '@your-library/statecharts';

const assignNode = new AssignNode({
  assign: {
    location: 'user.email',
    expr: '"user@example.com"',
    content: '',
    children: [],
  },
});

const state: InternalState = {
  data: { user: { name: 'John' } },
  _datamodel: 'ecmascript',
};

// Execute the assignment
const updatedState = await assignNode.run(state);

console.log(updatedState.data);
// Output: { user: { name: 'John', email: 'user@example.com' } }
```

## Properties

The AssignNode class exposes the following readonly properties:

- `location: string` - The data model location to assign to
- `expr: string | undefined` - The JavaScript expression (if specified)
- `isExecutable: boolean` - Always `true` (inherited from BaseExecutableNode)

## Expression Evaluation

The Assign node uses the state machine's expression evaluator to process JavaScript expressions:

### Available Context

Expressions have access to:

- **Data model**: All variables in `state.data`
- **Event data**: Current event via `_event` variable
- **Built-in functions**: JavaScript standard library
- **State context**: Current state information

### Expression Examples

```typescript
// Simple arithmetic
expr: 'count + 1';

// String operations
expr: "'Hello ' + user.name";

// Conditional assignment
expr: "score > 100 ? 'high' : 'normal'";

// Date operations
expr: 'Date.now()';

// Event data access
expr: '_event.data.value';

// Complex calculations
expr: 'Math.round(playerHealth / maxHealth * 100)';
```

## Error Handling

The Assign node includes comprehensive error handling:

### Expression Errors

If expression evaluation fails, the node:

1. Catches the JavaScript error
2. Creates an SCXML error event
3. Sets event name to `error.assign.src-not-implemented`
4. Adds error details to event data
5. Adds the error event to pending events queue

### Location Errors

Invalid location paths are handled gracefully using Lodash's `set` function, which creates nested objects as needed.

## Validation

The Assign node performs strict validation:

- **Location**: Required, must be non-empty string
- **Expression XOR Content**: Must specify either `expr` OR content, but not both
- **Schema validation**: Full Zod schema validation on creation

### Validation Examples

```typescript
// Valid: Expression only
{ location: 'status', expr: '"active"' }

// Valid: Content only
{ location: 'message', content: 'Hello' }

// Invalid: Both expression and content
{ location: 'value', expr: '42', content: 'text' } // Validation error

// Invalid: Neither expression nor content
{ location: 'value' } // Validation error

// Invalid: Empty location
{ location: '', expr: '"value"' } // Validation error
```

## Performance Considerations

- **Immutable Updates**: Creates new state objects, preserving immutability
- **Deep Path Creation**: Automatically creates nested object structures
- **Expression Caching**: Expression evaluation is optimized for performance
- **Memory Efficient**: Uses structural sharing where possible

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<assign>` element is defined in [Section 5.4.1](https://www.w3.org/TR/scxml/#assign) of the specification.

Key specification compliance:

- Supports both `expr` attribute and content-based assignment
- Proper error handling with SCXML error events
- Integration with data model and expression evaluation
- Executable content behavior in transitions and state actions

## See Also

- [Data Node](./data.md) - Data model declarations
- [OnEntry Node](./onentry.md) - Entry actions container
- [OnExit Node](./onexit.md) - Exit actions container
- [Transition Node](./transition.md) - Transition executable content
