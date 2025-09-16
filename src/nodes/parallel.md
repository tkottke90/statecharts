# Parallel Node (<parallel>)

The `<parallel>` element is used to define a parallel state in SCXML. A parallel state is a state that can have multiple active child states at the same time. This is in contrast to a regular state, which can only have one active child state at a time.

## Attributes

The `<parallel>` element has the following attributes:

- `id` (optional): The unique identifier for the state.
- `initial` (optional): The initial state to enter when the parallel state is entered.

## Behavior

When a parallel state is entered, all of its child states are entered simultaneously. The parallel state is considered to be active as long as at least one of its child states is active. When all of the child states have completed, the parallel state completes.

