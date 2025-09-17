# Data Node

The `<data>` element defines individual data variables within SCXML data models. It specifies the variable identifier, initial value, data type, and source for data model initialization.

## Overview

The Data node is a fundamental component of SCXML data models that declares and initializes individual data variables. It provides multiple ways to specify initial values: static content, dynamic expressions, or external sources.

The Data node extends BaseExecutableNode and is executed during data model initialization to set up the initial state of data variables. Each data node creates a single variable in the state machine's data model with a specified identifier and initial value.

Unlike other executable content, data nodes are primarily used for initialization and are typically contained within `<datamodel>` elements.

## Attributes

The Data node has the following attributes:

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` | `string` | Yes | - | Variable identifier/name |
| `type` | `string` | No | `"text"` | Data type hint |
| `expr` | `string` | No* | - | Expression to evaluate for initial value |
| `src` | `string` | No* | - | External source URL (not yet implemented) |

**Note**: Exactly one of `expr`, `src`, or element content must be specified.

### ID Attribute

The `id` attribute specifies the variable name in the data model:
- **Simple Names**: `"counter"`, `"status"`, `"message"`
- **Camel Case**: `"userName"`, `"isActive"`, `"lastUpdate"`
- **Namespaced**: `"user.name"`, `"config.timeout"` (creates nested objects)

### Type Attribute

The `type` attribute provides a hint about the data type:
- **Text**: `"text"` - String values (default)
- **Number**: `"number"` - Numeric values
- **Boolean**: `"boolean"` - Boolean values
- **Object**: `"object"` - Complex objects
- **Array**: `"array"` - Array values

### Expr Attribute

The `expr` attribute provides dynamic initialization:
- **Literals**: `"'Hello World'"` - string literal
- **Numbers**: `"42"`, `"3.14"` - numeric values
- **Booleans**: `"true"`, `"false"` - boolean values
- **Objects**: `"{ name: 'John', age: 30 }"` - object literals
- **Arrays**: `"[1, 2, 3]"` - array literals
- **Functions**: `"Date.now()"` - function calls
- **Expressions**: `"Math.random() * 100"` - computed values

### Src Attribute

The `src` attribute specifies external data sources (not yet implemented):
- **JSON Files**: `"config.json"` - JSON configuration
- **API Endpoints**: `"https://api.example.com/data"` - remote data
- **Local Files**: `"data/initial.json"` - local data files

## Usage Examples

### Basic Data Declarations

```xml
<datamodel>
  <data id="counter" expr="0"/>
  <data id="message">Hello World</data>
  <data id="isActive" expr="false"/>
  <data id="timestamp" expr="Date.now()"/>
</datamodel>
```

### Complex Data Structures

```xml
<datamodel>
  <data id="user" expr="{ name: '', email: '', role: 'guest' }"/>
  <data id="settings" expr="{ theme: 'light', notifications: true }"/>
  <data id="session" expr="{ startTime: Date.now(), timeout: 3600000 }"/>
  <data id="cache" expr="new Map()"/>
</datamodel>
```

### Game State Data

```xml
<datamodel>
  <data id="playerHealth" expr="100"/>
  <data id="playerScore" expr="0"/>
  <data id="gameTime" expr="0"/>
  <data id="powerUpActive" expr="false"/>
  <data id="level" expr="1"/>
  <data id="inventory" expr="[]"/>
</datamodel>
```

### Application Configuration

```xml
<datamodel>
  <data id="appVersion">1.0.0</data>
  <data id="apiEndpoint">https://api.example.com</data>
  <data id="maxRetries" expr="3"/>
  <data id="timeout" expr="5000"/>
  <data id="features" expr="{ darkMode: true, analytics: false }"/>
</datamodel>
```

### Typed Data Declarations

```xml
<datamodel>
  <data id="count" type="number" expr="0"/>
  <data id="enabled" type="boolean" expr="true"/>
  <data id="items" type="array" expr="[]"/>
  <data id="config" type="object" expr="{}"/>
  <data id="description" type="text">Default description</data>
</datamodel>
```

### Dynamic Initialization

```xml
<datamodel>
  <data id="sessionId" expr="Math.random().toString(36).substr(2, 9)"/>
  <data id="startTime" expr="Date.now()"/>
  <data id="randomSeed" expr="Math.floor(Math.random() * 1000000)"/>
  <data id="deviceInfo" expr="{ userAgent: navigator.userAgent, platform: navigator.platform }"/>
</datamodel>
```

### Nested Object Creation

```xml
<datamodel>
  <data id="user.profile.name">John Doe</data>
  <data id="user.profile.email">john@example.com</data>
  <data id="user.settings.theme">dark</data>
  <data id="user.settings.notifications" expr="true"/>
</datamodel>
```

### External Data Sources (Future)

```xml
<datamodel>
  <!-- Note: src attribute not yet implemented -->
  <data id="config" src="config.json"/>
  <data id="userPreferences" src="user-prefs.json"/>
  <data id="localData" expr="{ initialized: false }"/>
</datamodel>
```

### State-Specific Data

```xml
<state id="processing">
  <datamodel>
    <data id="processId" expr="Math.random().toString(36)"/>
    <data id="startTime" expr="Date.now()"/>
    <data id="progress" expr="0"/>
    <data id="errors" expr="[]"/>
  </datamodel>
  
  <onentry>
    <assign location="status" expr="'processing'"/>
  </onentry>
</state>
```

### Conditional Initialization

```xml
<datamodel>
  <data id="environment" expr="typeof window !== 'undefined' ? 'browser' : 'node'"/>
  <data id="isDevelopment" expr="process.env.NODE_ENV === 'development'"/>
  <data id="apiUrl" expr="isDevelopment ? 'http://localhost:3000' : 'https://api.prod.com'"/>
</datamodel>
```

## TypeScript Usage

### Creating a Data Node with Expression

```typescript
import { DataNode } from '@your-library/statecharts';

// Data node with expression
const counterData = new DataNode({
  data: {
    id: 'counter',
    type: 'number',
    expr: '0'
  }
});

console.log(counterData.id); // 'counter'
console.log(counterData.type); // 'number'
console.log(counterData.expr); // '0'
console.log(counterData.isExecutable); // true
```

### Creating a Data Node with Content

```typescript
// Data node with static content
const messageData = new DataNode({
  data: {
    id: 'message',
    type: 'text',
    content: 'Hello World'
  }
});

console.log(messageData.id); // 'message'
console.log(messageData.content); // 'Hello World'
console.log(messageData.expr); // undefined
```

### Creating from JSON

```typescript
// From parsed XML/JSON with expression
const exprResult = DataNode.createFromJSON({
  data: {
    id: 'timestamp',
    type: 'number',
    expr: 'Date.now()'
  }
});

if (exprResult.success) {
  const dataNode = exprResult.node;
  console.log('Expression data node created:', dataNode.id);
} else {
  console.error('Validation failed:', exprResult.error);
}

// From parsed XML/JSON with content
const contentResult = DataNode.createFromJSON({
  data: {
    id: 'status',
    content: 'ready'
  }
});

if (contentResult.success) {
  const dataNode = contentResult.node;
  console.log('Content data node created:', dataNode.id);
}
```

### Executing Data Initialization

```typescript
import { InternalState } from '@your-library/statecharts';

const dataNode = new DataNode({
  data: {
    id: 'counter',
    expr: '42'
  }
});

const state: InternalState = {
  data: {},
  _datamodel: 'ecmascript'
};

// Execute data initialization
const resultState = await dataNode.run(state);

console.log('Data initialized:', resultState.data); // { counter: 42 }
console.log('Variable created:', resultState.data.counter); // 42
```

### Complex Object Initialization

```typescript
const userDataNode = new DataNode({
  data: {
    id: 'user',
    type: 'object',
    expr: '{ name: "John", age: 30, active: true }'
  }
});

const initialState: InternalState = {
  data: {},
  _datamodel: 'ecmascript'
};

const result = await userDataNode.run(initialState);

console.log('User object:', result.data.user);
// { name: "John", age: 30, active: true }
```

## Properties

The DataNode class exposes the following properties:

- `id: string` - Variable identifier in the data model
- `type: string` - Data type hint (defaults to "text")
- `expr: string | undefined` - Expression for dynamic initialization
- `src: string | undefined` - External source URL (not yet implemented)
- `content: string` - Static content value
- `isExecutable: boolean` - Always `true` (inherited from BaseExecutableNode)

## Behavior

### Initialization Process

The Data node follows this initialization sequence:

1. **Value Resolution**: Determine the initial value source (expr, src, or content)
2. **Expression Evaluation**: Evaluate expressions in the current state context
3. **Value Assignment**: Set the variable in the data model
4. **State Update**: Return the updated state with the new variable

### Value Resolution Priority

The Data node resolves values in this order:

1. **Expression (`expr`)**: If present, evaluate the expression
2. **External Source (`src`)**: If present, load from external source (not implemented)
3. **Content**: Use the element's text content as a literal value

### Expression Evaluation

When using the `expr` attribute:

```typescript
if (this.expr) {
  // Evaluate the expression to get the value
  value = evaluateExpression(this.expr, state);
}
```

This allows for:
- **Dynamic Values**: `Date.now()`, `Math.random()`
- **Computed Values**: `10 * 5`, `'Hello' + ' World'`
- **Object Creation**: `{ key: 'value' }`
- **Array Creation**: `[1, 2, 3]`

### Content-Based Initialization

When using element content:

```typescript
else {
  // Use child content as the value
  value = this.content;
}
```

This provides:
- **String Literals**: Direct text content
- **Simple Values**: Numbers, booleans as strings
- **Static Configuration**: Fixed values

### Data Model Integration

The initialized variable is added to the state's data model:

```typescript
return {
  ...state,
  data: {
    ...state.data,
    [this.id]: value
  }
};
```

This ensures:
- **Immutable Updates**: State is not mutated directly
- **Variable Scoping**: Variables are accessible by their ID
- **Type Preservation**: Values maintain their evaluated types

## Error Handling

The Data node handles errors in several ways:

### Expression Errors

Failed expression evaluation generates error events and uses fallback values.

### Source Loading Errors

The `src` attribute currently generates a "not implemented" error:

```typescript
if (this.src) {
  return addPendingEvent(state, {
    name: 'error.data.src-not-implemented',
    type: 'platform',
    // ... error details
  });
}
```

### Validation Errors

Schema validation ensures exactly one value source is specified.

## Common Patterns

### Counter Variables

```xml
<data id="counter" type="number" expr="0"/>
<data id="maxCount" type="number" expr="100"/>
```

### Configuration Data

```xml
<data id="apiUrl">https://api.example.com</data>
<data id="timeout" type="number" expr="5000"/>
<data id="retries" type="number" expr="3"/>
```

### User State

```xml
<data id="user" type="object" expr="{ authenticated: false, role: 'guest' }"/>
<data id="session" type="object" expr="{ active: false, startTime: null }"/>
```

### Game State

```xml
<data id="player" type="object" expr="{ health: 100, score: 0, level: 1 }"/>
<data id="gameState" expr="'menu'"/>
<data id="inventory" type="array" expr="[]"/>
```

### Dynamic Initialization

```xml
<data id="sessionId" expr="Math.random().toString(36).substr(2, 9)"/>
<data id="timestamp" expr="Date.now()"/>
<data id="environment" expr="typeof window !== 'undefined' ? 'browser' : 'node'"/>
```

## Validation

The Data node uses a custom schema with mutual exclusion:

- **ID**: Required string identifier
- **Type**: Optional string (defaults to "text")
- **Value Source**: Exactly one of `expr`, `src`, or content must be specified
- **Expr**: Optional string for expressions
- **Src**: Optional string for external sources

### Validation Examples

```typescript
// Valid: Expression-based
{ id: 'counter', expr: '0' }

// Valid: Content-based
{ id: 'message', content: 'Hello' }

// Valid: With type hint
{ id: 'enabled', type: 'boolean', expr: 'true' }

// Invalid: Missing value source
{ id: 'empty' } // Validation fails

// Invalid: Multiple value sources
{ id: 'conflict', expr: '0', content: 'text' } // Validation fails

// Invalid: Missing ID
{ expr: '42' } // Validation fails
```

## Performance Considerations

- **Expression Evaluation**: Dynamic expressions require JavaScript evaluation
- **Object Creation**: Complex objects may impact initialization time
- **Memory Usage**: Large data structures consume more memory
- **Initialization Order**: Data nodes execute in document order
- **State Immutability**: Creates new state objects, preserving immutability

## Best Practices

### Use Descriptive IDs

```xml
<!-- Good: Descriptive variable names -->
<data id="userAuthenticated" expr="false"/>
<data id="sessionTimeout" expr="3600000"/>

<!-- Avoid: Generic names -->
<data id="flag" expr="false"/>
<data id="value" expr="0"/>
```

### Specify Types for Clarity

```xml
<!-- Good: Type hints for clarity -->
<data id="count" type="number" expr="0"/>
<data id="enabled" type="boolean" expr="true"/>
<data id="items" type="array" expr="[]"/>
```

### Use Expressions for Dynamic Values

```xml
<!-- Good: Dynamic initialization -->
<data id="startTime" expr="Date.now()"/>
<data id="sessionId" expr="Math.random().toString(36)"/>

<!-- Good: Computed values -->
<data id="maxRetries" expr="isDevelopment ? 10 : 3"/>
```

### Group Related Data

```xml
<!-- Good: Logical grouping -->
<datamodel>
  <!-- User-related data -->
  <data id="user.name">Guest</data>
  <data id="user.authenticated" expr="false"/>

  <!-- Application settings -->
  <data id="app.theme">light</data>
  <data id="app.version">1.0.0</data>
</datamodel>
```

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<data>` element is defined in [Section 5.2.2](https://www.w3.org/TR/scxml/#data) of the specification.

Key specification compliance:
- Variable declaration with unique identifiers
- Multiple value sources (expr, src, content)
- Type hints for data model variables
- Expression evaluation in state context
- Integration with data model initialization
- Error handling for failed initialization

## See Also

- [DataModel Node](./datamodel.md) - Container for data declarations
- [Assign Node](./assign.md) - Variable assignment during execution
- [SCXML Node](./scxml.md) - Root node with datamodel attribute
- [State Node](./state.md) - States that can contain local data models
- [Transition Node](./transition.md) - Transitions that can modify data
