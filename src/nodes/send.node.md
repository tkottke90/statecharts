# SendNode - SCXML `<send>` Element

The `<send>` element enables SCXML state machines to send events to external systems, other state machines, or back to themselves. It provides the primary mechanism for external communication in SCXML.

## Overview

The `<send>` element is a powerful tool for integrating state machines with external systems. It can send HTTP requests to REST APIs, communicate with other state machines, trigger webhooks, and interact with any system that has an appropriate Event I/O Processor.

### Key Features

- **Multiple Communication Protocols**: HTTP, SCXML, WebSocket, and custom processors
- **Dynamic Event Generation**: Support for expressions in all attributes
- **Parameter Passing**: Include data via `<param>` elements or namelist
- **Delayed Sending**: Schedule events to be sent after a specified delay
- **Error Handling**: Comprehensive error reporting and SCXML-compliant error events
- **Unique Send IDs**: Automatic generation and tracking of send operations

## SCXML Specification

According to the W3C SCXML specification, `<send>` is an executable element that sends events to external targets.

### Attributes

#### Event Specification (Required - one of)

- **`event`**: Static event name to send
- **`eventexpr`**: Expression that evaluates to the event name

#### Target Specification (Optional)

- **`target`**: Static target URL or identifier
- **`targetexpr`**: Expression that evaluates to the target

#### Processor Type (Optional)

- **`type`**: Static processor type (e.g., 'http', 'scxml')
- **`typeexpr`**: Expression that evaluates to the processor type

#### Timing (Optional)

- **`delay`**: Static delay before sending (e.g., '1s', '500ms')
- **`delayexpr`**: Expression that evaluates to the delay

#### Data Inclusion (Optional)

- **`namelist`**: Space-separated list of data model variables to include
- **`id`**: Static send identifier for tracking
- **`idlocation`**: Location to store the generated send ID

### Child Elements

- **`<param>`**: Parameter elements for structured data passing

### Validation Rules

- Must specify exactly one of `event` or `eventexpr`
- Cannot specify both static and expression versions of the same attribute
- Delay values must be valid time formats (e.g., '1s', '500ms', '2.5s')

## Usage Examples

### Basic HTTP Request

```xml
<send event="userCreated"
      target="http://api.example.com/webhooks/user"
      type="http">
  <param name="userId" expr="data.user.id"/>
  <param name="email" expr="data.user.email"/>
</send>
```

### Dynamic Event and Target

```xml
<send eventexpr="data.eventType"
      targetexpr="data.webhookUrl"
      type="http">
  <param name="timestamp" expr="Date.now()"/>
  <param name="source">payment-system</param>
</send>
```

### Inter-State-Machine Communication

```xml
<send event="workflowComplete"
      target="scxml:orderProcessor"
      type="scxml">
  <param name="orderId" expr="data.order.id"/>
  <param name="result" expr="data.processingResult"/>
</send>
```

### Delayed Sending

```xml
<send event="reminder"
      target="http://notifications.example.com/send"
      type="http"
      delay="1h">
  <param name="userId" expr="data.user.id"/>
  <param name="message">Your session will expire soon</param>
</send>
```

### Using Namelist for Data

```xml
<send event="dataSync"
      target="http://sync.example.com/data"
      type="http"
      namelist="data.user.id data.user.email data.lastModified"/>
```

### Send ID Tracking

```xml
<send event="asyncOperation"
      target="http://async.example.com/process"
      type="http"
      idlocation="data.sendId">
  <param name="operation" expr="data.operationType"/>
</send>
```

## Implementation Details

### Class Structure

```typescript
class SendNode extends BaseExecutableNode {
  readonly event?: string;
  readonly eventexpr?: string;
  readonly target?: string;
  readonly targetexpr?: string;
  readonly type?: string;
  readonly typeexpr?: string;
  readonly delay?: string;
  readonly delayexpr?: string;
  readonly namelist?: string;
  readonly id?: string;
  readonly idlocation?: string;

  constructor(json: any, processorRegistry: EventIOProcessorRegistry);
  async run(state: InternalState): Promise<InternalState>;
}
```

### Execution Flow

1. **Evaluate Event Name**: Resolve event name from `event` or `eventexpr`
2. **Evaluate Target**: Resolve target from `target` or `targetexpr`
3. **Evaluate Processor Type**: Resolve type from `type` or `typeexpr`
4. **Collect Parameters**: Process child `<param>` elements
5. **Collect Namelist Data**: Include specified data model variables
6. **Generate Send ID**: Create unique identifier for tracking
7. **Handle Delay**: Schedule sending if delay is specified
8. **Send Event**: Use appropriate Event I/O Processor
9. **Handle Errors**: Generate error events for failures

### Data Collection

The SendNode collects data from multiple sources:

1. **Parameters**: From child `<param>` elements
2. **Namelist**: From specified data model variables
3. **System Data**: Event metadata (sendid, origin, etc.)

All data is merged into the event's `data` property.

## API Reference

### Constructor

```typescript
new SendNode(json: any, processorRegistry: EventIOProcessorRegistry)
```

Creates a new SendNode instance with the specified processor registry.

**Parameters:**

- `json`: JSON representation of the send element
- `processorRegistry`: Registry of available Event I/O Processors

### Methods

#### `run(state: InternalState): Promise<InternalState>`

Executes the send operation.

**Parameters:**

- `state`: Current internal state of the state machine

**Returns:** Promise resolving to updated state (may include error events)

### Static Methods

#### `createFromJSON(json: any): CreateNodeResult<SendNode>`

Creates a SendNode instance from JSON with validation.

**Note:** This method requires a processor registry to be provided separately.

## Event I/O Processor Integration

The SendNode works closely with the Event I/O Processor system:

### Processor Selection

1. **Explicit Type**: Use processor specified by `type` or `typeexpr`
2. **Auto-Detection**: Use processor that can handle the target (via `canHandle()`)
3. **Default Processor**: Fall back to registry's default processor
4. **Error**: Generate error event if no suitable processor found

### Processor Communication

```typescript
const result = await processor.send(event, target, config);

if (result.success) {
  // Event sent successfully
  // Store send ID if idlocation specified
} else {
  // Generate error event
  state.events.push({
    name: 'error.communication',
    type: 'platform',
    data: result.error,
  });
}
```

## Delay Processing

The SendNode supports delayed event sending:

### Delay Formats

- **Seconds**: `'1s'`, `'2.5s'`, `'0.1s'`
- **Milliseconds**: `'500ms'`, `'1000ms'`
- **Expression**: `delayexpr="data.timeout + 's'"`

### Implementation

```typescript
if (delay > 0) {
  setTimeout(async () => {
    await processor.send(event, target, config);
  }, delay);
} else {
  await processor.send(event, target, config);
}
```

## Error Handling

The SendNode generates SCXML-compliant error events:

### Error Types

1. **`error.communication`**: Processor failed to send event
2. **`error.execution`**: Expression evaluation failed
3. **`error.communication.target`**: No target specified or invalid target

### Error Event Structure

```typescript
{
  name: 'error.communication',
  type: 'platform',
  data: {
    type: 'processor.send.failed',
    message: 'HTTP request failed with status 500',
    details: { status: 500, statusText: 'Internal Server Error' },
    sendid: 'send_123456789_abc'
  }
}
```

## Advanced Features

### Send ID Generation

Unique send IDs are automatically generated using the format:

```
send_{timestamp}_{randomString}
```

Example: `send_1640995200000_a1b2c3`

### Namelist Processing

The namelist attribute allows including data model variables:

```xml
<send event="sync" namelist="user.id user.email settings.theme"/>
```

Results in:

```json
{
  "data": {
    "user.id": 123,
    "user.email": "john@example.com",
    "settings.theme": "dark"
  }
}
```

### Expression Evaluation Context

All expressions have access to:

- **`data`**: State machine data model
- **`_event`**: Current event
- **`_name`**: State machine name
- **`_sessionId`**: Session identifier

## Testing

The SendNode implementation includes comprehensive unit tests:

- Creation and validation from XML and JSON
- Expression evaluation for all attributes
- Parameter collection and processing
- Namelist data collection
- Delay handling with fake timers
- Error scenarios and edge cases
- Integration with Event I/O Processors
- Send ID generation and tracking

Run tests with:

```bash
npm test -- src/nodes/send.node.spec.ts
```

## Best Practices

1. **Use Appropriate Processors**: Choose the right processor type for your target system
2. **Handle Errors**: Always plan for communication failures
3. **Validate Targets**: Ensure target URLs and identifiers are valid
4. **Use Parameters Wisely**: Prefer `<param>` for structured data, namelist for simple variables
5. **Consider Delays**: Use delays for rate limiting and scheduling
6. **Track Send Operations**: Use `idlocation` for operations that need tracking
7. **Test External Dependencies**: Mock processors for reliable unit testing

## Integration Examples

### REST API Integration

```xml
<state id="processPayment">
  <onentry>
    <send event="processPayment"
          target="http://payment.example.com/process"
          type="http"
          idlocation="data.paymentSendId">
      <param name="amount" expr="data.order.total"/>
      <param name="currency" expr="data.order.currency"/>
      <param name="cardToken" expr="data.payment.token"/>
    </send>
  </onentry>

  <transition event="paymentProcessed" target="orderComplete"/>
  <transition event="error.communication" target="paymentFailed"/>
</state>
```

### Microservice Communication

```xml
<send event="orderCreated"
      target="scxml:inventoryService"
      type="scxml">
  <param name="orderId" expr="data.order.id"/>
  <param name="items" expr="data.order.items"/>
</send>
```
