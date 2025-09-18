# Log Node

The `<log>` element is an executable content node that generates logging output for debugging and monitoring purposes. It can log either the result of expression evaluation or literal text content.

## Overview

The Log node is a utility executable content element in SCXML, used to output debugging information during state machine execution. It supports both dynamic expression evaluation and static text content, with optional labeling for categorization.

The Log node extends BaseExecutableNode, making it executable within transitions, onentry actions, onexit actions, and other executable contexts. Importantly, logging operations do not modify the state machine's data model - they are pure side-effect operations.

## Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `label` | string | No | Optional label for categorizing log messages |
| `expr` | string | Conditional* | JavaScript expression to evaluate and log |

*Either `expr` attribute or text content must be provided.

## Content

The `<log>` element can contain literal text content that will be logged directly. If both `expr` attribute and text content are provided, the `expr` attribute takes precedence.

## Behavior

### Expression Evaluation

When the `expr` attribute is provided:
1. The expression is evaluated in the current state context
2. The result is converted to a string representation
3. Objects and arrays are formatted as JSON
4. Primitive values are converted using standard string conversion
5. `null` and `undefined` values are displayed as literal strings

### Content Logging

When text content is provided:
1. Leading and trailing whitespace is trimmed
2. The content is logged as-is
3. Empty content results in an empty log message

### Message Formatting

All log messages are formatted with:
- ISO timestamp in brackets
- Optional label in brackets (if provided)
- The actual message content

Format: `[timestamp] [label] message` or `[timestamp] message`

### Error Handling

The Log node is designed to be robust:
- Expression evaluation errors are caught and logged as error messages
- Circular reference objects are handled gracefully
- Logging failures do not interrupt state machine execution
- The state is always returned unchanged

## Examples

### Basic Expression Logging

```xml
<log expr="'Current counter value: ' + data.counter"/>
```

This logs a dynamic message showing the current counter value.

### Labeled Logging

```xml
<log label="DEBUG" expr="'State: ' + _name + ', Event: ' + _event.name"/>
```

This creates a debug log entry with state and event information.

### Literal Content Logging

```xml
<log label="INFO">State machine initialization complete</log>
```

This logs a static informational message.

### Object Logging

```xml
<log label="DATA" expr="data.user"/>
```

This logs the entire user object as formatted JSON.

### Complex Expression Logging

```xml
<log expr="'Processing ' + data.items.length + ' items: ' + JSON.stringify(data.items)"/>
```

This logs both the count and contents of an array.

## Usage Patterns

### State Entry/Exit Logging

```xml
<state id="processing">
  <onentry>
    <log label="STATE" expr="'Entering processing state with ' + data.queue.length + ' items'"/>
  </onentry>
  
  <onexit>
    <log label="STATE" expr="'Exiting processing state, ' + data.processed + ' items completed'"/>
  </onexit>
</state>
```

### Conditional Debugging

```xml
<transition event="process" target="processing">
  <log label="DEBUG" expr="'Processing event with data: ' + JSON.stringify(_event.data)"/>
  <assign location="data.lastEvent" expr="_event"/>
</transition>
```

### Error Tracking

```xml
<transition event="error.*" target="errorState">
  <log label="ERROR" expr="'Error occurred: ' + _event.name + ' - ' + (_event.data ? _event.data.message : 'No details')"/>
</transition>
```

### Performance Monitoring

```xml
<onentry>
  <assign location="data.startTime" expr="Date.now()"/>
  <log label="PERF" expr="'Started processing at ' + new Date().toISOString()"/>
</onentry>

<onexit>
  <log label="PERF" expr="'Processing completed in ' + (Date.now() - data.startTime) + 'ms'"/>
</onexit>
```

## Integration with State Machine

### Data Model Access

The Log node has full access to the state machine's data model:

```xml
<log expr="'Data model contents: ' + JSON.stringify(data, null, 2)"/>
```

### Event Information

Current event information is available through the `_event` system variable:

```xml
<log expr="'Received event: ' + _event.name + ' of type ' + _event.type"/>
```

### State Information

Current state information is available through system variables:

```xml
<log expr="'Current state: ' + _name + ', Configuration: ' + JSON.stringify(_configuration)"/>
```

## Best Practices

### Use Appropriate Labels

Categorize your log messages with meaningful labels:

```xml
<log label="DEBUG" expr="'Detailed debugging information'"/>
<log label="INFO" expr="'General information'"/>
<log label="WARN" expr="'Warning condition detected'"/>
<log label="ERROR" expr="'Error condition occurred'"/>
```

### Avoid Expensive Operations

Be mindful of performance in log expressions:

```xml
<!-- Good: Simple property access -->
<log expr="'User ID: ' + data.userId"/>

<!-- Avoid: Complex computations in logs -->
<log expr="'Computed value: ' + expensiveFunction(data.largeArray)"/>
```

### Use Conditional Logging

Consider wrapping debug logs in conditions for production:

```xml
<if cond="data.debugMode">
  <log label="DEBUG" expr="'Detailed state information: ' + JSON.stringify(data)"/>
</if>
```

### Structure Log Messages

Use consistent formatting for easier parsing:

```xml
<log label="AUDIT" expr="'USER_ACTION|' + data.userId + '|' + _event.name + '|' + Date.now()"/>
```

## Error Handling

### Expression Errors

If an expression fails to evaluate, an error message is logged instead:

```xml
<log expr="data.nonexistent.property"/>
<!-- Logs: [timestamp] [LOG ERROR] Failed to log: Cannot read property 'property' of undefined -->
```

### Circular References

Objects with circular references are handled gracefully:

```xml
<log expr="data.circularObject"/>
<!-- Logs: [timestamp] [Object - cannot stringify] -->
```

## TypeScript Integration

### Custom Log Output

You can extend LogNode to customize log output:

```typescript
class CustomLogNode extends LogNode {
  protected outputLog(message: string): void {
    // Send to custom logger instead of console
    myLogger.info(message);
  }
}
```

### Type Safety

The LogNode provides full TypeScript support:

```typescript
const logNode = new LogNode({
  label: 'DEBUG',
  expr: 'data.counter',
  content: '',
  children: []
});
```

## Performance Considerations

- Log expressions are evaluated on every execution
- Complex expressions or large object serialization can impact performance
- Consider using conditional logging for verbose debug output
- The logging operation itself is synchronous and lightweight

## SCXML Compliance

The Log node implements the W3C SCXML specification for the `<log>` element:

- Supports both `expr` attribute and text content
- Provides optional `label` attribute for categorization
- Does not modify the state machine's data model
- Handles expression evaluation errors gracefully
- Maintains execution order with other executable content

## Related Elements

- **[Assign Node](./assign.md)** - Variable assignment with expression evaluation
- **[Raise Node](./raise.md)** - Internal event generation
- **[OnEntry Node](./onentry.md)** - Entry action containers that can contain log elements
- **[OnExit Node](./onexit.md)** - Exit action containers that can contain log elements
- **[If Node](./if.md)** - Conditional execution that can contain log elements
