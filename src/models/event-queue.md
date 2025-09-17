# EventQueue (Queue Class and QueueMode Enum)

The `Queue` class and `QueueMode` enum provide a generic, type-safe queue implementation for managing event processing in this TypeScript statecharts library. The queue supports both FIFO (First In, First Out) and LIFO (Last In, First Out) modes for flexible event ordering.

## Overview

The EventQueue system consists of two main components:

1. **`QueueMode` Enum** - Defines queue ordering behavior (FIFO or LIFO)
2. **`Queue<EventType>` Class** - Generic queue implementation with configurable ordering

This system is central to SCXML event processing, where the StateChart class maintains separate internal and external event queues to ensure proper event prioritization and processing order according to the SCXML specification.

## QueueMode Enum

The `QueueMode` enum defines the ordering behavior for queue operations:

```typescript
export enum QueueMode {
  FirstInFirstOut,  // FIFO - Default mode
  LastInFirstOut    // LIFO - Stack-like behavior
}
```

### Values

| Value | Description | Behavior |
|-------|-------------|----------|
| `FirstInFirstOut` | FIFO mode (default) | First item added is first item removed |
| `LastInFirstOut` | LIFO mode | Last item added is first item removed (stack) |

## Queue Class

The `Queue<EventType>` class is a generic queue implementation that supports both FIFO and LIFO ordering modes.

### Type Parameters

- `EventType` - The type of items stored in the queue (e.g., `SCXMLEvent`, `string`, etc.)

### Constructor

```typescript
constructor(mode: QueueMode = QueueMode.FirstInFirstOut)
```

**Parameters:**
- `mode` - Queue ordering mode (defaults to FIFO)

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `size` | `number` | Number of items currently in the queue (read-only) |

### Methods

#### Core Queue Operations

##### `enqueue(event: EventType): void`

Adds an item to the queue.

**Parameters:**
- `event` - Item to add to the queue

**Behavior:**
- **FIFO Mode**: Adds item to the end of the queue
- **LIFO Mode**: Adds item to the end of the queue (same as FIFO for enqueue)

##### `dequeue(): EventType | undefined`

Removes and returns the next item from the queue.

**Returns:**
- Next item according to queue mode, or `undefined` if queue is empty

**Behavior:**
- **FIFO Mode**: Returns the first item added (oldest)
- **LIFO Mode**: Returns the last item added (newest)

##### `peek(): EventType | undefined`

Returns the next item without removing it from the queue.

**Returns:**
- Next item that would be returned by `dequeue()`, or `undefined` if queue is empty

**Behavior:**
- **FIFO Mode**: Returns the first item in the queue
- **LIFO Mode**: Returns the last item in the queue

#### Utility Methods

##### `clear(): void`

Removes all items from the queue, making it empty.

##### `isEmpty(): boolean`

Checks if the queue contains any items.

**Returns:**
- `true` if queue is empty, `false` otherwise

## Usage Examples

### Basic FIFO Queue (Default)

```typescript
import { Queue, QueueMode } from '@your-library/statecharts';

// Create FIFO queue (default mode)
const fifoQueue = new Queue<string>();

// Add items
fifoQueue.enqueue('first');
fifoQueue.enqueue('second');
fifoQueue.enqueue('third');

console.log(fifoQueue.size); // 3

// Remove items in FIFO order
console.log(fifoQueue.dequeue()); // 'first'
console.log(fifoQueue.dequeue()); // 'second'
console.log(fifoQueue.dequeue()); // 'third'
console.log(fifoQueue.dequeue()); // undefined

console.log(fifoQueue.isEmpty()); // true
```

### LIFO Queue (Stack Behavior)

```typescript
import { Queue, QueueMode } from '@your-library/statecharts';

// Create LIFO queue (stack mode)
const lifoQueue = new Queue<string>(QueueMode.LastInFirstOut);

// Add items
lifoQueue.enqueue('first');
lifoQueue.enqueue('second');
lifoQueue.enqueue('third');

console.log(lifoQueue.size); // 3

// Remove items in LIFO order (stack behavior)
console.log(lifoQueue.dequeue()); // 'third'
console.log(lifoQueue.dequeue()); // 'second'
console.log(lifoQueue.dequeue()); // 'first'
console.log(lifoQueue.dequeue()); // undefined
```

### Peek Operations

```typescript
import { Queue } from '@your-library/statecharts';

const queue = new Queue<number>();

queue.enqueue(10);
queue.enqueue(20);
queue.enqueue(30);

// Peek without removing
console.log(queue.peek()); // 10 (FIFO mode)
console.log(queue.size);   // 3 (unchanged)

// Dequeue and compare
console.log(queue.dequeue()); // 10 (same as peek)
console.log(queue.peek());    // 20 (next item)
console.log(queue.size);      // 2
```

### Queue Management

```typescript
import { Queue } from '@your-library/statecharts';

const queue = new Queue<string>();

// Add multiple items
['a', 'b', 'c', 'd'].forEach(item => queue.enqueue(item));

console.log(queue.size); // 4
console.log(queue.isEmpty()); // false

// Clear all items
queue.clear();

console.log(queue.size); // 0
console.log(queue.isEmpty()); // true
console.log(queue.dequeue()); // undefined
```

### Type-Safe Event Queue

```typescript
import { Queue, SCXMLEvent } from '@your-library/statecharts';

// Create type-safe event queue
const eventQueue = new Queue<SCXMLEvent>();

// Create sample events
const event1: SCXMLEvent = {
  name: 'user.login',
  type: 'external',
  sendid: '',
  origin: '',
  origintype: '',
  invokeid: '',
  data: { userId: 123 }
};

const event2: SCXMLEvent = {
  name: 'system.ready',
  type: 'internal',
  sendid: '',
  origin: '',
  origintype: '',
  invokeid: '',
  data: {}
};

// Enqueue events
eventQueue.enqueue(event1);
eventQueue.enqueue(event2);

// Process events
while (!eventQueue.isEmpty()) {
  const event = eventQueue.dequeue();
  if (event) {
    console.log(`Processing event: ${event.name} (${event.type})`);
  }
}
```

## Performance Considerations

### Memory Management

- **Array Operations**: Uses native JavaScript array methods (`push`, `shift`, `pop`) for optimal performance
- **Memory Efficiency**: No additional memory overhead beyond the stored items
- **Garbage Collection**: Items are properly dereferenced when dequeued

### Time Complexity

| Operation | FIFO Mode | LIFO Mode | Notes |
|-----------|-----------|-----------|-------|
| `enqueue()` | O(1) | O(1) | Always appends to end |
| `dequeue()` | O(n) | O(1) | FIFO uses `shift()` which is O(n) |
| `peek()` | O(1) | O(1) | No array modification |
| `clear()` | O(1) | O(1) | Creates new empty array |
| `isEmpty()` | O(1) | O(1) | Checks array length |

### Performance Optimization Tips

1. **Prefer LIFO for High-Throughput**: LIFO mode has O(1) dequeue operations
2. **Batch Operations**: Process multiple items at once to reduce overhead
3. **Pre-allocate Capacity**: Consider using a circular buffer for fixed-size queues
4. **Monitor Queue Size**: Large queues may impact memory usage

## See Also

- [BaseNode](./base.md) - Foundation class for all SCXML nodes
- [BaseStateNode](./base-state.md) - Base class for state-like nodes
- [BaseExecutableNode](./base-executable.md) - Base class for executable content
- [InternalState](../models/internalState.md) - State management system
- [StateChart](../statechart.md) - Main state machine implementation
- [RaiseNode](../nodes/raise.md) - Internal event generation
- [W3C SCXML Specification](https://www.w3.org/TR/scxml/) - Official specification
