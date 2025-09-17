# Event I/O Processor System

The Event I/O Processor system provides a pluggable architecture for external communication in SCXML state machines. It abstracts different communication protocols and provides a unified interface for sending events to external systems.

## Overview

Event I/O Processors are communication adapters that handle the technical details of sending and receiving events to/from external systems. They enable SCXML state machines to interact with REST APIs, WebSocket servers, other state machines, and custom communication protocols.

### Key Benefits

- **Protocol Abstraction**: State machine logic doesn't need to know about HTTP headers, WebSocket frames, etc.
- **Pluggable Architecture**: Easy to add new communication methods without changing core logic
- **Standardized Interface**: Consistent way to handle all external communication
- **Error Handling**: Centralized error handling for network issues, timeouts, etc.
- **Testing**: Easy to mock processors for unit testing
- **Configuration**: Runtime configuration of communication parameters

## Core Components

### EventIOProcessor Interface

The base interface that all processors must implement:

```typescript
interface EventIOProcessor {
  readonly type: string;
  send(event: SCXMLEvent, target: string, config?: ProcessorConfig): Promise<SendResult>;
  canHandle?(target: string): boolean;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}
```

**Properties:**
- `type`: Unique identifier for the processor (e.g., 'http', 'scxml', 'websocket')

**Methods:**
- `send()`: Send an event to the specified target
- `canHandle()`: Optional method to determine if this processor can handle a target URL
- `initialize()`: Optional setup method called when processor is registered
- `cleanup()`: Optional cleanup method called when processor is unregistered

### EventIOProcessorRegistry

Central registry that manages all available processors:

```typescript
class EventIOProcessorRegistry extends EventEmitter {
  register(processor: EventIOProcessor): void
  unregister(type: string): boolean
  send(event: SCXMLEvent, target: string, processorType?: string, config?: ProcessorConfig): Promise<SendResult>
  setDefault(processor: EventIOProcessor): void
  getDefault(): EventIOProcessor | undefined
  clear(): void
}
```

**Key Features:**
- **Auto-detection**: Automatically selects appropriate processor using `canHandle()` method
- **Default Processor**: Fallback processor when no specific handler is found
- **Event Emission**: Emits events for registration, unregistration, and communication activities
- **Error Handling**: Provides structured error responses for failed operations

## Built-in Processors

### HTTPProcessor

Handles HTTP/HTTPS communication for REST API integration:

```typescript
const httpProcessor = new HTTPProcessor();
```

**Features:**
- Supports GET, POST, PUT, DELETE, and other HTTP methods
- Automatic JSON serialization of event data
- Configurable headers and request options
- Handles HTTP error responses and network failures
- Auto-detects HTTP/HTTPS URLs

**Configuration Options:**
```typescript
interface ProcessorConfig {
  method?: string;        // HTTP method (default: 'POST')
  headers?: Record<string, string>;
  timeout?: number;
  // ... other HTTP options
}
```

### SCXMLProcessor

Handles communication with other SCXML state machines:

```typescript
const scxmlProcessor = new SCXMLProcessor();
```

**Features:**
- Supports both internal and external SCXML targets
- Target registration for external state machines
- Handles SCXML event format and routing
- Auto-detects SCXML target format (`scxml:targetId`)

**Target Formats:**
- `scxml:internal` - Send to the same state machine
- `scxml:externalId` - Send to registered external state machine

## Usage Examples

### Basic Setup

```typescript
import { EventIOProcessorRegistry, HTTPProcessor, SCXMLProcessor } from './event-io-processor';

// Create registry and register processors
const registry = new EventIOProcessorRegistry();
registry.register(new HTTPProcessor());
registry.register(new SCXMLProcessor());
registry.setDefault(new HTTPProcessor());
```

### Sending Events

```typescript
// Send HTTP request
await registry.send(
  {
    name: 'userUpdate',
    type: 'external',
    data: { userId: 123, name: 'John Doe' }
  },
  'http://api.example.com/users',
  'http'
);

// Send to another state machine
await registry.send(
  {
    name: 'workflowComplete',
    type: 'external',
    data: { result: 'success' }
  },
  'scxml:paymentProcessor'
);
```

### Custom Processor

```typescript
class WebSocketProcessor implements EventIOProcessor {
  readonly type = 'websocket';
  
  canHandle(target: string): boolean {
    return target.startsWith('ws://') || target.startsWith('wss://');
  }
  
  async send(event: SCXMLEvent, target: string): Promise<SendResult> {
    // WebSocket implementation
    const ws = new WebSocket(target);
    ws.send(JSON.stringify(event));
    return { success: true, sendid: generateId() };
  }
}

// Register custom processor
registry.register(new WebSocketProcessor());
```

## Error Handling

The system provides structured error handling:

```typescript
interface SendResult {
  success: boolean;
  sendid?: string;
  error?: {
    type: string;
    message: string;
    details?: unknown;
  };
}
```

**Error Types:**
- `processor.not.found` - No suitable processor available
- `processor.send.failed` - Processor failed to send event
- `network.error` - Network communication failure
- `validation.error` - Invalid event or target format

## Events

The registry emits events for monitoring and debugging:

```typescript
registry.on('processorRegistered', (type: string) => {
  console.log(`Processor ${type} registered`);
});

registry.on('eventSent', (event: SCXMLEvent, target: string, result: SendResult) => {
  console.log(`Event ${event.name} sent to ${target}`);
});

registry.on('sendError', (event: SCXMLEvent, target: string, error: any) => {
  console.error(`Failed to send ${event.name} to ${target}:`, error);
});
```

## Integration with SCXML

The Event I/O Processor system integrates seamlessly with SCXML `<send>` elements:

```xml
<send event="userUpdate" 
      target="http://api.example.com/users" 
      type="http">
  <param name="userId" expr="data.user.id"/>
  <param name="name" expr="data.user.name"/>
</send>
```

The `type` attribute determines which processor to use, while the `target` attribute specifies the destination.

## Default Registry

A pre-configured registry is available for immediate use:

```typescript
import { defaultProcessorRegistry } from './event-io-processor';

// Ready to use with HTTP and SCXML processors
await defaultProcessorRegistry.send(event, target);
```
