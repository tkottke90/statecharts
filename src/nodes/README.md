# SCXML Nodes Documentation

This directory contains comprehensive documentation for all SCXML node types implemented in this TypeScript statecharts library. Each node type corresponds to an SCXML element and provides specific functionality within state machines.

## Overview

SCXML (State Chart XML) is a W3C specification for describing state machines. This library implements the core SCXML elements as TypeScript classes, each extending either `BaseNode` or `BaseExecutableNode` to provide the appropriate functionality.

## Node Categories

### Structural Nodes

These nodes define the structure and hierarchy of state machines:

- **[SCXML Node](./scxml.md)** - Root container for the entire state machine
- **[State Node](./state.md)** - Individual states (atomic and compound)
- **[Parallel Node](./parallel.md)** - Parallel state execution with concurrent regions
- **[Final Node](./final.md)** - Terminal states that generate completion events
- **[Initial Node](./initial.md)** - Initial state specification for compound states

### Data Management Nodes

These nodes handle data model definition and manipulation:

- **[DataModel Node](./datamodel.md)** - Container for data declarations
- **[Data Node](./data.md)** - Individual data variable declarations
- **[Assign Node](./assign.md)** - Variable assignment with expression evaluation

### Executable Content Nodes

These nodes provide executable actions within states and transitions:

- **[OnEntry Node](./onentry.md)** - Entry actions executed when states are entered
- **[OnExit Node](./onexit.md)** - Exit actions executed when states are exited
- **[Raise Node](./raise.md)** - Internal event generation for state machine communication

### Transition Nodes

These nodes define state machine behavior and transitions:

- **[Transition Node](./transition.md)** - State transitions with events, conditions, and executable content

## Node Hierarchy

```
BaseNode
├── SCXML Node (root container)
├── State Node (state definitions)
├── Parallel Node (concurrent states)
├── Final Node (terminal states)
├── Initial Node (initial state specification)
├── DataModel Node (data container)
└── Transition Node (state transitions)

BaseExecutableNode (extends BaseNode)
├── OnEntry Node (entry actions)
├── OnExit Node (exit actions)
├── Assign Node (variable assignment)
├── Raise Node (event generation)
└── Data Node (data initialization)
```

## Common Patterns

### Basic State Machine Structure

```xml
<scxml version="1.0" datamodel="ecmascript" initial="idle">
  <datamodel>
    <data id="counter" expr="0"/>
    <data id="status">ready</data>
  </datamodel>
  
  <state id="idle">
    <onentry>
      <assign location="status" expr="'idle'"/>
    </onentry>
    
    <transition event="start" target="active">
      <assign location="counter" expr="counter + 1"/>
      <raise event="stateChanged"/>
    </transition>
  </state>
  
  <state id="active">
    <onentry>
      <assign location="status" expr="'active'"/>
    </onentry>
    
    <onexit>
      <assign location="status" expr="'stopping'"/>
    </onexit>
    
    <transition event="stop" target="idle"/>
  </state>
</scxml>
```

### Parallel State Execution

```xml
<scxml version="1.0" initial="running">
  <state id="running">
    <parallel id="systems">
      <state id="healthSystem" initial="healthy">
        <state id="healthy">
          <transition event="damage" target="injured"/>
        </state>
        <state id="injured">
          <transition event="heal" target="healthy"/>
        </state>
      </state>
      
      <state id="scoreSystem" initial="scoring">
        <state id="scoring">
          <transition event="scorePoint" target="scoring">
            <assign location="score" expr="score + 1"/>
          </transition>
        </state>
      </state>
    </parallel>
  </state>
</scxml>
```

### Data-Driven Behavior

```xml
<scxml version="1.0" datamodel="ecmascript" initial="processing">
  <datamodel>
    <data id="items" expr="[]"/>
    <data id="currentIndex" expr="0"/>
    <data id="completed" expr="false"/>
  </datamodel>
  
  <state id="processing">
    <transition event="processNext" target="processing" cond="currentIndex < items.length">
      <assign location="currentIndex" expr="currentIndex + 1"/>
      <raise eventexpr="'item.' + currentIndex + '.processed'"/>
    </transition>
    
    <transition event="processNext" target="completed" cond="currentIndex >= items.length">
      <assign location="completed" expr="true"/>
      <raise event="allItemsProcessed"/>
    </transition>
  </state>
  
  <final id="completed">
    <onentry>
      <raise event="processingComplete"/>
    </onentry>
  </final>
</scxml>
```

## TypeScript Usage

### Importing Nodes

```typescript
import {
  SCXMLNode,
  StateNode,
  ParallelNode,
  FinalNode,
  InitialNode,
  DataModelNode,
  DataNode,
  AssignNode,
  OnEntryNode,
  OnExitNode,
  RaiseNode,
  TransitionNode
} from '@your-library/statecharts';
```

### Creating Node Instances

```typescript
// Create a state with entry actions
const activeState = new StateNode({
  state: {
    id: 'active',
    initial: undefined
  }
});

// Create entry actions
const entryAction = new OnEntryNode({
  onentry: {}
});

const statusAssign = new AssignNode({
  assign: {
    location: 'status',
    expr: '"active"'
  }
});

const notifyRaise = new RaiseNode({
  raise: {
    event: 'stateEntered'
  }
});

// Build the hierarchy
entryAction.children.push(statusAssign, notifyRaise);
activeState.children.push(entryAction);
```

### JSON Creation

```typescript
// Create nodes from parsed XML/JSON
const result = StateNode.createFromJSON({
  state: {
    id: 'myState',
    initial: 'substate'
  }
});

if (result.success) {
  const stateNode = result.node;
  console.log('State created:', stateNode.id);
} else {
  console.error('Validation failed:', result.error);
}
```

## Key Features

### Schema Validation

All nodes use Zod schemas for runtime validation:
- Type safety at runtime
- Detailed error messages
- Attribute validation
- Mutual exclusion constraints

### Expression Evaluation

Nodes support JavaScript expression evaluation:
- Dynamic value computation
- State context access
- Function calls and operations
- Type coercion and conversion

### Event System

Comprehensive event handling:
- Internal event generation
- External event processing
- Event queuing and processing
- Error event generation

### State Management

Immutable state updates:
- Structural sharing for performance
- Predictable state changes
- Debugging and history tracking
- Concurrent state support

## Error Handling

All nodes implement robust error handling:
- Schema validation errors
- Expression evaluation errors
- Runtime execution errors
- Platform error events

Error events follow SCXML naming conventions:
- `error.node.type` - Specific error types
- Platform events for system errors
- Detailed error information in event data

## Performance Considerations

- **Immutable Updates**: State objects are never mutated directly
- **Structural Sharing**: Unchanged parts of state are reused
- **Sequential Execution**: Executable content runs in document order
- **Memory Efficiency**: Minimal object creation during execution
- **Expression Caching**: Consider caching for frequently evaluated expressions

## SCXML Specification Compliance

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/) closely:

- **Core Elements**: All major SCXML elements are implemented
- **Execution Model**: Follows SCXML execution semantics
- **Event Processing**: Compliant event handling and processing
- **Data Model**: ECMAScript data model support
- **Error Handling**: Specification-compliant error events

## Testing

Each node type includes comprehensive test suites:
- Unit tests for individual node behavior
- Integration tests for node interactions
- Schema validation tests
- Error handling tests
- SCXML compliance tests

Test files follow the `*.spec.ts` naming convention and are located alongside the source files.

## See Also

- [W3C SCXML Specification](https://www.w3.org/TR/scxml/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Zod Schema Validation](https://zod.dev/)
- [Jest Testing Framework](https://jestjs.io/)

For detailed information about each node type, see the individual documentation files linked above.
