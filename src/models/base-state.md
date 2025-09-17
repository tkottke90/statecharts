# BaseStateNode Class

The `BaseStateNode` class is the specialized base class for all state-like SCXML nodes in this TypeScript statecharts library. It extends `BaseNode` and provides state-specific functionality including state hierarchy management, lifecycle methods, and transition handling.

## Overview

BaseStateNode serves as the foundation for all SCXML elements that represent states in a state machine. It provides the core state management functionality that is shared across different types of states (atomic states, compound states, parallel states, and final states).

Key responsibilities include:

- State hierarchy management (atomic vs compound states)
- Initial state resolution for compound states
- State lifecycle management (mount/unmount)
- OnEntry and OnExit action execution
- Transition management and discovery
- Child state navigation and access

BaseStateNode is designed to be extended by concrete state implementations like `StateNode`, `ParallelNode`, and `FinalNode`.

## Class Hierarchy

```
BaseNode
└── BaseStateNode (state-specific base class)
    ├── StateNode (regular states)
    ├── ParallelNode (concurrent states)
    └── FinalNode (terminal states)
```

## Properties

### Instance Properties

| Property        | Type                  | Default     | Description                                     |
| --------------- | --------------------- | ----------- | ----------------------------------------------- |
| `allowChildren` | `boolean`             | `true`      | Inherited from BaseNode, always true for states |
| `id`            | `string`              | `''`        | Unique identifier for the state                 |
| `initial`       | `string \| undefined` | `undefined` | Initial child state identifier                  |

### Computed Properties

| Property       | Type      | Description                             |
| -------------- | --------- | --------------------------------------- |
| `isAtomic`     | `boolean` | True if state has no child states       |
| `initialState` | `string`  | Resolved initial child state identifier |

## Schema Validation

BaseStateNode extends the base schema with state-specific attributes:

```typescript
const BaseStateNodeAttr = BaseNodeAttr.extend({
  id: z.string().min(1), // Required state identifier
  initial: z.string().optional(), // Optional initial child state
});
```

## Methods

### State Classification

#### `get isAtomic(): boolean`

Determines if the state is atomic (leaf state) or compound (has child states).

**Returns:**

- `true` if the state has no child states
- `false` if the state has one or more child states

**Usage:**

```typescript
if (state.isAtomic) {
  console.log('This is a leaf state');
} else {
  console.log('This is a compound state with children');
}
```

#### `get initialState(): string`

Resolves the initial child state for compound states using SCXML precedence rules.

**Resolution Order:**

1. Explicit `initial` attribute value
2. Content of `<initial>` child element
3. ID of first child state
4. Empty string if no children

**Returns:**

- String identifier of the initial child state
- Empty string if state is atomic or has no valid initial state

### Transition Management

#### `getTransitions(): TransitionNode[]`

Returns all outgoing transitions from this state.

**Returns:**

- Array of `TransitionNode` instances that are children of this state

#### `getEventlessTransitions(): TransitionNode[]`

Returns all eventless (automatic) transitions from this state.

**Returns:**

- Array of `TransitionNode` instances with no event trigger

### Child State Management

#### `getChildState(id?: string): BaseStateNode | BaseStateNode[] | undefined`

Retrieves child states by ID or returns all child states.

**Parameters:**

- `id` (optional) - Specific child state ID to find

**Returns:**

- If `id` provided: Single `BaseStateNode` or `undefined`
- If no `id`: Array of all child `BaseStateNode` instances
- Empty array if state is atomic

### Action Node Management

#### `getOnEntryNodes(): BaseNode[]`

Returns all OnEntry action nodes that have executable content.

**Returns:**

- Array of `OnEntryNode` instances with executable children

#### `getOnExitNodes(): BaseNode[]`

Returns all OnExit action nodes that have executable content.

**Returns:**

- Array of `OnExitNode` instances with executable children

### Lifecycle Methods

#### `async mount(state: InternalState): Promise<MountResponse>`

Executes state entry behavior and determines next steps for state machine execution.

**Process:**

1. Execute all OnEntry actions in document order
2. If atomic state: Return current state as final destination
3. If compound state: Return with `childPath` indicating initial child

**Parameters:**

- `state` - Current internal state of the state machine

**Returns:**

- `MountResponse` object containing:
  - `state`: Updated internal state after entry actions
  - `node`: Reference to this state node
  - `childPath`: (Optional) Initial child state to enter next

#### `async unmount(state: InternalState): Promise<InternalState>`

Executes state exit behavior when leaving the state.

**Process:**

1. Execute all OnExit actions in document order
2. Return updated state

**Parameters:**

- `state` - Current internal state of the state machine

**Returns:**

- Updated `InternalState` after exit actions

## Types and Interfaces

### MountResponse Interface

```typescript
interface MountResponse {
  state: InternalState; // Updated state after entry actions
  node: BaseStateNode; // Reference to the mounted state
  childPath?: string; // Optional initial child state ID
}
```

### StateNodeType

```typescript
type StateNodeType = {
  state: z.infer<typeof BaseStateNodeAttr>;
};
```

## Usage Examples

### Basic State Creation

```typescript
import { BaseStateNode } from '@your-library/statecharts';

// Create a custom state class
class CustomState extends BaseStateNode {
  constructor(data: any) {
    super(data);
    // @ts-expect-error - Setting readonly property
    this.id = data.id;
    this.initial = data.initial;
  }
}

// Create an atomic state
const atomicState = new CustomState({
  id: 'idle',
  content: '',
  children: [],
});

console.log(atomicState.isAtomic); // true
console.log(atomicState.initialState); // ''
```

### Compound State with Children

```typescript
import { BaseStateNode, StateNode } from '@your-library/statecharts';

// Create child states
const childState1 = new StateNode({
  state: { id: 'child1', content: '', children: [] },
});

const childState2 = new StateNode({
  state: { id: 'child2', content: '', children: [] },
});

// Create compound state
const compoundState = new StateNode({
  state: {
    id: 'parent',
    initial: 'child1',
    content: '',
    children: [childState1, childState2],
  },
});

console.log(compoundState.isAtomic); // false
console.log(compoundState.initialState); // 'child1'
console.log(compoundState.getChildState('child2')); // childState2
```

### State with Transitions

```typescript
import { BaseStateNode, TransitionNode } from '@your-library/statecharts';

// Create transitions
const transition1 = new TransitionNode({
  transition: {
    event: 'go',
    target: 'nextState',
    content: '',
    children: [],
  },
});

const eventlessTransition = new TransitionNode({
  transition: {
    event: '',
    target: 'autoState',
    content: '',
    children: [],
  },
});

// Create state with transitions
const stateWithTransitions = new StateNode({
  state: {
    id: 'active',
    content: '',
    children: [transition1, eventlessTransition],
  },
});

const allTransitions = stateWithTransitions.getTransitions();
console.log(allTransitions.length); // 2

const eventlessOnly = stateWithTransitions.getEventlessTransitions();
console.log(eventlessOnly.length); // 1
```

### State Lifecycle Example

```typescript
import {
  BaseStateNode,
  OnEntryNode,
  OnExitNode,
  AssignNode,
} from '@your-library/statecharts';

// Create entry actions
const entryAction = new OnEntryNode({
  onentry: {
    content: '',
    children: [
      new AssignNode({
        assign: {
          location: 'entryTime',
          expr: 'Date.now()',
          content: '',
          children: [],
        },
      }),
    ],
  },
});

// Create exit actions
const exitAction = new OnExitNode({
  onexit: {
    content: '',
    children: [
      new AssignNode({
        assign: {
          location: 'exitTime',
          expr: 'Date.now()',
          content: '',
          children: [],
        },
      }),
    ],
  },
});

// Create state with lifecycle actions
const lifecycleState = new StateNode({
  state: {
    id: 'tracked',
    content: '',
    children: [entryAction, exitAction],
  },
});

// Execute lifecycle
const initialState = { data: {}, _datamodel: 'ecmascript' };

// Mount (enter) the state
const mountResult = await lifecycleState.mount(initialState);
console.log('Entry time set:', mountResult.state.data.entryTime);

// Unmount (exit) the state
const finalState = await lifecycleState.unmount(mountResult.state);
console.log('Exit time set:', finalState.data.exitTime);
```

## State Hierarchy Patterns

### Initial State Resolution

```typescript
import {
  BaseStateNode,
  InitialNode,
  StateNode,
} from '@your-library/statecharts';

// Method 1: Using initial attribute
const stateWithInitialAttr = new StateNode({
  state: {
    id: 'parent',
    initial: 'specificChild', // Explicit initial state
    content: '',
    children: [
      /* child states */
    ],
  },
});

// Method 2: Using <initial> element
const initialElement = new InitialNode({
  initial: { content: 'defaultChild', children: [] },
});

const stateWithInitialElement = new StateNode({
  state: {
    id: 'parent',
    content: '',
    children: [initialElement /* child states */],
  },
});

// Method 3: First child becomes initial (fallback)
const stateWithImplicitInitial = new StateNode({
  state: {
    id: 'parent',
    content: '',
    children: [
      /* first child becomes initial */
    ],
  },
});
```

### Atomic vs Compound State Detection

```typescript
import { BaseStateNode } from '@your-library/statecharts';

class StateAnalyzer {
  static analyzeState(state: BaseStateNode) {
    if (state.isAtomic) {
      console.log(`${state.id} is an atomic (leaf) state`);
      console.log('- Can contain transitions and actions');
      console.log('- Cannot contain child states');
      console.log('- Execution stops here');
    } else {
      console.log(`${state.id} is a compound state`);
      console.log(`- Initial child: ${state.initialState}`);
      console.log(`- Child count: ${state.getChildState().length}`);
      console.log('- Will enter initial child state');
    }
  }
}

// Usage
StateAnalyzer.analyzeState(someState);
```

### Transition Discovery

```typescript
import { BaseStateNode } from '@your-library/statecharts';

class TransitionAnalyzer {
  static analyzeTransitions(state: BaseStateNode) {
    const allTransitions = state.getTransitions();
    const eventlessTransitions = state.getEventlessTransitions();
    const eventTransitions = allTransitions.filter(t => !t.isEventLess);

    console.log(`State ${state.id} transition analysis:`);
    console.log(`- Total transitions: ${allTransitions.length}`);
    console.log(`- Event-triggered: ${eventTransitions.length}`);
    console.log(`- Eventless (automatic): ${eventlessTransitions.length}`);

    // List event-triggered transitions
    eventTransitions.forEach(transition => {
      console.log(`  Event "${transition.event}" -> ${transition.target}`);
    });

    // List automatic transitions
    eventlessTransitions.forEach(transition => {
      console.log(`  Auto transition -> ${transition.target}`);
    });
  }
}
```

## Advanced Usage Patterns

### Custom State Behavior

```typescript
import { BaseStateNode, MountResponse } from '@your-library/statecharts';

class TimedState extends BaseStateNode {
  private timeout: number;

  constructor(data: any, timeout: number = 5000) {
    super(data);
    this.timeout = timeout;
  }

  async mount(state: InternalState): Promise<MountResponse> {
    // Execute standard mount behavior
    const result = await super.mount(state);

    // Add custom timeout behavior
    setTimeout(() => {
      // Generate timeout event after specified duration
      this.generateTimeoutEvent();
    }, this.timeout);

    return result;
  }

  private generateTimeoutEvent() {
    // Custom timeout logic
    console.log(`State ${this.id} timed out after ${this.timeout}ms`);
  }
}
```

### State Validation

```typescript
import { BaseStateNode } from '@your-library/statecharts';

class StateValidator {
  static validateState(state: BaseStateNode): string[] {
    const errors: string[] = [];

    // Validate ID
    if (!state.id || state.id.trim() === '') {
      errors.push('State must have a non-empty ID');
    }

    // Validate initial state for compound states
    if (!state.isAtomic) {
      const initialState = state.initialState;
      if (!initialState) {
        errors.push('Compound state must have an initial child state');
      } else {
        const childState = state.getChildState(initialState);
        if (!childState) {
          errors.push(`Initial state "${initialState}" not found in children`);
        }
      }
    }

    // Validate transitions
    const transitions = state.getTransitions();
    transitions.forEach((transition, index) => {
      if (!transition.target) {
        errors.push(`Transition ${index} missing target`);
      }
    });

    return errors;
  }
}

// Usage
const errors = StateValidator.validateState(myState);
if (errors.length > 0) {
  console.error('State validation errors:', errors);
}
```

### State Machine Navigation

```typescript
import { BaseStateNode } from '@your-library/statecharts';

class StateNavigator {
  static findStateById(
    root: BaseStateNode,
    targetId: string,
  ): BaseStateNode | null {
    // Check if this is the target state
    if (root.id === targetId) {
      return root;
    }

    // Search in child states recursively
    const childStates = root.getChildState() as BaseStateNode[];
    for (const child of childStates) {
      const found = this.findStateById(child, targetId);
      if (found) {
        return found;
      }
    }

    return null;
  }

  static getStatePath(state: BaseStateNode): string[] {
    const path: string[] = [];
    let current: BaseStateNode | null = state;

    while (current) {
      path.unshift(current.id);
      // In a real implementation, you'd track parent relationships
      current = null; // Simplified for example
    }

    return path;
  }

  static findCommonAncestor(
    state1: BaseStateNode,
    state2: BaseStateNode,
  ): BaseStateNode | null {
    const path1 = this.getStatePath(state1);
    const path2 = this.getStatePath(state2);

    // Find common prefix
    let commonLength = 0;
    const minLength = Math.min(path1.length, path2.length);

    for (let i = 0; i < minLength; i++) {
      if (path1[i] === path2[i]) {
        commonLength++;
      } else {
        break;
      }
    }

    if (commonLength > 0) {
      // Return the common ancestor (simplified)
      return state1; // In real implementation, navigate to common ancestor
    }

    return null;
  }
}
```

## Integration with Concrete State Types

### StateNode Integration

```typescript
import { StateNode } from '@your-library/statecharts';

// StateNode extends BaseStateNode with standard state behavior
const regularState = new StateNode({
  state: {
    id: 'processing',
    initial: 'idle',
    content: '',
    children: [],
  },
});

// Inherits all BaseStateNode functionality
console.log(regularState.isAtomic); // false (has initial child)
console.log(regularState.initialState); // 'idle'
```

### ParallelNode Integration

```typescript
import { ParallelNode } from '@your-library/statecharts';

// ParallelNode extends BaseStateNode with concurrent behavior
const parallelState = new ParallelNode({
  parallel: {
    id: 'concurrent',
    content: '',
    children: [],
  },
});

// Overrides some BaseStateNode behavior
console.log(parallelState.isAtomic); // false (always compound)
console.log(parallelState.initialState); // '' (all children are initial)
```

### FinalNode Integration

```typescript
import { FinalNode } from '@your-library/statecharts';

// FinalNode extends BaseStateNode with termination behavior
const finalState = new FinalNode({
  final: {
    id: 'completed',
    content: '',
    children: [],
  },
});

// Uses BaseStateNode mount/unmount with done event generation
const mountResult = await finalState.mount(initialState);
// Generates done.state.{parent_id} event automatically
```

## Testing Patterns

### Unit Testing BaseStateNode

```typescript
import {
  BaseStateNode,
  OnEntryNode,
  OnExitNode,
  AssignNode,
} from '@your-library/statecharts';

describe('BaseStateNode', () => {
  describe('State Classification', () => {
    it('should identify atomic states correctly', () => {
      const atomicState = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'atomic';
        }
      })();

      expect(atomicState.isAtomic).toBe(true);
      expect(atomicState.initialState).toBe('');
    });

    it('should identify compound states correctly', () => {
      const childState = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'child';
        }
      })();

      const compoundState = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [childState] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'compound';
        }
      })();

      expect(compoundState.isAtomic).toBe(false);
      expect(compoundState.initialState).toBe('child');
    });
  });

  describe('Lifecycle Methods', () => {
    it('should execute onentry actions during mount', async () => {
      const assignNode = new AssignNode({
        assign: {
          location: 'mounted',
          expr: 'true',
          content: '',
          children: [],
        },
      });

      const onEntryNode = new OnEntryNode({
        onentry: { content: '', children: [assignNode] },
      });

      const state = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [onEntryNode] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'testState';
        }
      })();

      const initialState = { data: {}, _datamodel: 'ecmascript' };
      const result = await state.mount(initialState);

      expect(result.state.data.mounted).toBe(true);
      expect(result.node).toBe(state);
    });

    it('should execute onexit actions during unmount', async () => {
      const assignNode = new AssignNode({
        assign: {
          location: 'unmounted',
          expr: 'true',
          content: '',
          children: [],
        },
      });

      const onExitNode = new OnExitNode({
        onexit: { content: '', children: [assignNode] },
      });

      const state = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [onExitNode] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'testState';
        }
      })();

      const initialState = { data: {}, _datamodel: 'ecmascript' };
      const result = await state.unmount(initialState);

      expect(result.data.unmounted).toBe(true);
    });
  });

  describe('Child State Management', () => {
    it('should find child states by ID', () => {
      const child1 = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'child1';
        }
      })();

      const child2 = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'child2';
        }
      })();

      const parent = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [child1, child2] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'parent';
        }
      })();

      expect(parent.getChildState('child1')).toBe(child1);
      expect(parent.getChildState('child2')).toBe(child2);
      expect(parent.getChildState('nonexistent')).toBeUndefined();
    });

    it('should return all child states when no ID specified', () => {
      const child1 = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'child1';
        }
      })();

      const child2 = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'child2';
        }
      })();

      const parent = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [child1, child2] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'parent';
        }
      })();

      const allChildren = parent.getChildState() as BaseStateNode[];
      expect(allChildren).toHaveLength(2);
      expect(allChildren).toContain(child1);
      expect(allChildren).toContain(child2);
    });
  });
});
```

## Performance Considerations

### Memory Management

- **Immutable State Updates**: All lifecycle methods return new state objects
- **Lazy Child Discovery**: Child states are found on-demand using type filtering
- **Action Filtering**: Only executable OnEntry/OnExit nodes are processed

### Execution Optimization

- **Sequential Action Execution**: OnEntry and OnExit actions execute in document order
- **Early Returns**: Atomic states skip child state resolution
- **Efficient Type Checking**: Uses instanceof for child node filtering

### State Hierarchy Optimization

- **Cached Initial State**: Initial state resolution follows SCXML precedence
- **Efficient Child Access**: Direct array filtering for child state discovery
- **Minimal Object Creation**: Reuses existing node references where possible

## Error Handling

### Lifecycle Error Handling

```typescript
import {
  BaseStateNode,
  addPendingEvent,
  fromJsError,
} from '@your-library/statecharts';

class SafeStateNode extends BaseStateNode {
  async mount(state: InternalState): Promise<MountResponse> {
    try {
      return await super.mount(state);
    } catch (error) {
      // Convert to SCXML error event
      const errorEvent = fromJsError(error);
      errorEvent.name = 'error.state.mount-failed';
      errorEvent.data.source = 'state';
      errorEvent.data.stateId = this.id;

      const stateWithError = addPendingEvent(state, errorEvent);
      return { state: stateWithError, node: this };
    }
  }

  async unmount(state: InternalState): Promise<InternalState> {
    try {
      return await super.unmount(state);
    } catch (error) {
      // Log error but continue with unmount
      console.error(`Error during unmount of state ${this.id}:`, error);
      return state; // Return original state if unmount fails
    }
  }
}
```

### Validation Error Handling

```typescript
import { BaseStateNode } from '@your-library/statecharts';

class ValidatedStateNode extends BaseStateNode {
  constructor(data: any) {
    super(data);
    this.validateState();
  }

  private validateState() {
    if (!this.id) {
      throw new Error('State must have a valid ID');
    }

    if (!this.isAtomic && !this.initialState) {
      throw new Error(
        `Compound state ${this.id} must have an initial child state`,
      );
    }

    // Validate that initial state exists in children
    if (this.initialState) {
      const initialChild = this.getChildState(this.initialState);
      if (!initialChild) {
        throw new Error(
          `Initial state "${this.initialState}" not found in children of ${this.id}`,
        );
      }
    }
  }
}
```

## Best Practices

### State Design

1. **Clear State IDs**: Use descriptive, hierarchical state identifiers
2. **Proper Initial States**: Always specify initial states for compound states
3. **Atomic vs Compound**: Design clear state hierarchies with appropriate nesting
4. **Action Organization**: Group related OnEntry/OnExit actions logically

### Lifecycle Management

1. **Immutable Updates**: Never mutate the state object directly
2. **Error Handling**: Wrap lifecycle methods in try-catch blocks
3. **Action Ordering**: Rely on document order for action execution
4. **Resource Cleanup**: Use OnExit actions for proper resource cleanup

### Performance

1. **Minimize Deep Nesting**: Avoid overly deep state hierarchies
2. **Efficient Child Access**: Cache child state references when appropriate
3. **Action Optimization**: Keep OnEntry/OnExit actions lightweight
4. **Memory Management**: Avoid circular references in state hierarchies

## SCXML Specification Compliance

BaseStateNode implements key SCXML specification requirements:

- **State Identification**: Unique state IDs within their scope
- **Initial State Resolution**: SCXML-compliant initial state precedence
- **Entry/Exit Actions**: Document-order execution of OnEntry/OnExit
- **State Classification**: Proper atomic vs compound state semantics
- **Transition Support**: Full support for outgoing transitions
- **Hierarchy Management**: Proper parent-child state relationships

## See Also

- [BaseNode](./base.md) - Foundation class for all SCXML nodes
- [BaseExecutableNode](./base-executable.md) - Base class for executable content
- [EventQueue](./event-queue.md) - Event processing system
- [StateNode](../nodes/state.md) - Regular state implementation
- [ParallelNode](../nodes/parallel.md) - Concurrent state implementation
- [FinalNode](../nodes/final.md) - Terminal state implementation
- [W3C SCXML Specification](https://www.w3.org/TR/scxml/) - Official specification
