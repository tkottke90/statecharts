# BaseNode Class

The `BaseNode` class is the foundational base class for all SCXML node types in this TypeScript statecharts library. It provides the core functionality, schema validation, and common patterns that all SCXML elements share.

## Overview

BaseNode serves as the abstract foundation for the entire SCXML node hierarchy. Every SCXML element (states, transitions, executable content, etc.) extends either BaseNode directly or one of its specialized subclasses (BaseStateNode, BaseExecutableNode).

The class implements the fundamental node contract including:

- Content and children management
- Schema validation with Zod
- Child execution patterns
- Type-safe node creation
- Label and identification systems

BaseNode is designed to be extended rather than used directly, providing the common infrastructure that all SCXML nodes require.

## Class Hierarchy

```
BaseNode (foundation class)
├── BaseStateNode (extends BaseNode)
│   ├── StateNode
│   ├── ParallelNode
│   └── FinalNode
├── BaseExecutableNode (extends BaseNode)
│   ├── AssignNode
│   ├── RaiseNode
│   ├── DataNode
│   ├── OnEntryNode
│   └── OnExitNode
└── Direct Extensions
    ├── SCXMLNode
    ├── InitialNode
    ├── DataModelNode
    └── TransitionNode
```

## Properties

### Instance Properties

| Property        | Type         | Default | Description                              |
| --------------- | ------------ | ------- | ---------------------------------------- |
| `isExecutable`  | `boolean`    | `false` | Whether the node can be executed         |
| `allowChildren` | `boolean`    | `false` | Whether the node can contain child nodes |
| `children`      | `BaseNode[]` | `[]`    | Array of child nodes                     |
| `content`       | `string`     | `''`    | Text content of the node                 |

### Static Properties

| Property | Type        | Default        | Description               |
| -------- | ----------- | -------------- | ------------------------- |
| `label`  | `string`    | `'base'`       | Node type identifier      |
| `schema` | `ZodSchema` | `BaseNodeAttr` | Zod schema for validation |

### Computed Properties

| Property | Type     | Description                     |
| -------- | -------- | ------------------------------- |
| `label`  | `string` | Instance label from constructor |

## Methods

### Constructor

```typescript
constructor({ content, children }: z.infer<typeof BaseNodeAttr>)
```

Creates a new BaseNode instance with the provided content and children.

**Parameters:**

- `content` - Optional string content (defaults to empty string)
- `children` - Optional array of child nodes (defaults to empty array)

### Instance Methods

#### `executeAllChildren(state: InternalState): AsyncGenerator`

Executes all executable children sequentially and yields intermediate states.

**Parameters:**

- `state` - Current internal state

**Returns:**

- `AsyncGenerator` yielding `{ node: string, state: InternalState }`

**Behavior:**

- Returns immediately if `allowChildren` is false
- Filters children to only executable nodes (`isExecutable = true`)
- Executes children in document order
- Yields intermediate state after each child execution
- Returns final state

#### `getChildrenOfType<T>(typeCtor: Constructor<T>): T[]`

Returns all child nodes of a specific type.

**Parameters:**

- `typeCtor` - Constructor function for the desired node type

**Returns:**

- Array of child nodes matching the specified type

#### `run(state: InternalState): Promise<InternalState>`

Base implementation of node execution. Returns state unchanged.

**Parameters:**

- `state` - Current internal state

**Returns:**

- Promise resolving to the same state (base implementation)

### Static Methods

#### `getAttributes(key: string, jsonInput: Record<string, unknown>): unknown`

Utility method for extracting node attributes from JSON input.

**Parameters:**

- `key` - Attribute key to look for
- `jsonInput` - JSON object to search

**Returns:**

- Attribute value if key exists, otherwise the entire jsonInput object

## Schema Validation

BaseNode uses Zod schemas for runtime type validation:

### BaseNodeAttr Schema

```typescript
const BaseNodeAttr = z.object({
  content: z.string().optional().default(''),
  children: z.array(z.any()).default([]),
});
```

### Extended Schemas

BaseNode provides foundation schemas that other nodes extend:

```typescript
// For state-like nodes
const BaseStateAttr = BaseNodeAttr.extend({
  id: z.string().min(1),
});

// For transition-like nodes
const BaseTransitionAttr = BaseNodeAttr.extend({
  event: z.string().optional().default(''),
  target: z.string().min(1),
});
```

## Usage Examples

### Basic Node Creation

```typescript
import { BaseNode } from '@your-library/statecharts';

// Create a basic node
const node = new BaseNode({
  content: 'Hello World',
  children: [],
});

console.log(node.content); // 'Hello World'
console.log(node.isExecutable); // false
console.log(node.allowChildren); // false
console.log(node.label); // 'base'
```

### Working with Children

```typescript
import { BaseNode } from '@your-library/statecharts';
import { DataNode } from '@your-library/statecharts';

// Create a node that allows children
class CustomNode extends BaseNode {
  constructor(data: any) {
    super(data);
    this.allowChildren = true; // Enable children
  }
}

// Create child nodes
const dataNode = new DataNode({
  data: {
    id: 'counter',
    expr: '0',
    content: '',
    children: [],
  },
});

// Create parent with children
const parentNode = new CustomNode({
  content: '',
  children: [dataNode],
});

// Get children of specific type
const dataChildren = parentNode.getChildrenOfType(DataNode);
console.log(dataChildren.length); // 1
```

### Child Execution Pattern

```typescript
import { BaseNode, InternalState } from '@your-library/statecharts';

class ExecutableParent extends BaseNode {
  constructor(data: any) {
    super(data);
    this.allowChildren = true;
  }

  async run(state: InternalState): Promise<InternalState> {
    let currentState = { ...state };

    // Execute all children and collect results
    for await (const { node, state: newState } of this.executeAllChildren(
      currentState,
    )) {
      console.log(`Executed ${node}, new state:`, newState);
      currentState = newState;
    }

    return currentState;
  }
}
```

### Extending BaseNode

```typescript
import { BaseNode, BaseNodeAttr } from '@your-library/statecharts';
import z from 'zod';

// Define custom schema
const CustomNodeAttr = BaseNodeAttr.extend({
  customProperty: z.string(),
});

// Create custom node class
class CustomNode extends BaseNode {
  customProperty: string;

  static label = 'custom';
  static schema = CustomNodeAttr;

  constructor({ custom }: { custom: z.infer<typeof CustomNodeAttr> }) {
    super(custom);
    this.customProperty = custom.customProperty;
  }

  async run(state: InternalState): Promise<InternalState> {
    // Custom execution logic
    console.log(`Executing custom node: ${this.customProperty}`);
    return state;
  }
}
```

## Common Patterns

### Node Factory Pattern

```typescript
import { BaseNode } from '@your-library/statecharts';
import { CreateFromJsonResponse } from '@your-library/statecharts';

class MyNode extends BaseNode {
  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<MyNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new MyNode({ mynode: data }),
      error: undefined,
    };
  }
}
```

### Type-Safe Child Access

```typescript
import { BaseNode } from '@your-library/statecharts';
import { StateNode, TransitionNode } from '@your-library/statecharts';

class StateMachine extends BaseNode {
  constructor(data: any) {
    super(data);
    this.allowChildren = true;
  }

  get states(): StateNode[] {
    return this.getChildrenOfType(StateNode);
  }

  get transitions(): TransitionNode[] {
    return this.getChildrenOfType(TransitionNode);
  }

  findStateById(id: string): StateNode | undefined {
    return this.states.find(state => state.id === id);
  }
}
```

### Validation and Error Handling

```typescript
import { BaseNode } from '@your-library/statecharts';
import z from 'zod';

const StrictNodeAttr = BaseNodeAttr.extend({
  requiredField: z.string().min(1, 'Required field cannot be empty'),
});

class StrictNode extends BaseNode {
  static schema = StrictNodeAttr;

  static createFromJSON(jsonInput: Record<string, unknown>) {
    const result = this.schema.safeParse(jsonInput);

    if (!result.success) {
      console.error('Validation errors:', result.error.errors);
      return { success: false, error: result.error, node: undefined };
    }

    return {
      success: true,
      node: new StrictNode(result.data),
      error: undefined,
    };
  }
}
```

## Integration with SCXML Nodes

### Node Registration Pattern

```typescript
import { BaseNode } from '@your-library/statecharts';

// All SCXML nodes follow this pattern
class SCXMLElementNode extends BaseNode {
  static label = 'element-name'; // Matches XML element name
  static schema = ElementSchema; // Zod schema for validation

  constructor(data: ElementType) {
    super(data.element);
    // Initialize element-specific properties
  }

  // Element-specific behavior
  async run(state: InternalState): Promise<InternalState> {
    // Implementation specific to this SCXML element
    return state;
  }
}
```

### Parser Integration

```typescript
// BaseNode integrates with the XML parser
import { parse } from '@your-library/statecharts';

const xmlString = `
  <scxml initial="start">
    <state id="start">
      <transition event="go" target="end"/>
    </state>
    <final id="end"/>
  </scxml>
`;

// Parser creates BaseNode hierarchy
const { success, node } = parse(xmlString);
if (success) {
  console.log('Root node type:', node.label); // 'scxml'
  console.log('Child count:', node.children.length);
}
```

## Performance Considerations

### Memory Management

- **Immutable State**: BaseNode never mutates the state object directly
- **Structural Sharing**: Child arrays are shared when possible
- **Lazy Evaluation**: Child execution uses generators for memory efficiency

### Execution Optimization

- **Sequential Processing**: Children execute in document order
- **Early Returns**: `executeAllChildren` returns early if `allowChildren` is false
- **Type Filtering**: Only executable children are processed during execution

### Schema Validation

- **Runtime Safety**: Zod schemas provide runtime type checking
- **Error Boundaries**: Validation errors are contained and reported
- **Performance**: Schema validation is performed once during node creation

## Error Handling

### Validation Errors

```typescript
import { BaseNode } from '@your-library/statecharts';

// Validation errors are captured in createFromJSON pattern
const result = SomeNode.createFromJSON(invalidData);

if (!result.success) {
  console.error('Validation failed:', result.error);
  // result.error is a ZodError with detailed information
  result.error.errors.forEach(err => {
    console.log(`Field: ${err.path.join('.')}, Message: ${err.message}`);
  });
}
```

### Runtime Errors

```typescript
// BaseNode provides safe execution patterns
class SafeNode extends BaseNode {
  async run(state: InternalState): Promise<InternalState> {
    try {
      // Potentially failing operation
      return await this.performOperation(state);
    } catch (error) {
      // Convert to SCXML error event
      return addPendingEvent(state, {
        name: 'error.execution',
        type: 'platform',
        data: { error: error.message },
      });
    }
  }
}
```

## Testing Patterns

### Unit Testing BaseNode

```typescript
import { BaseNode } from '@your-library/statecharts';
import { DataNode } from '@your-library/statecharts';

describe('BaseNode', () => {
  it('should create a BaseNode instance', () => {
    const node = new BaseNode({ content: 'test', children: [] });
    expect(node).toBeInstanceOf(BaseNode);
    expect(node.content).toBe('test');
    expect(node.children).toEqual([]);
  });

  it('should execute children sequentially', async () => {
    const executableChild = new DataNode({
      data: { id: 'test', content: 'value', children: [] },
    });

    const parent = new BaseNode({
      content: '',
      children: [executableChild],
    });
    parent.allowChildren = true;

    const results = [];
    for await (const result of parent.executeAllChildren({ data: {} })) {
      results.push(result);
    }

    expect(results).toHaveLength(1);
    expect(results[0].node).toBe('DataNode');
  });

  it('should filter children by type', () => {
    const dataNode = new DataNode({
      data: { id: 'test', content: 'value', children: [] },
    });

    const parent = new BaseNode({
      content: '',
      children: [dataNode],
    });

    const dataChildren = parent.getChildrenOfType(DataNode);
    expect(dataChildren).toHaveLength(1);
    expect(dataChildren[0]).toBe(dataNode);
  });
});
```

### Integration Testing

```typescript
import { StateChart } from '@your-library/statecharts';

describe('BaseNode Integration', () => {
  it('should work within complete state machine', async () => {
    const xml = `
      <scxml initial="start">
        <state id="start">
          <onentry>
            <assign location="counter" expr="0"/>
          </onentry>
          <transition event="increment" target="start">
            <assign location="counter" expr="counter + 1"/>
          </transition>
        </state>
      </scxml>
    `;

    const stateChart = StateChart.fromXML(xml);
    const initialState = { data: {}, _datamodel: 'ecmascript' };

    const result = await stateChart.execute(initialState);
    expect(result.data.counter).toBe(0);

    const afterIncrement = await stateChart.handleEvent({
      name: 'increment',
      type: 'external',
    });
    expect(afterIncrement.data.counter).toBe(1);
  });
});
```

## Best Practices

### Extending BaseNode

1. **Always call super()**: Ensure parent constructor is called
2. **Set static properties**: Define `label` and `schema` for each node type
3. **Implement createFromJSON**: Follow the standard factory pattern
4. **Handle allowChildren**: Set appropriately based on SCXML specification
5. **Override run() method**: Implement node-specific behavior

### Schema Design

1. **Extend base schemas**: Use `BaseNodeAttr.extend()` for consistency
2. **Provide defaults**: Use Zod defaults for optional properties
3. **Validate constraints**: Add custom validation for business rules
4. **Document schemas**: Include JSDoc comments for schema properties

### Error Handling

1. **Use safe parsing**: Always use `safeParse()` for validation
2. **Return structured errors**: Follow `CreateFromJsonResponse` pattern
3. **Log appropriately**: Provide meaningful error messages
4. **Handle gracefully**: Don't throw exceptions in normal operation

### Performance

1. **Minimize state mutations**: Always return new state objects
2. **Use generators**: Leverage `executeAllChildren` for memory efficiency
3. **Cache when appropriate**: Store computed values that don't change
4. **Profile execution**: Monitor performance in complex state machines

## SCXML Specification Compliance

BaseNode provides the foundation for SCXML specification compliance:

- **Document Order**: Child execution follows XML document order
- **Content Model**: Supports both element content and child elements
- **Error Handling**: Provides framework for SCXML error events
- **State Management**: Immutable state updates align with SCXML semantics
- **Extensibility**: Allows custom elements while maintaining compliance

## See Also

- [BaseStateNode](./base-state.md) - Base class for state-like nodes
- [BaseExecutableNode](./base-executable.md) - Base class for executable content
- [EventQueue](./event-queue.md) - Event processing system
- [SCXML Node](../nodes/scxml.md) - Root state machine container
- [State Node](../nodes/state.md) - Individual state implementation
- [W3C SCXML Specification](https://www.w3.org/TR/scxml/) - Official specification
