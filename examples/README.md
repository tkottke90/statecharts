# SCXML Examples

This directory contains practical examples demonstrating various features of the SCXML StateChart library.

## Available Examples

### 1. History Tracking Examples (`history-tracking-examples.ts`)
Demonstrates the State Execution History system for debugging and monitoring state machine execution.

### 2. External Communication Examples (`external-communication-examples.ts`)
Shows how to use the `<send>` and `<param>` elements for HTTP requests and external communication.

## External Communication Examples

The external communication examples demonstrate:

### Example 1: Basic HTTP Request
- Simple POST request with parameters
- Using `<param>` elements for data transmission
- Basic success/error handling

### Example 2: Webhook Notification System
- Complex workflow with multiple HTTP requests
- Order processing with inventory, payment, and fulfillment
- Delayed notifications and retry logic

### Example 3: API Integration with Error Handling
- Resilient API client with exponential backoff
- Retry logic with maximum attempt limits
- Proper error handling and recovery

### Example 4: Namelist Data Transmission
- Using `namelist` attribute for data model variables
- Analytics tracking system example
- Combining `namelist` with `<param>` elements

### Example 5: Complete Working HTTP Example
- Full setup with Event I/O Processor Registry
- Actual HTTP request handling
- Event listeners for responses and errors

## Running the Examples

### Prerequisites
```bash
npm install
npm run build
```

### Running External Communication Examples
```typescript
import { runExternalCommunicationExamples } from './examples/external-communication-examples';

// Run all examples
await runExternalCommunicationExamples();
```

### Using Individual Examples
```typescript
import { 
  basicHttpRequest, 
  webhookNotificationSystem,
  completeHttpExample 
} from './examples/external-communication-examples';

// Create a basic HTTP request state machine
const stateChart = basicHttpRequest();
stateChart.sendEvent('createUser');

// Set up complete working example
const { stateChart: workingExample, registry } = await completeHttpExample();
workingExample.sendEvent('makeRequest');
```

## Key Concepts Demonstrated

### Send Node Features
- **Target URLs**: Static `target` or dynamic `targetexpr`
- **Event Types**: HTTP, SCXML, custom processors
- **Parameters**: Using `<param>` elements for data
- **Namelist**: Including data model variables
- **Delays**: Scheduling requests with `delay` or `delayexpr`
- **ID Location**: Storing send IDs in data model

### HTTP Processor Capabilities
- **HTTP Methods**: GET, POST, PUT, DELETE, etc.
- **Headers**: Custom headers via parameters
- **Request Body**: JSON data from parameters
- **Timeouts**: Configurable request timeouts
- **Error Handling**: Network and HTTP error responses

### Error Handling Patterns
- **Retry Logic**: Exponential backoff strategies
- **Circuit Breakers**: Preventing cascade failures
- **Fallback Responses**: Graceful degradation
- **Error Events**: SCXML-compliant error reporting

## Best Practices

1. **Always handle errors**: Use `error.communication` events
2. **Implement retries**: With exponential backoff for resilience
3. **Use delays wisely**: For rate limiting and scheduling
4. **Structure parameters**: Use meaningful parameter names
5. **Log operations**: For debugging and monitoring
6. **Set timeouts**: Prevent hanging requests
7. **Validate responses**: Check HTTP status codes

## Integration Notes

To use external communication in your application:

1. **Set up processors**:
   ```typescript
   const registry = new EventIOProcessorRegistry();
   registry.register(new HTTPProcessor());
   registry.setDefault(new HTTPProcessor());
   ```

2. **Handle responses**:
   ```typescript
   registry.on('eventSent', (event, target, result) => {
     // Handle successful sends
   });
   
   registry.on('sendError', (event, target, error) => {
     // Handle send errors
   });
   ```

3. **Configure state machine**:
   ```typescript
   const stateChart = StateChart.fromXML(xmlString);
   // Connect registry to state machine event handling
   ```

## Testing

The examples include comprehensive unit tests demonstrating:
- Parameter collection and validation
- HTTP request formation
- Error handling scenarios
- Delay processing
- Event emission patterns

Run tests with:
```bash
npm test -- --testPathPatterns="(event-io-processor|param\.node|send\.node)\.spec\.ts"
```

## Documentation

For detailed API documentation, see:
- `src/models/event-io-processor.md` - Event I/O Processor system
- `src/nodes/param.node.md` - Parameter node documentation  
- `src/nodes/send.node.md` - Send node documentation
