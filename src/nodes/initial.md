# Initial Node

The `<initial>` element is an informational node used to specify the initial child state of a compound state. It provides an alternative to using the `initial` attribute on state elements.

## Overview

The Initial node is a purely informational element that specifies which child state should be entered when a compound state is activated. It serves as an alternative to the `initial` attribute on state elements and is particularly useful when you want to make the initial state selection more explicit in the XML structure.

The Initial node extends BaseNode but is not executable - it only provides information about which state should be initially active.

### Content

The `content` attribute contains the ID of the child state that should be initially active when the parent compound state is entered. This is the primary purpose of the Initial node.

## Usage Examples

### Basic Initial State Declaration

```xml
<state id="gameLevel">
  <initial>playing</initial>
  
  <state id="playing">
    <transition event="pause" target="paused"/>
  </state>
  
  <state id="paused">
    <transition event="resume" target="playing"/>
  </state>
</state>
```

### Alternative to Initial Attribute

Instead of using the `initial` attribute:

```xml
<!-- Using initial attribute -->
<state id="workflow" initial="step1">
  <state id="step1">
    <transition event="next" target="step2"/>
  </state>
  <state id="step2">
    <transition event="complete" target="finished"/>
  </state>
</state>
```

You can use the `<initial>` element:

```xml
<!-- Using initial element -->
<state id="workflow">
  <initial>step1</initial>
  
  <state id="step1">
    <transition event="next" target="step2"/>
  </state>
  <state id="step2">
    <transition event="complete" target="finished"/>
  </state>
</state>
```

### Complex State Hierarchy

```xml
<state id="application">
  <initial>loading</initial>
  
  <state id="loading">
    <transition event="loaded" target="main"/>
  </state>
  
  <state id="main">
    <initial>dashboard</initial>
    
    <state id="dashboard">
      <transition event="navigate.settings" target="settings"/>
    </state>
    
    <state id="settings">
      <transition event="navigate.back" target="dashboard"/>
    </state>
  </state>
</state>
```

### Multiple Compound States

```xml
<state id="gameSystem">
  <initial>menu</initial>
  
  <state id="menu">
    <transition event="startGame" target="playing"/>
  </state>
  
  <state id="playing">
    <initial>level1</initial>
    
    <state id="level1">
      <transition event="levelComplete" target="level2"/>
    </state>
    
    <state id="level2">
      <transition event="gameComplete" target="victory"/>
    </state>
    
    <final id="victory"/>
  </state>
</state>
```

## Initial State Resolution Priority

When determining the initial child state, the state machine uses the following priority order:

1. **Initial attribute**: If the parent state has an `initial` attribute, it takes precedence
2. **Initial element**: If no `initial` attribute exists, the `<initial>` element's content is used
3. **First child state**: If neither exists, the first child state in document order is used

```xml
<!-- Priority example -->
<state id="example" initial="fromAttribute">
  <!-- This initial element will be ignored because initial attribute exists -->
  <initial>fromElement</initial>
  
  <state id="fromAttribute"/>
  <state id="fromElement"/>
  <state id="firstChild"/>
</state>
```

## TypeScript Usage

### Creating an Initial Node

```typescript
import { InitialNode } from '@your-library/statecharts';

// Basic initial node
const initialNode = new InitialNode({
  initial: {
    content: 'startState',
    children: []
  }
});

console.log(initialNode.content); // 'startState'
```

### Creating from JSON

```typescript
// From parsed XML/JSON
const result = InitialNode.createFromJSON({
  initial: {
    content: 'initialState'
  }
});

if (result.success) {
  const initialNode = result.node;
  console.log(`Initial state: ${initialNode.content}`);
} else {
  console.error('Validation failed:', result.error);
}

// Direct JSON format (without 'initial' wrapper)
const directResult = InitialNode.createFromJSON({
  content: 'myInitialState'
});
```

### Usage in State Resolution

The Initial node is primarily used internally by the state machine during initial state resolution:

```typescript
import { BaseStateNode, InitialNode } from '@your-library/statecharts';

// Example of how BaseStateNode uses InitialNode
class ExampleState extends BaseStateNode {
  get initialState() {
    // 1. Check for initial attribute
    if (this.initial) {
      return this.initial;
    }

    // 2. Check for initial element
    const initialChild = this.getChildrenOfType(InitialNode)[0];
    if (initialChild) {
      return initialChild.content; // This is where Initial node is used
    }

    // 3. Use first child state
    const firstChild = this.getChildrenOfType(BaseStateNode)[0];
    if (firstChild) {
      return firstChild.id;
    }

    return '';
  }
}
```

## Properties

The InitialNode class inherits from BaseNode and provides:

- `content: string` - The ID of the initial child state
- `children: BaseNode[]` - Child elements (typically empty)

## Behavior

The Initial node is:
- **Non-executable**: It does not participate in state machine execution
- **Informational only**: It only provides information about initial state selection
- **Passive**: It has no runtime behavior beyond providing its content value

## Validation

The Initial node performs basic validation:

- **Content**: Optional string, no format restrictions
- **Children**: Optional array, typically empty

The node uses the base `BaseNodeAttr` schema for validation.

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<initial>` element is defined in [Section 3.2.1](https://www.w3.org/TR/scxml/#initial) of the specification.

Key specification compliance:
- Provides alternative to `initial` attribute
- Contains the ID of the initial child state
- Used for compound state initial state resolution
- Non-executable informational element

## Best Practices

### When to Use Initial Element vs Attribute

**Use the `initial` attribute when:**
- The initial state is simple and obvious
- You want concise XML
- The initial state is unlikely to change

**Use the `<initial>` element when:**
- You want to make the initial state selection more explicit
- The XML structure benefits from visual clarity
- You're following a consistent documentation style

### Example Comparison

```xml
<!-- Concise with attribute -->
<state id="simple" initial="ready">
  <state id="ready"/>
  <state id="active"/>
</state>

<!-- Explicit with element -->
<state id="complex">
  <initial>ready</initial>
  
  <state id="ready">
    <!-- Complex state content -->
  </state>
  
  <state id="active">
    <!-- Complex state content -->
  </state>
</state>
```

## See Also

- [State Node](./state.md) - Parent states that use initial nodes
- [SCXML Node](./scxml.md) - Root state machine container
- [Transition Node](./transition.md) - State transitions
