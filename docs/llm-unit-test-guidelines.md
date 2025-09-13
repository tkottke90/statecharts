# LLM Unit Testing Guidelines

This document outlines the unit testing guidelines for AI-assisted development in this TypeScript SCXML state machine project.

## Core Testing Framework & Structure

### Jest & TypeScript
- Use **Jest** as the testing framework
- Test files named using `*.spec.ts` convention
- Located next to source files they're testing
- Use `it.todo` for placeholder tests instead of empty test implementations
- Prefer the use of actual entities instead of mocks cast as any when possible so that readers of this repository can understand the code execution by reviewing tests
- When testing private class methods you can cast the instance to `any` BUT you must also notate in the test that you are testing a private method

### Arrange, Act, Assert (AAA) Framework
Every test must follow this structure:

```typescript
it('should do something specific', () => {
  // Arrange - Set up test data and mocks
  const sourcePath = 'playing.healthSystem.healthy';
  const mockActiveStateChain = [...];
  
  // Act - Execute the function under test
  const result = stateChart.computeExitSet(sourcePath, targetPath);
  
  // Assert - Verify the outcome
  expect(result).toEqual(['expected', 'values']);
});
```

## Test Quality Standards

### Atomic & Independent Tests
- Each test is **atomic** - tests one specific behavior
- **No side effects** that affect other tests
- Each test can run independently in any order
- Use `beforeEach()` to ensure clean state for each test

### Focus on Outcomes
- Tests evaluate the **outcome/result** of functions, not internal implementation
- Verify return values, state changes, and side effects
- Mock external dependencies but test the actual logic

## Test Coverage Approach

### Comprehensive Scenarios
For each method, test:

1. **Core Functionality** - Normal use cases
2. **Edge Cases** - Boundary conditions, empty inputs, self-transitions
3. **Error Conditions** - Invalid inputs, missing data
4. **Integration Points** - How methods work together

### Example Coverage Pattern
```typescript
describe('findLCCA', () => {
  it('should find LCCA for states within same parent', () => { /* ... */ });
  it('should find LCCA for states across different subsystems', () => { /* ... */ });
  it('should find LCCA for transition to top level', () => { /* ... */ });
  it('should handle root level transitions', () => { /* ... */ });
  it('should handle identical source and target paths', () => { /* ... */ });
  it('should handle deep nested paths with different depths', () => { /* ... */ });
  it('should handle paths where one is ancestor of another', () => { /* ... */ });
});
```

## Mocking & Test Data

### Type-Safe Mocking
```typescript
// Proper type definition for mocks
type MockActiveStateEntry = [string, Record<string, unknown>];

// Type-safe casting instead of 'any'
(stateChart as unknown as { activeStateChain: MockActiveStateEntry[] })
```

### Realistic Test Data
- Use domain-specific examples (game states: `playing.healthSystem.healthy`)
- Mock objects have realistic structure matching actual interfaces
- Test data represents real-world scenarios

## Test Organization

### Descriptive Structure
```typescript
describe('StateChart', () => {
  describe('computeExitSet', () => {
    let stateChart: StateChart;

    beforeEach(() => {
      stateChart = new StateChart('gameStart', new Map());
    });

    it('should compute exit set for same-parent transition', () => {
      // Test implementation
    });
  });
});
```

### Clear Test Names
- Test names describe **what** the test does and **when**
- Use "should" statements: `should compute exit set for same-parent transition`
- Include context: `should return empty array when no states need to exit`

## Verification Patterns

### Multiple Assertions When Appropriate
```typescript
// Verify the main result
expect(result).toEqual(['expected', 'states']);

// Verify side effects
expect(mockUnmount).toHaveBeenCalledWith(initialState);

// Verify state changes
const activeChain = stateChart.activeStateChain;
expect(activeChain.find(([path]) => path === 'exited.state')).toBeUndefined();
```

### Order & Structure Verification
```typescript
// Verify ordering is correct
for (let i = 1; i < result.length; i++) {
  const prevPath = result[i - 1];
  const currPath = result[i];
  if (prevPath && currPath) {
    const prevDepth = prevPath.split('.').length;
    const currDepth = currPath.split('.').length;
    expect(currDepth).toBeGreaterThanOrEqual(prevDepth);
  }
}
```

## Performance & Maintainability

### Efficient Test Setup
- Use `beforeEach()` for common setup
- Create reusable mock factories when appropriate
- Keep test data focused and minimal

### Readable & Maintainable
- Clear variable names (`mockActiveStateChain`, `expectedLCCA`)
- Comments explain **why** not **what** when needed
- Group related tests logically

## TypeScript Standards

### Type Safety
- Avoid `any` types - use proper type definitions
- Create specific mock types when needed
- Use type assertions safely with `unknown` intermediate

### Code Quality
- Follow existing ESLint rules
- Use implicit return types (project preference)
- Maintain consistent formatting and style

## Example Test Template

```typescript
describe('MethodName', () => {
  let stateChart: StateChart;

  beforeEach(() => {
    stateChart = new StateChart('gameStart', new Map());
  });

  it('should handle normal case', () => {
    // Arrange
    const input = 'test.input';
    const expected = ['expected', 'output'];
    
    // Act
    const result = stateChart.methodName(input);
    
    // Assert
    expect(result).toEqual(expected);
  });

  it('should handle edge case', () => {
    // Arrange, Act, Assert pattern
  });
});
```

These guidelines ensure tests are **reliable**, **maintainable**, and provide **confidence** in the correctness of the SCXML state machine implementation while following TypeScript and Jest best practices.
