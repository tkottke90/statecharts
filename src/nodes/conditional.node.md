# Conditional Nodes

This document describes the implementation of SCXML conditional execution elements: `<if>`, `<elseif>`, and `<else>`.

## Overview

Conditional nodes provide branching logic within SCXML executable content, allowing state machines to make decisions based on runtime conditions. These nodes follow the W3C SCXML specification for conditional execution.

## Architecture

### BaseConditionalNode

All conditional nodes extend `BaseConditionalNode`, which provides shared functionality:

- **Condition Evaluation**: Safe expression evaluation with error handling
- **Child Execution**: Filtering and execution of executable children
- **Error Handling**: Consistent error event generation for failed conditions
- **Template Method Pattern**: Abstract `run()` method for subclass customization

```typescript
abstract class BaseConditionalNode extends BaseExecutableNode {
  protected condition?: string;
  
  protected async evaluateCondition(state: InternalState): Promise<boolean>
  protected async executeOwnChildren(state: InternalState): Promise<InternalState>
  protected getExecutableChildren(): BaseNode[]
  abstract run(state: InternalState): Promise<InternalState>
}
```

### Node Hierarchy

```
BaseConditionalNode
├── IfNode        - Main conditional container with orchestration logic
├── ElseIfNode    - Additional conditional branches
└── ElseNode      - Fallback branch (no condition)
```

## Node Types

### IfNode

**Purpose**: Main conditional container that orchestrates execution flow

**Attributes**:
- `cond` (required): Boolean expression to evaluate

**Execution Flow**:
1. Evaluate own condition - if true, execute own children
2. If false, check each `ElseIfNode` child in document order
3. If no `ElseIf` matches, execute `ElseNode` child (if present)
4. If no conditions match and no else, do nothing

**Example**:
```xml
<if cond="x == 1">
  <assign location="result" expr="'if branch'"/>
</if>
```

### ElseIfNode

**Purpose**: Additional conditional branch within an `IfNode`

**Attributes**:
- `cond` (required): Boolean expression to evaluate

**Execution**: Controlled by parent `IfNode` - evaluated in document order

**Example**:
```xml
<if cond="x == 0">
  <assign location="result" expr="'if branch'"/>
<elseif cond="x == 1"/>
  <assign location="result" expr="'elseif branch'"/>
</if>
```

### ElseNode

**Purpose**: Fallback branch that executes when no conditions match

**Attributes**: None (always executes when reached)

**Execution**: Controlled by parent `IfNode` - executes if no conditions match

**Example**:
```xml
<if cond="x == 0">
  <assign location="result" expr="'if branch'"/>
<else/>
  <assign location="result" expr="'else branch'"/>
</if>
```

## Usage Examples

### Basic If-Else

```xml
<if cond="response &amp;&amp; response.response">
  <assign location="message" expr="response.response"/>
<else/>
  <assign location="message" expr="'No response received'"/>
</if>
```

### Multiple ElseIf Conditions

```xml
<if cond="status == 'success'">
  <assign location="result" expr="'Operation successful'"/>
<elseif cond="status == 'warning'"/>
  <assign location="result" expr="'Operation completed with warnings'"/>
<elseif cond="status == 'error'"/>
  <assign location="result" expr="'Operation failed'"/>
<else/>
  <assign location="result" expr="'Unknown status'"/>
</if>
```

### Nested Conditionals

```xml
<if cond="user.authenticated">
  <if cond="user.role == 'admin'">
    <assign location="access" expr="'full'"/>
  <else/>
    <assign location="access" expr="'limited'"/>
  </if>
<else/>
  <assign location="access" expr="'none'"/>
</if>
```

### Event Data Processing

```xml
<!-- Handle optional event data like in basic-ollama.xml -->
<if cond="_event.data &amp;&amp; _event.data.prompt">
  <assign location="prompt" expr="_event.data.prompt"/>
</if>
<if cond="_event.data &amp;&amp; _event.data.model">
  <assign location="model" expr="_event.data.model"/>
</if>
```

## W3C SCXML Compliance

### Partition-Based Execution

The implementation follows W3C SCXML specification for partition-based execution:

- **First Partition**: Content between `<if>` and first `<elseif>`, `<else>`, or `</if>`
- **ElseIf Partitions**: Content between each `<elseif>` and next conditional tag
- **Else Partition**: Content between `<else>` and `</if>`

### Document Order Evaluation

Conditions are evaluated in document order:
1. `<if>` condition first
2. `<elseif>` conditions in order they appear
3. `<else>` as fallback (no condition)

### Expression Requirements

- Boolean expressions in `cond` attributes
- Must not have side effects
- Support for `In(stateId)` predicate for state testing
- Data model dependent (ECMAScript, XPath, etc.)

## Error Handling

### Condition Evaluation Errors

When condition evaluation fails:
- Condition is treated as `false`
- `error.execution` event is generated
- Execution continues with next condition or else branch

```typescript
// Error event structure
{
  name: 'error.execution',
  type: 'platform',
  data: {
    error: 'Condition evaluation failed in IfNode: ...',
    condition: 'problematic.expression',
    node: 'IfNode'
  }
}
```

### Robust Fallback Behavior

- Failed conditions don't stop execution
- Else branches provide reliable fallbacks
- State machine continues normal operation

## Best Practices

### 1. Use Meaningful Conditions

```xml
<!-- Good: Clear, readable condition -->
<if cond="user.isAuthenticated &amp;&amp; user.hasPermission('read')">

<!-- Avoid: Complex, hard-to-read conditions -->
<if cond="(u.a &amp;&amp; u.p.indexOf('r') > -1) || (u.r == 'admin')">
```

### 2. Provide Fallback Branches

```xml
<!-- Good: Always handle the else case -->
<if cond="response.success">
  <assign location="data" expr="response.data"/>
<else/>
  <assign location="error" expr="'Request failed'"/>
</if>
```

### 3. Keep Conditions Simple

```xml
<!-- Good: Simple, testable conditions -->
<if cond="status == 'ready'">
<elseif cond="status == 'pending'"/>
<elseif cond="status == 'error'"/>

<!-- Avoid: Complex nested logic in conditions -->
<if cond="(status == 'ready' &amp;&amp; data.valid) || (fallback &amp;&amp; !error)">
```

### 4. Use Nested Conditionals for Complex Logic

```xml
<!-- Good: Clear hierarchy -->
<if cond="user.authenticated">
  <if cond="user.role == 'admin'">
    <!-- Admin logic -->
  <else/>
    <!-- Regular user logic -->
  </if>
<else/>
  <!-- Unauthenticated logic -->
</if>
```

## Common Pitfalls

### 1. Missing Else Branches

Without else branches, no action occurs when conditions fail:

```xml
<!-- Risky: No fallback if condition fails -->
<if cond="data.isValid">
  <assign location="result" expr="data.value"/>
</if>
<!-- result remains unset if data.isValid is false -->
```

### 2. Condition Side Effects

Conditions should not modify state:

```xml
<!-- Wrong: Condition has side effects -->
<if cond="(counter = counter + 1) > 5">

<!-- Right: Pure boolean expression -->
<if cond="counter > 5">
  <assign location="counter" expr="counter + 1"/>
</if>
```

### 3. Incorrect ElseIf Ordering

Order matters - first matching condition wins:

```xml
<!-- Wrong: Specific condition after general one -->
<if cond="value > 0">
<elseif cond="value > 10"/>  <!-- Never reached -->

<!-- Right: Most specific first -->
<if cond="value > 10">
<elseif cond="value > 0"/>
```

## Integration

### Parser Registration

Conditional nodes are registered in the parser:

```typescript
// src/parser/index.ts
const nodeMap = {
  'if': IfNode,
  'elseif': ElseIfNode,
  'else': ElseNode,
  // ... other nodes
};
```

### Expression Evaluation

Uses the existing expression evaluation system:

```typescript
import { evaluateExpression } from '../parser/expressions.nodejs';
```

### State Management

Integrates with the internal state system:

```typescript
import { InternalState, addPendingEvent } from '../models/internalState';
```

This implementation provides robust, W3C-compliant conditional execution for SCXML state machines while maintaining clean architecture and comprehensive error handling.
