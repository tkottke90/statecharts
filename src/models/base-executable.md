# BaseExecutableNode Class

The `BaseExecutableNode` class is the specialized base class for all executable content nodes in this TypeScript statecharts library. It extends `BaseNode` and provides the foundation for SCXML elements that perform actions and modify state during execution.

## Overview

BaseExecutableNode serves as the base class for all SCXML elements that represent executable content - actions that can be performed during state machine execution. These nodes are identified by having `isExecutable = true` and implement the `run()` method to perform their specific actions.

Key responsibilities include:

- Marking nodes as executable content
- Providing the `run()` method contract for state modification
- Detecting executable children for container nodes
- Enabling sequential execution of child actions

BaseExecutableNode is designed to be extended by concrete executable content implementations like `AssignNode`, `RaiseNode`, `DataNode`, `OnEntryNode`, and `OnExitNode`.

## Class Hierarchy

```
BaseNode
└── BaseExecutableNode (executable content base class)
    ├── AssignNode (variable assignment)
    ├── RaiseNode (event generation)
    ├── DataNode (data initialization)
    ├── OnEntryNode (entry action container)
    └── OnExitNode (exit action container)
```

## Properties

### Instance Properties

| Property       | Type      | Default | Description                      |
| -------------- | --------- | ------- | -------------------------------- |
| `isExecutable` | `boolean` | `true`  | Marks node as executable content |

### Inherited Properties

BaseExecutableNode inherits all properties from `BaseNode`:

- `allowChildren`: Controls whether node can contain children
- `children`: Array of child nodes
- `content`: Text content of the node

### Computed Properties

| Property                | Type      | Description                            |
| ----------------------- | --------- | -------------------------------------- |
| `hasExecutableChildren` | `boolean` | True if any child nodes are executable |

## Schema Validation

BaseExecutableNode uses the same schema as BaseNode:

```typescript
const BaseExecutableNodeAttr = BaseNodeAttr;
// Equivalent to:
// z.object({
//   content: z.string().optional().default(''),
//   children: z.array(z.any()).default([])
// })
```

Concrete implementations extend this schema with their specific attributes.

## Methods

### Core Execution Method

#### `async run(state: InternalState): Promise<InternalState>`

The primary method that defines the executable behavior of the node.

**Base Implementation:**

- Returns the state unchanged (no-op)
- Must be overridden by concrete implementations

**Parameters:**

- `state` - Current internal state of the state machine

**Returns:**

- Promise resolving to updated `InternalState`

**Contract:**

- Must not mutate the input state directly
- Should return a new state object with any modifications
- Should handle errors gracefully and convert to SCXML error events

### Child Detection Method

#### `get hasExecutableChildren(): boolean`

Determines if the node has any executable child nodes.

**Returns:**

- `true` if any child has `isExecutable = true`
- `false` if no children are executable

**Usage:**

```typescript
if (node.hasExecutableChildren) {
  // Execute children using inherited executeAllChildren method
  for await (const result of node.executeAllChildren(state)) {
    // Process child execution results
  }
}
```

## Usage Examples

### Basic Executable Node Creation

```typescript
import { BaseExecutableNode } from '@your-library/statecharts';

// Create a custom executable node
class CustomExecutableNode extends BaseExecutableNode {
  static label = 'custom';
  static schema = BaseExecutableNodeAttr;

  constructor(data: any) {
    super(data);
  }

  async run(state: InternalState): Promise<InternalState> {
    // Custom execution logic
    console.log('Executing custom action');

    // Return modified state
    return {
      ...state,
      data: {
        ...state.data,
        customExecuted: true,
      },
    };
  }
}

// Usage
const customNode = new CustomExecutableNode({
  content: '',
  children: [],
});

console.log(customNode.isExecutable); // true

const initialState = { data: {}, _datamodel: 'ecmascript' };
const result = await customNode.run(initialState);
console.log(result.data.customExecuted); // true
```

### Container Node with Executable Children

```typescript
import { BaseExecutableNode, AssignNode } from '@your-library/statecharts';

class ActionContainer extends BaseExecutableNode {
  constructor(data: any) {
    super(data);
    this.allowChildren = true; // Enable child execution
  }

  async run(state: InternalState): Promise<InternalState> {
    let currentState = { ...state };

    // Check if we have executable children
    if (this.hasExecutableChildren) {
      // Execute all children sequentially
      for await (const { state: newState } of this.executeAllChildren(
        currentState,
      )) {
        currentState = newState;
      }
    }

    return currentState;
  }
}

// Create child actions
const assign1 = new AssignNode({
  assign: {
    location: 'step1',
    expr: '"completed"',
    content: '',
    children: [],
  },
});

const assign2 = new AssignNode({
  assign: {
    location: 'step2',
    expr: '"completed"',
    content: '',
    children: [],
  },
});

// Create container with children
const container = new ActionContainer({
  content: '',
  children: [assign1, assign2],
});

console.log(container.hasExecutableChildren); // true

// Execute container (will run all children)
const result = await container.run(initialState);
console.log(result.data.step1); // "completed"
console.log(result.data.step2); // "completed"
```

### Error Handling Pattern

```typescript
import {
  BaseExecutableNode,
  addPendingEvent,
  fromJsError,
} from '@your-library/statecharts';

class SafeExecutableNode extends BaseExecutableNode {
  async run(state: InternalState): Promise<InternalState> {
    try {
      // Potentially failing operation
      return await this.performRiskyOperation(state);
    } catch (error) {
      // Convert to SCXML error event
      const errorEvent = fromJsError(error);
      errorEvent.name = 'error.execution.failed';
      errorEvent.data.source = this.constructor.name;

      // Add error event to pending events
      return addPendingEvent(state, errorEvent);
    }
  }

  private async performRiskyOperation(
    state: InternalState,
  ): Promise<InternalState> {
    // Simulated risky operation
    if (Math.random() < 0.5) {
      throw new Error('Random failure occurred');
    }

    return {
      ...state,
      data: {
        ...state.data,
        operationSucceeded: true,
      },
    };
  }
}
```

### Expression Evaluation Pattern

```typescript
import {
  BaseExecutableNode,
  evaluateExpression,
} from '@your-library/statecharts';

class ExpressionNode extends BaseExecutableNode {
  private expression: string;

  constructor(data: any, expression: string) {
    super(data);
    this.expression = expression;
  }

  async run(state: InternalState): Promise<InternalState> {
    try {
      // Evaluate expression in current state context
      const result = evaluateExpression(this.expression, state);

      return {
        ...state,
        data: {
          ...state.data,
          expressionResult: result,
        },
      };
    } catch (error) {
      // Handle expression evaluation errors
      console.error('Expression evaluation failed:', error);
      return state; // Return unchanged state on error
    }
  }
}

// Usage
const exprNode = new ExpressionNode(
  { content: '', children: [] },
  'Math.random() * 100',
);

const result = await exprNode.run(initialState);
console.log(typeof result.data.expressionResult); // 'number'
```

## Concrete Implementations

### AssignNode - Variable Assignment

```typescript
// AssignNode extends BaseExecutableNode for variable assignment
class AssignNode extends BaseExecutableNode {
  readonly location: string;
  readonly expr: string | undefined;

  async run(state: InternalState): Promise<InternalState> {
    try {
      let value: unknown;

      if (this.expr) {
        // Evaluate expression to get value
        value = evaluateExpression(this.expr, state);
      } else {
        // Use content as literal value
        value = this.content;
      }

      // Assign to location using lodash set
      const updatedState = { ...state };
      _.set(updatedState.data, this.location, value);
      return updatedState;
    } catch (error) {
      // Convert to error event
      return addPendingEvent(state, fromJsError(error));
    }
  }
}
```

### RaiseNode - Event Generation

```typescript
// RaiseNode extends BaseExecutableNode for internal event generation
class RaiseNode extends BaseExecutableNode {
  readonly event: string | undefined;
  readonly eventexpr: string | undefined;

  async run(state: InternalState): Promise<InternalState> {
    try {
      let eventName: string;

      if (this.event) {
        eventName = this.event;
      } else if (this.eventexpr) {
        eventName = evaluateExpression(this.eventexpr, state);
      } else {
        throw new Error('RaiseNode must have either event or eventexpr');
      }

      // Create internal event
      const eventToRaise: SCXMLEvent = {
        name: eventName,
        type: 'internal',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {},
      };

      // Add to pending internal events
      const pendingEvents = state._pendingInternalEvents || [];
      return {
        ...state,
        _pendingInternalEvents: [...pendingEvents, eventToRaise],
      };
    } catch (error) {
      // Handle error by generating error event
      return addPendingEvent(state, fromJsError(error));
    }
  }
}
```

### DataNode - Data Initialization

```typescript
// DataNode extends BaseExecutableNode for data model initialization
class DataNode extends BaseExecutableNode {
  readonly id: string;
  readonly expr: string | undefined;

  async run(state: InternalState): Promise<InternalState> {
    let value: unknown;

    if (this.expr) {
      // Evaluate expression for dynamic value
      value = evaluateExpression(this.expr, state);
    } else {
      // Use content as literal value
      value = this.content;
    }

    // Initialize data model variable
    return {
      ...state,
      data: {
        ...state.data,
        [this.id]: value,
      },
    };
  }
}
```

### OnEntryNode - Entry Action Container

```typescript
// OnEntryNode extends BaseExecutableNode as action container
class OnEntryNode extends BaseExecutableNode {
  constructor(data: any) {
    super(data);
    this.allowChildren = true; // Enable child execution
  }

  async run(state: InternalState): Promise<InternalState> {
    let nextState = { ...state };

    // Execute all executable children in sequence
    for await (const { state } of this.executeAllChildren(nextState)) {
      nextState = state;
    }

    return nextState;
  }
}
```

### OnExitNode - Exit Action Container

```typescript
// OnExitNode extends BaseExecutableNode as action container
class OnExitNode extends BaseExecutableNode {
  constructor(data: any) {
    super(data);
    this.allowChildren = true; // Enable child execution
  }

  async run(state: InternalState): Promise<InternalState> {
    let nextState = { ...state };

    // Execute all executable children in sequence
    for await (const { state } of this.executeAllChildren(nextState)) {
      nextState = state;
    }

    return nextState;
  }
}
```

## Advanced Patterns

### Conditional Execution

```typescript
import {
  BaseExecutableNode,
  evaluateExpression,
} from '@your-library/statecharts';

class ConditionalNode extends BaseExecutableNode {
  private condition: string;
  private thenAction: BaseExecutableNode;
  private elseAction?: BaseExecutableNode;

  constructor(
    data: any,
    condition: string,
    thenAction: BaseExecutableNode,
    elseAction?: BaseExecutableNode,
  ) {
    super(data);
    this.condition = condition;
    this.thenAction = thenAction;
    this.elseAction = elseAction;
  }

  async run(state: InternalState): Promise<InternalState> {
    try {
      // Evaluate condition
      const conditionResult = evaluateExpression(this.condition, state);

      if (conditionResult) {
        // Execute then action
        return await this.thenAction.run(state);
      } else if (this.elseAction) {
        // Execute else action
        return await this.elseAction.run(state);
      }

      // No action taken
      return state;
    } catch (error) {
      return addPendingEvent(state, fromJsError(error));
    }
  }
}
```

### Batch Operations

```typescript
import { BaseExecutableNode } from '@your-library/statecharts';

class BatchNode extends BaseExecutableNode {
  private operations: BaseExecutableNode[];

  constructor(data: any, operations: BaseExecutableNode[]) {
    super(data);
    this.operations = operations;
  }

  async run(state: InternalState): Promise<InternalState> {
    let currentState = { ...state };

    // Execute all operations in sequence
    for (const operation of this.operations) {
      try {
        currentState = await operation.run(currentState);
      } catch (error) {
        // Log error but continue with remaining operations
        console.error('Batch operation failed:', error);
        currentState = addPendingEvent(currentState, fromJsError(error));
      }
    }

    return currentState;
  }

  // Override hasExecutableChildren to reflect operations
  get hasExecutableChildren(): boolean {
    return this.operations.length > 0;
  }
}
```

### Async Operations

```typescript
import { BaseExecutableNode } from '@your-library/statecharts';

class AsyncNode extends BaseExecutableNode {
  private asyncOperation: (state: InternalState) => Promise<any>;

  constructor(
    data: any,
    asyncOperation: (state: InternalState) => Promise<any>,
  ) {
    super(data);
    this.asyncOperation = asyncOperation;
  }

  async run(state: InternalState): Promise<InternalState> {
    try {
      // Perform async operation
      const result = await this.asyncOperation(state);

      // Store result in state
      return {
        ...state,
        data: {
          ...state.data,
          asyncResult: result,
        },
      };
    } catch (error) {
      // Handle async errors
      return addPendingEvent(state, {
        name: 'error.async.operation-failed',
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: error.message,
          source: 'async-operation',
        },
      });
    }
  }
}

// Usage
const asyncNode = new AsyncNode({ content: '', children: [] }, async state => {
  // Simulate async API call
  await new Promise(resolve => setTimeout(resolve, 100));
  return { timestamp: Date.now(), status: 'success' };
});
```

## Testing Patterns

### Unit Testing BaseExecutableNode

```typescript
import { BaseExecutableNode, InternalState } from '@your-library/statecharts';

describe('BaseExecutableNode', () => {
  describe('Basic Properties', () => {
    it('should be marked as executable', () => {
      const node = new BaseExecutableNode({
        content: '',
        children: [],
      });

      expect(node.isExecutable).toBe(true);
    });

    it('should detect executable children', () => {
      const executableChild = new BaseExecutableNode({
        content: '',
        children: [],
      });

      const nonExecutableChild = new (class extends BaseNode {
        constructor() {
          super({ content: '', children: [] });
          this.isExecutable = false;
        }
      })();

      const parent = new BaseExecutableNode({
        content: '',
        children: [executableChild, nonExecutableChild],
      });

      expect(parent.hasExecutableChildren).toBe(true);
    });

    it('should return false for hasExecutableChildren when no executable children', () => {
      const nonExecutableChild = new (class extends BaseNode {
        constructor() {
          super({ content: '', children: [] });
          this.isExecutable = false;
        }
      })();

      const parent = new BaseExecutableNode({
        content: '',
        children: [nonExecutableChild],
      });

      expect(parent.hasExecutableChildren).toBe(false);
    });
  });

  describe('Run Method', () => {
    it('should return state unchanged in base implementation', async () => {
      const node = new BaseExecutableNode({
        content: '',
        children: [],
      });

      const initialState: InternalState = {
        data: { test: 'value' },
        _datamodel: 'ecmascript',
      };

      const result = await node.run(initialState);

      expect(result).toEqual(initialState);
      expect(result).toBe(initialState); // Should be same reference
    });

    it('should be overrideable in subclasses', async () => {
      class CustomExecutableNode extends BaseExecutableNode {
        async run(state: InternalState): Promise<InternalState> {
          return {
            ...state,
            data: {
              ...state.data,
              executed: true,
            },
          };
        }
      }

      const node = new CustomExecutableNode({
        content: '',
        children: [],
      });

      const initialState: InternalState = {
        data: {},
        _datamodel: 'ecmascript',
      };

      const result = await node.run(initialState);

      expect(result.data.executed).toBe(true);
      expect(result).not.toBe(initialState); // Should be new reference
    });
  });

  describe('Child Execution', () => {
    it('should execute executable children in sequence', async () => {
      const executionOrder: string[] = [];

      class TrackingNode extends BaseExecutableNode {
        constructor(private name: string) {
          super({ content: '', children: [] });
        }

        async run(state: InternalState): Promise<InternalState> {
          executionOrder.push(this.name);
          return state;
        }
      }

      const child1 = new TrackingNode('child1');
      const child2 = new TrackingNode('child2');

      const parent = new BaseExecutableNode({
        content: '',
        children: [child1, child2],
      });
      parent.allowChildren = true;

      const initialState: InternalState = {
        data: {},
        _datamodel: 'ecmascript',
      };

      // Execute children manually (base implementation doesn't do this automatically)
      for await (const result of parent.executeAllChildren(initialState)) {
        // Children executed
      }

      expect(executionOrder).toEqual(['child1', 'child2']);
    });
  });
});
```

### Integration Testing

```typescript
import { StateChart } from '@your-library/statecharts';

describe('BaseExecutableNode Integration', () => {
  it('should work within complete state machine execution', async () => {
    const xml = `
      <scxml initial="start">
        <state id="start">
          <onentry>
            <assign location="entryExecuted" expr="true"/>
            <raise event="continue"/>
          </onentry>
          <transition event="continue" target="end">
            <assign location="transitionExecuted" expr="true"/>
          </transition>
        </state>
        <final id="end">
          <onentry>
            <assign location="finalExecuted" expr="true"/>
          </onentry>
        </final>
      </scxml>
    `;

    const stateChart = StateChart.fromXML(xml);
    const initialState = { data: {}, _datamodel: 'ecmascript' };

    const result = await stateChart.execute(initialState);

    expect(result.data.entryExecuted).toBe(true);
    expect(result.data.transitionExecuted).toBe(true);
    expect(result.data.finalExecuted).toBe(true);
  });
});
```

## Performance Considerations

### Execution Efficiency

- **Immutable State Updates**: Always return new state objects to maintain immutability
- **Sequential Execution**: Child nodes execute in document order without parallelization
- **Memory Management**: Avoid creating unnecessary intermediate objects during execution
- **Error Boundaries**: Handle errors at the node level to prevent cascade failures

### State Management

- **Shallow Copying**: Use spread operator for efficient state cloning
- **Deep Updates**: Use lodash.set or similar for nested property updates
- **Event Queuing**: Batch event generation to minimize state updates
- **Resource Cleanup**: Ensure proper cleanup in async operations

## Error Handling Best Practices

### SCXML Error Events

```typescript
import { BaseExecutableNode, addPendingEvent } from '@your-library/statecharts';

class RobustExecutableNode extends BaseExecutableNode {
  async run(state: InternalState): Promise<InternalState> {
    try {
      return await this.performOperation(state);
    } catch (error) {
      // Generate SCXML-compliant error event
      const errorEvent = {
        name: 'error.execution.failed',
        type: 'platform' as const,
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: error.message,
          source: this.constructor.name,
          location: 'run-method',
        },
      };

      return addPendingEvent(state, errorEvent);
    }
  }

  private async performOperation(state: InternalState): Promise<InternalState> {
    // Implementation that might throw
    throw new Error('Simulated error');
  }
}
```

### Validation and Guards

```typescript
import { BaseExecutableNode } from '@your-library/statecharts';

class ValidatedExecutableNode extends BaseExecutableNode {
  async run(state: InternalState): Promise<InternalState> {
    // Validate preconditions
    if (!this.validatePreconditions(state)) {
      return addPendingEvent(state, {
        name: 'error.execution.precondition-failed',
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: 'Preconditions not met for execution',
          source: this.constructor.name,
        },
      });
    }

    const result = await this.performValidatedOperation(state);

    // Validate postconditions
    if (!this.validatePostconditions(result)) {
      return addPendingEvent(state, {
        name: 'error.execution.postcondition-failed',
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: 'Postconditions not met after execution',
          source: this.constructor.name,
        },
      });
    }

    return result;
  }

  private validatePreconditions(state: InternalState): boolean {
    // Implement validation logic
    return state.data !== undefined;
  }

  private validatePostconditions(state: InternalState): boolean {
    // Implement validation logic
    return true;
  }

  private async performValidatedOperation(
    state: InternalState,
  ): Promise<InternalState> {
    // Safe operation implementation
    return state;
  }
}
```

## Best Practices

### Implementation Guidelines

1. **Always Override run()**: Provide meaningful implementation in concrete classes
2. **Immutable Updates**: Never mutate the input state directly
3. **Error Handling**: Convert exceptions to SCXML error events
4. **State Validation**: Validate state before and after operations
5. **Resource Management**: Clean up resources in async operations

### Schema Design

1. **Extend Base Schema**: Use `BaseExecutableNodeAttr.extend()` for consistency
2. **Validate Constraints**: Add custom validation for node-specific rules
3. **Mutual Exclusion**: Use Zod refinements for mutually exclusive attributes
4. **Default Values**: Provide sensible defaults for optional properties

### Performance Optimization

1. **Minimize Object Creation**: Reuse objects where possible
2. **Batch Operations**: Group related state changes together
3. **Lazy Evaluation**: Defer expensive operations until needed
4. **Memory Efficiency**: Avoid retaining references to large objects

## SCXML Specification Compliance

BaseExecutableNode ensures SCXML specification compliance:

- **Executable Content**: Proper identification of executable elements
- **Document Order**: Sequential execution of child elements
- **Error Handling**: SCXML-compliant error event generation
- **State Immutability**: Proper state management semantics
- **Event Generation**: Correct internal event handling

## See Also

- [BaseNode](./base.md) - Foundation class for all SCXML nodes
- [BaseStateNode](./base-state.md) - Base class for state-like nodes
- [EventQueue](./event-queue.md) - Event processing system
- [AssignNode](../nodes/assign.md) - Variable assignment implementation
- [RaiseNode](../nodes/raise.md) - Event generation implementation
- [DataNode](../nodes/data.md) - Data initialization implementation
- [OnEntryNode](../nodes/onentry.md) - Entry action container
- [OnExitNode](../nodes/onexit.md) - Exit action container
- [W3C SCXML Specification](https://www.w3.org/TR/scxml/) - Official specification
