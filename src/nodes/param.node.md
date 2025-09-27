# ParamNode - SCXML `<param>` Element

The `<param>` element is used to specify parameters that are passed to external systems or services. It provides a flexible way to include data in external communications such as HTTP requests or inter-state-machine messages.

## Overview

The `<param>` element allows you to define name-value pairs that are collected and included in the data payload of external communications. Each parameter can get its value from an expression, a location in the data model, or static content.

### Key Features

- **Multiple Value Sources**: Support for expressions, location references, and static content
- **Expression Evaluation**: Dynamic parameter values using ECMAScript expressions
- **Data Model Integration**: Access to state machine data model and system variables
- **Validation**: Strict validation ensures exactly one value source per parameter
- **Error Handling**: Comprehensive error reporting for debugging

## SCXML Specification

According to the W3C SCXML specification, `<param>` elements are used within `<send>` and `<invoke>` elements to specify parameters for external communication.

### Attributes

- **`name`** (required): The name of the parameter
- **`expr`** (optional): ECMAScript expression to evaluate for the parameter value
- **`location`** (optional): Location in the data model to read the value from

### Content

- **Text content**: Static value for the parameter (alternative to `expr` or `location`)

### Validation Rules

- Exactly one value source must be specified (`expr`, `location`, or content)
- The `name` attribute is required and must not be empty
- Cannot specify multiple value sources simultaneously

## Usage Examples

### Expression-based Parameters

```xml
<send event="userUpdate" target="http://api.example.com/users" type="http">
  <param name="userId" expr="data.user.id"/>
  <param name="timestamp" expr="Date.now()"/>
  <param name="fullName" expr="data.user.firstName + ' ' + data.user.lastName"/>
</send>
```

### Location-based Parameters

```xml
<send event="notification" target="http://notify.example.com" type="http">
  <param name="message" location="data.currentMessage"/>
  <param name="recipient" location="data.user.email"/>
</send>
```

### Static Content Parameters

```xml
<send event="systemEvent" target="scxml:monitor" type="scxml">
  <param name="source">payment-processor</param>
  <param name="version">1.0.0</param>
</send>
```

### Mixed Parameter Types

```xml
<send event="orderComplete" target="http://orders.example.com/webhook" type="http">
  <param name="orderId" expr="data.order.id"/>
  <param name="status">completed</param>
  <param name="customerEmail" location="data.customer.email"/>
  <param name="completedAt" expr="new Date().toISOString()"/>
</send>
```

## Implementation Details

### Class Structure

```typescript
class ParamNode extends BaseExecutableNode {
  readonly name: string;
  readonly expr?: string;
  readonly location?: string;
  readonly content?: string;

  async evaluateValue(state: InternalState): Promise<unknown>;
  async getNameValuePair(state: InternalState): Promise<[string, unknown]>;
}
```

### Value Evaluation Priority

1. **Expression (`expr`)**: Evaluated using ECMAScript expression evaluator
2. **Location (`location`)**: Evaluated as a location expression in the data model
3. **Content**: Used as static string value
4. **Child Content**: Text content from child nodes (for XML parsing)

### Expression Context

When evaluating expressions, the following context is available:

- **`data`**: The state machine's data model
- **`_event`**: Current event information
- **`_name`**: State machine name
- **`_sessionId`**: Session identifier
- **Standard JavaScript**: Date, Math, String methods, etc.

## API Reference

### Constructor

```typescript
new ParamNode(json: any)
```

Creates a new ParamNode instance from JSON representation.

### Methods

#### `evaluateValue(state: InternalState): Promise<unknown>`

Evaluates the parameter value based on the configured value source.

**Parameters:**

- `state`: Current internal state of the state machine

**Returns:** Promise resolving to the evaluated parameter value

**Throws:** Error if evaluation fails

#### `getNameValuePair(state: InternalState): Promise<[string, unknown]>`

Returns a tuple containing the parameter name and its evaluated value.

**Parameters:**

- `state`: Current internal state of the state machine

**Returns:** Promise resolving to `[name, value]` tuple

#### `run(state: InternalState): Promise<InternalState>`

No-op method since ParamNode execution is handled by parent nodes.

**Returns:** Unchanged state

### Static Methods

#### `createFromJSON(json: any): CreateNodeResult<ParamNode>`

Creates a ParamNode instance from JSON with validation.

**Returns:** Object with `success`, `node`, and `error` properties

## Utility Functions

### `collectParamValues(paramNodes: ParamNode[], state: InternalState): Promise<Record<string, unknown>>`

Collects all parameter values from an array of ParamNode instances into a single object.

**Parameters:**

- `paramNodes`: Array of ParamNode instances
- `state`: Current internal state

**Returns:** Promise resolving to object with parameter names as keys and evaluated values as values

**Example:**

```typescript
const params = await collectParamValues(
  [
    paramNode1, // name: 'userId', value: 123
    paramNode2, // name: 'status', value: 'active'
  ],
  state,
);

// Result: { userId: 123, status: 'active' }
```

## Error Handling

### Common Errors

1. **Validation Errors**:
   - Missing `name` attribute
   - Multiple value sources specified
   - No value source specified

2. **Evaluation Errors**:
   - Invalid expression syntax
   - Reference to undefined variables
   - Type conversion errors

3. **Collection Errors**:
   - Parameter evaluation failure during collection
   - Duplicate parameter names

### Error Messages

The implementation provides detailed error messages for debugging:

```typescript
// Expression evaluation error
"Failed to evaluate param 'userId': ReferenceError: user is not defined";

// Collection error
"Failed to collect parameter 'status': Invalid expression syntax";
```

## Integration Examples

### With SendNode

```typescript
// ParamNode instances are automatically processed by SendNode
const sendNode = new SendNode(
  {
    send: {
      event: 'dataUpdate',
      target: 'http://api.example.com',
      type: 'http',
      children: [paramNode1, paramNode2],
    },
  },
  processorRegistry,
);
```

### Manual Parameter Collection

```typescript
const paramNodes = [
  new ParamNode({ param: { name: 'id', expr: 'data.user.id' } }),
  new ParamNode({ param: { name: 'name', content: 'John Doe' } }),
];

const parameters = await collectParamValues(paramNodes, currentState);
// Use parameters in custom logic
```

## Best Practices

1. **Use Expressions for Dynamic Values**: Prefer `expr` for calculated or dynamic values
2. **Use Location for Simple References**: Use `location` for direct data model references
3. **Use Content for Static Values**: Use content for constants and static strings
4. **Validate Data Model Access**: Ensure expressions reference valid data model paths
5. **Handle Evaluation Errors**: Wrap parameter collection in try-catch blocks
6. **Meaningful Parameter Names**: Use descriptive names that clearly indicate the parameter's purpose

## Testing

The ParamNode implementation includes comprehensive unit tests covering:

- Creation and validation from XML and JSON
- Expression evaluation with various data types
- Location-based value resolution
- Static content handling
- Error scenarios and edge cases
- Integration with parent nodes
- Parameter collection utilities

Run tests with:

```bash
npm test -- src/nodes/param.node.spec.ts
```
