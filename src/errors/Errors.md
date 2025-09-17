# Errors

## Overview

This document defines the standardized naming convention for error events in our SCXML state machine implementation. All error events must follow a structured pattern to enable better error tracking, debugging, and handling.

## Naming Convention

All error event names must follow this pattern:

```
error.<label>.<type>
```

Where:

- `error` - Fixed prefix indicating this is an error event
- `<label>` - The component or node type that generated the error (e.g., `raise`, `assign`, `send`)
- `<type>` - The specific type of error that occurred (e.g., `unknown`, `missing-attribute`, `bad-expression`)

## Examples

### RaiseNode Errors

| Error Name                      | Description                                   | When It Occurs                                               |
| ------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `error.raise.missing-attribute` | Missing required event or eventexpr attribute | When RaiseNode has neither `event` nor `eventexpr` attribute |
| `error.raise.bad-expression`    | Invalid expression in eventexpr               | When expression evaluator fails to parse/evaluate eventexpr  |
| `error.raise.unknown`           | Unrecognized error in raise operation         | Any other unexpected error during raise execution            |

### Future Error Categories

As we implement more SCXML elements, we should follow this pattern:

#### AssignNode Errors

- `error.assign.missing-attribute` - Missing location or expr attribute
- `error.assign.bad-expression` - Invalid expression in expr attribute
- `error.assign.invalid-location` - Invalid location path
- `error.assign.unknown` - Other assign-related errors

#### SendNode Errors

- `error.send.missing-target` - Missing target for send operation
- `error.send.bad-expression` - Invalid expression in send parameters
- `error.send.delivery-failed` - Failed to deliver the event
- `error.send.unknown` - Other send-related errors

#### ScriptNode Errors

- `error.script.syntax-error` - JavaScript/expression syntax error
- `error.script.runtime-error` - Runtime error during script execution
- `error.script.unknown` - Other script-related errors

## Implementation Guidelines

### 1. Error Detection and Classification

When implementing error handling in any executable node:

```typescript
try {
  // Node execution logic
} catch (err) {
  // Classify the error based on the error message or type
  let errorName = 'error.<label>.unknown';

  const errorMessage = (err as Error).message;
  if (errorMessage.includes('specific error pattern')) {
    errorName = 'error.<label>.<specific-type>';
  }
  // Add more specific error classifications as needed

  // Create and return error event
  const errorEvent: SCXMLEvent = {
    name: errorName,
    type: 'platform',
    sendid: '',
    origin: '',
    origintype: '',
    invokeid: '',
    data: {
      error: errorMessage,
      source: '<label>',
    },
  };

  // Add to pending events for processing
}
```

### 2. Error Event Structure

All error events must be platform events with this structure:

```typescript
{
  name: 'error.<label>.<type>',
  type: 'platform',
  sendid: '',
  origin: '',
  origintype: '',
  invokeid: '',
  data: {
    error: string,      // Original error message
    source: string,     // Component that generated the error (same as <label>)
    // Additional context-specific data as needed
  }
}
```

### 3. Testing Requirements

For each error type, implement comprehensive unit tests:

```typescript
it('should create error.<label>.<type> event when <condition>', async () => {
  // Test setup to trigger specific error condition

  const result = await node.run(mockState);

  expect(result._pendingInternalEvents).toHaveLength(1);
  expect(result._pendingInternalEvents![0]).toEqual({
    name: 'error.<label>.<type>',
    type: 'platform',
    sendid: '',
    origin: '',
    origintype: '',
    invokeid: '',
    data: {
      error: 'Expected error message',
      source: '<label>',
    },
  });
});
```

## Benefits

1. **Consistent Error Tracking** - Standardized naming makes it easy to filter and analyze errors
2. **Better Debugging** - Clear hierarchy helps identify the source and type of errors quickly
3. **Automated Error Handling** - Applications can implement generic error handlers based on patterns
4. **SCXML Compliance** - Follows SCXML specification for platform error events
5. **Extensibility** - Easy to add new error types while maintaining consistency

## SCXML Specification Compliance

This naming standard is compatible with the SCXML specification's error handling requirements:

- Error events are generated as `platform` type events
- Errors are placed in the internal event queue for processing
- Error events contain relevant context information in the `data` field
- The naming convention doesn't conflict with any SCXML reserved event names

## Migration Guide

When updating existing error handling code:

1. **Identify current error patterns** - Review existing error event names
2. **Map to new standard** - Convert old names to `error.<label>.<type>` format
3. **Update tests** - Modify test expectations to match new error names
4. **Update documentation** - Document the specific error types for each component

## Version History

- **v1.0** (Current) - Initial standard definition with RaiseNode implementation
- Future versions will expand the standard as more SCXML elements are implemented

---

_This standard should be followed by all contributors when implementing error handling in SCXML executable content nodes._
