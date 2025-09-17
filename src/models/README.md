# Models Directory

This directory contains the core model classes and utilities that form the foundation of the TypeScript statecharts library. These models provide the base functionality, type definitions, and architectural patterns that all SCXML nodes and state machine components build upon.

## Overview

The models directory implements the fundamental building blocks of the SCXML state machine system:

- **Base Classes** - Foundation classes that all SCXML nodes extend
- **State Management** - Internal state representation and event handling
- **Event Processing** - Queue system for managing event flow
- **Type Definitions** - Core interfaces and type definitions
- **Utility Functions** - Helper functions for state and event management

## Core Model Classes

### BaseNode ([base.md](./base.md))

The foundational base class for all SCXML node types.

```typescript
export class BaseNode {
  isExecutable = false;
  allowChildren = false;
  children: BaseNode[] = [];
  content: string;

  async *executeAllChildren(
    state: InternalState,
  ): AsyncGenerator<ExecutionResult>;
  getChildrenOfType<T>(typeCtor: new (...args: any[]) => T): T[];
  async run(state: InternalState): Promise<InternalState>;
}
```

**Key Features:**

- Schema validation with Zod
- Child node management and execution
- Type-safe node creation patterns
- Immutable state handling

**Used By:** All SCXML node implementations

### BaseStateNode ([base-state.md](./base-state.md))

Specialized base class for state-like nodes (states, parallel states, final states).

```typescript
export class BaseStateNode extends BaseNode {
  readonly id: string;
  readonly initial: string | undefined;
  allowChildren = true;

  get isAtomic(): boolean;
  get initialState(): string | undefined;

  async mount(state: InternalState): Promise<InternalState>;
  async unmount(state: InternalState): Promise<InternalState>;
  getTransitions(): TransitionNode[];
}
```

**Key Features:**

- State hierarchy management
- Mount/unmount lifecycle
- Initial state resolution
- Transition management
- Entry/exit action execution

**Used By:** StateNode, ParallelNode, FinalNode

### BaseExecutableNode ([base-executable.md](./base-executable.md))

Base class for all executable content nodes that perform actions.

```typescript
export class BaseExecutableNode extends BaseNode {
  isExecutable = true;

  async run(state: InternalState): Promise<InternalState>;
  get hasExecutableChildren(): boolean;
}
```

**Key Features:**

- Executable content identification
- State modification contract
- Child execution detection
- Error handling patterns

**Used By:** AssignNode, RaiseNode, DataNode, OnEntryNode, OnExitNode

### EventQueue ([event-queue.md](./event-queue.md))

Generic queue implementation for managing event processing with FIFO/LIFO modes.

```typescript
export enum QueueMode {
  FirstInFirstOut,
  LastInFirstOut,
}

export class Queue<EventType> {
  constructor(mode: QueueMode = QueueMode.FirstInFirstOut);

  enqueue(event: EventType): void;
  dequeue(): EventType | undefined;
  peek(): EventType | undefined;
  clear(): void;
  isEmpty(): boolean;
  get size(): number;
}
```

**Key Features:**

- Type-safe event queuing
- FIFO/LIFO ordering modes
- SCXML-compliant event prioritization
- Memory-efficient operations

**Used By:** StateChart for internal/external event queues

## Core Interfaces and Types

### InternalState (internalState.ts)

The unified state interface that represents the complete state of a state machine during execution.

```typescript
export interface InternalState {
  // System variables
  _name?: string;
  _sessionId?: string;
  _datamodel?: string;
  data: Record<string, unknown>;

  // Event context (during event processing)
  _event?: SCXMLEvent;

  // Pending events (for executable content)
  _pendingInternalEvents?: SCXMLEvent[];
}
```

**Key Features:**

- Immutable state representation
- Event context management
- Pending event handling
- System variable support

### SCXMLEvent (internalState.ts)

Standard event interface compliant with SCXML specification.

```typescript
export interface SCXMLEvent {
  name: string;
  type: 'platform' | 'internal' | 'external';
  sendid: string;
  origin: string;
  origintype: string;
  invokeid: string;
  data: Record<string, unknown>;
}
```

**Key Features:**

- SCXML-compliant event structure
- Type-safe event properties
- Support for all event types
- Extensible data payload

## Utility Functions

### Event Management

```typescript
// Transfer pending events to queue
export function processPendingEvents(
  state: InternalState,
  queue: Queue<SCXMLEvent>,
): void;

// Add event to pending list
export function addPendingEvent(
  state: InternalState,
  event: SCXMLEvent,
): InternalState;

// Convert JavaScript errors to SCXML events
export function fromJsError(err: unknown): SCXMLEvent;
```

### Factory Methods (methods.ts)

Common patterns and utilities for node creation and management.

```typescript
export interface CreateFromJsonResponse<T> {
  success: boolean;
  node: T | undefined;
  error: ZodError | undefined;
}
```

## Architecture Overview

### Class Hierarchy

```
BaseNode (foundation)
├── BaseStateNode (state-like nodes)
│   ├── StateNode (individual states)
│   ├── ParallelNode (concurrent states)
│   └── FinalNode (terminal states)
├── BaseExecutableNode (executable content)
│   ├── AssignNode (variable assignment)
│   ├── RaiseNode (event generation)
│   ├── DataNode (data initialization)
│   ├── OnEntryNode (entry actions)
│   └── OnExitNode (exit actions)
└── Direct Extensions
    ├── SCXMLNode (root container)
    ├── InitialNode (initial state)
    ├── DataModelNode (data container)
    └── TransitionNode (state transitions)
```

### Data Flow

```
InternalState → BaseNode.run() → Modified InternalState
     ↓
SCXMLEvent → Queue → StateChart.macrostep() → Event Processing
     ↓
Pending Events → processPendingEvents() → Internal Queue
```

### Event Processing Flow

```
1. Eventless Transitions (highest priority)
2. Internal Events (from internal queue)
3. External Events (from external queue)
4. Event → Transition Selection → Executable Content → State Update
```

## Usage Patterns

### Creating Custom Node Types

```typescript
import { BaseExecutableNode, InternalState } from '@your-library/statecharts';

// Extend BaseExecutableNode for custom executable content
class CustomActionNode extends BaseExecutableNode {
  static label = 'customAction';
  static schema = BaseExecutableNodeAttr.extend({
    action: z.string(),
    parameters: z.record(z.unknown()).optional(),
  });

  constructor(data: any) {
    super(data);
  }

  async run(state: InternalState): Promise<InternalState> {
    // Custom action implementation
    return {
      ...state,
      data: {
        ...state.data,
        customActionExecuted: true,
      },
    };
  }
}
```

## Best Practices

### Model Design

1. **Immutable State**: Always return new state objects, never mutate existing ones
2. **Type Safety**: Use TypeScript generics and interfaces for type safety
3. **Schema Validation**: Use Zod schemas for runtime validation
4. **Error Handling**: Convert exceptions to SCXML error events
5. **Memory Management**: Use generators for efficient child execution

### Performance Optimization

1. **Shallow Copying**: Use spread operator for efficient state cloning
2. **Lazy Evaluation**: Compute properties only when needed
3. **Queue Management**: Monitor queue sizes to prevent memory issues
4. **Batch Processing**: Process multiple events together when possible
5. **Resource Cleanup**: Properly clean up resources in async operations

### Testing Strategy

1. **Unit Tests**: Test individual model classes in isolation
2. **Integration Tests**: Test model interactions and data flow
3. **Schema Tests**: Validate Zod schema definitions
4. **Performance Tests**: Monitor execution time and memory usage
5. **Compliance Tests**: Ensure SCXML specification compliance

## SCXML Specification Compliance

The models ensure full SCXML specification compliance:

- **Event Processing**: Proper event prioritization and processing order
- **State Management**: Compliant state hierarchy and lifecycle management
- **Data Model**: ECMAScript data model support with proper scoping
- **Error Handling**: Specification-compliant error event generation
- **Execution Model**: Correct microstep and macrostep execution semantics

## Contributing

When adding new model classes:

1. **Extend Appropriate Base**: Choose BaseNode, BaseStateNode, or BaseExecutableNode
2. **Follow Patterns**: Use established patterns for schema, validation, and testing
3. **Document Thoroughly**: Create comprehensive markdown documentation
4. **Test Completely**: Include unit tests, integration tests, and edge cases
5. **Update Exports**: Add new classes to `index.ts` for public API access

## See Also

- [Nodes Documentation](../nodes/README.md) - SCXML node implementations
- [StateChart](../statechart.md) - Main state machine class
- [Parser](../parser/README.md) - XML parsing and node creation
- [W3C SCXML Specification](https://www.w3.org/TR/scxml/) - Official specification
