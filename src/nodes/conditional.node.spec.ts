import { IfNode, ElseIfNode, ElseNode } from './conditional.node';
import { AssignNode } from './assign.node';
import { InternalState, SCXMLEvent } from '../models/internalState';

// Helper function to create test InternalState
function createTestState(
  data: Record<string, unknown> = {},
): InternalState {
  const mockEvent: SCXMLEvent = {
    name: 'test.event',
    type: 'internal',
    sendid: 'test-send-id',
    origin: 'test-origin',
    origintype: '',
    invokeid: '',
    data: {},
  };

  return {
    _event: mockEvent,
    _datamodel: 'ecmascript', // Add datamodel for expression evaluation
    data,
  };
}

describe('Conditional Nodes', () => {
  let initialState: InternalState;

  beforeEach(() => {
    initialState = createTestState({ x: 1, y: 2, flag: true });
  });

  describe('IfNode', () => {
    describe('Schema Validation', () => {
      it('should create IfNode with valid condition', () => {
        const result = IfNode.createFromJSON({ if: { cond: 'x == 1', content: '', children: [] } });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.node).toBeInstanceOf(IfNode);
          expect(result.node.condition).toBe('x == 1');
        }
      });

      it('should reject IfNode without condition', () => {
        const result = IfNode.createFromJSON({ if: { content: '', children: [] } });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('cond');
        }
      });

      it('should reject IfNode with empty condition', () => {
        const result = IfNode.createFromJSON({ if: { cond: '', content: '', children: [] } });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('empty');
        }
      });
    });

    describe('Basic Execution', () => {
      it('should execute children when condition is true', async () => {
        // Arrange
        const assignNode = new AssignNode({
          assign: { location: 'result', expr: '"if executed"', content: '', children: [] }
        });

        const ifNode = new IfNode({
          if: {
            cond: 'data.x == 1',
            content: '',
            children: [assignNode]
          }
        });

        // Act
        const result = await ifNode.run(initialState);



        // Assert
        expect(result.data.result).toBe('if executed');
      });

      it('should not execute children when condition is false', async () => {
        const assignNode = new AssignNode({
          assign: { location: 'result', expr: '"if executed"', content: '', children: [] }
        });
        const ifNode = new IfNode({
          if: {
            cond: 'data.x == 2',
            content: '',
            children: [assignNode]
          }
        });

        const result = await ifNode.run(initialState);
        expect(result.data.result).toBeUndefined();
      });

      it('should handle condition evaluation errors', async () => {
        const assignNode = new AssignNode({
          assign: { location: 'result', expr: '"should not execute"', content: '', children: [] }
        });
        const ifNode = new IfNode({
          if: {
            cond: 'invalidVariable.property',
            content: '',
            children: [assignNode]
          }
        });

        const result = await ifNode.run(initialState);

        // Should not execute children
        expect(result.data.result).toBeUndefined();

        // Should generate error event
        expect(result._pendingInternalEvents).toHaveLength(1);
        expect(result._pendingInternalEvents![0].name).toBe('error.execution');
        expect(result._pendingInternalEvents![0].data.error).toContain('Condition evaluation failed');
      });
    });

    describe('If-Else Execution', () => {
      it('should execute if branch when condition is true', async () => {
        const ifAssign = new AssignNode({ assign: { location: 'result', expr: '"if branch"', content: '', children: []} });
        const elseAssign = new AssignNode({ assign: { location: 'result', expr: '"else branch"', content: '', children: []} });
        const elseNode = new ElseNode({ else: { content: '', children: [elseAssign] } });
        const ifNode = new IfNode({ if: { cond: 'data.x == 1', content: '', children: [ifAssign, elseNode] } });

        const result = await ifNode.run(initialState);
        expect(result.data.result).toBe('if branch');
      });

      it('should execute else branch when condition is false', async () => {
        const ifAssign = new AssignNode({ assign: { location: 'result', expr: '"if branch"', content: '', children: [] } });
        const elseAssign = new AssignNode({ assign: { location: 'result', expr: '"else branch"', content: '', children: [] } });
        const elseNode = new ElseNode({ else: { content: '', children: [elseAssign] } });
        const ifNode = new IfNode({ if: { cond: 'data.x == 2', content: '', children: [ifAssign, elseNode] } });

        const result = await ifNode.run(initialState);
        expect(result.data.result).toBe('else branch');
      });
    });

    describe('If-ElseIf-Else Chains', () => {
      it('should execute first matching elseif condition', async () => {
        const ifAssign = new AssignNode({ assign: { location: 'result', expr: '"if branch"', content: '', children: [] } });
        const elseIf1Assign = new AssignNode({ assign: { location: 'result', expr: '"elseif1 branch"', content: '', children: [] } });
        const elseIf2Assign = new AssignNode({ assign: { location: 'result', expr: '"elseif2 branch"', content: '', children: [] } });
        const elseAssign = new AssignNode({ assign: { location: 'result', expr: '"else branch"', content: '', children: [] } });

        const elseIf1 = new ElseIfNode({ elseif: { cond: 'data.x == 1', content: '', children: [elseIf1Assign] } });
        const elseIf2 = new ElseIfNode({ elseif: { cond: 'data.x == 2', content: '', children: [elseIf2Assign] } });
        const elseNode = new ElseNode({ else: { content: '', children: [elseAssign] } });
        const ifNode = new IfNode({ if: { cond: 'data.x == 0', content: '', children: [ifAssign, elseIf1, elseIf2, elseNode] } });

        const result = await ifNode.run(initialState);
        expect(result.data.result).toBe('elseif1 branch');
      });

      it('should execute else when no conditions match', async () => {
        const ifAssign = new AssignNode({ assign: { location: 'result', expr: '"if branch"', content: '', children: [] } });
        const elseIf1Assign = new AssignNode({ assign: { location: 'result', expr: '"elseif1 branch"', content: '', children: [] } });
        const elseAssign = new AssignNode({ assign: { location: 'result', expr: '"else branch"', content: '', children: [] } });

        const elseIf1 = new ElseIfNode({ elseif: { cond: 'data.x == 3', content: '', children: [elseIf1Assign] } });
        const elseNode = new ElseNode({ else: { content: '', children: [elseAssign] } });
        const ifNode = new IfNode({ if: { cond: 'data.x == 0', content: '', children: [ifAssign, elseIf1, elseNode] } });

        const result = await ifNode.run(initialState);
        expect(result.data.result).toBe('else branch');
      });

      it('should execute nothing when no conditions match and no else', async () => {
        const ifAssign = new AssignNode({ assign: { location: 'result', expr: '"if branch"', content: '', children: [] } });
        const elseIf1Assign = new AssignNode({ assign: { location: 'result', expr: '"elseif1 branch"', content: '', children: [] } });

        const elseIf1 = new ElseIfNode({ elseif: { cond: 'data.x == 3', content: '', children: [elseIf1Assign] } });
        const ifNode = new IfNode({ if: { cond: 'data.x == 0', content: '', children: [ifAssign, elseIf1] } });

        const result = await ifNode.run(initialState);
        expect(result.data.result).toBeUndefined();
      });
    });
  });

  describe('ElseIfNode', () => {
    describe('Schema Validation', () => {
      it('should create ElseIfNode with valid condition', () => {
        const result = ElseIfNode.createFromJSON({ elseif: { cond: 'y == 2', content: '', children: [] } });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.node).toBeInstanceOf(ElseIfNode);
          expect(result.node.condition).toBe('y == 2');
        }
      });

      it('should reject ElseIfNode without condition', () => {
        const result = ElseIfNode.createFromJSON({ elseif: { content: '', children: [] } });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('cond');
        }
      });
    });

    describe('Standalone Execution', () => {
      it('should execute children when condition is true', async () => {
        const assignNode = new AssignNode({ assign: { location: 'result', expr: '"elseif executed"', content: '', children: [] } });
        const elseIfNode = new ElseIfNode({ elseif: { cond: 'data.y == 2', content: '', children: [assignNode] } });

        const result = await elseIfNode.run(initialState);
        expect(result.data.result).toBe('elseif executed');
      });

      it('should not execute children when condition is false', async () => {
        const assignNode = new AssignNode({ assign: { location: 'result', expr: '"elseif executed"', content: '', children: [] } });
        const elseIfNode = new ElseIfNode({ elseif: { cond: 'data.y == 3', content: '', children: [assignNode] } });

        const result = await elseIfNode.run(initialState);
        expect(result.data.result).toBeUndefined();
      });
    });
  });

  describe('ElseNode', () => {
    describe('Schema Validation', () => {
      it('should create ElseNode without attributes', () => {
        const result = ElseNode.createFromJSON({ else: {} });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.node).toBeInstanceOf(ElseNode);
          expect(result.node.condition).toBe('true');
        }
      });
    });

    describe('Execution', () => {
      it('should always execute children', async () => {
        const assignNode = new AssignNode({ assign: { location: 'result', expr: '"else executed"', content: '', children: [] } });
        const elseNode = new ElseNode({ else: { content: '', children: [assignNode] } });

        const result = await elseNode.run(initialState);
        expect(result.data.result).toBe('else executed');
      });

      it('should always return true for condition evaluation', async () => {
        const elseNode = new ElseNode({ else: { content: '', children: [] } });
        const [conditionResult] = await elseNode.evaluateCondition(initialState);
        expect(conditionResult).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Nested Conditionals', () => {
      it('should handle nested if statements', async () => {
        const innerAssign = new AssignNode({ assign: { location: 'result', expr: '"nested executed"', content: '', children: [] } });
        const innerIf = new IfNode({ if: { cond: 'data.y == 2', content: '', children: [innerAssign] } });
        const outerIf = new IfNode({ if: { cond: 'data.x == 1', content: '', children: [innerIf] } });

        const result = await outerIf.run(initialState);
        expect(result.data.result).toBe('nested executed');
      });

      it('should handle nested if-else in elseif branch', async () => {
        // Arrange
        const original = { ...initialState };
        original.data.x = 1

        const nestedAssign = new AssignNode({ assign: { location: 'result', expr: '"nested in elseif"', content: '', children: [] } });
        const nestedElseAssign = new AssignNode({ assign: { location: 'result', expr: '"nested else"', content: '', children: [] } });
        const nestedElse = new ElseNode({ else: { content: '', children: [nestedElseAssign] }});
        const nestedIf = new IfNode({ if: { cond: 'data.y == 2', content: '', children: [
          nestedAssign,
          nestedElse
        ]}});

        const elseIf = new ElseIfNode({ elseif: { cond: 'data.x == 1', content: '', children: [nestedIf] } });
        const mainIf = new IfNode({ if: { cond: 'data.x == 0', content: '', children: [
          elseIf
        ]}});

        // Act
        const result = await mainIf.run(original);

        // Assert
        expect(result.data.result).toBe('nested in elseif');
      });
    });

    describe('Complex Conditional Chains', () => {
      it('should handle multiple elseif conditions with various data types', async () => {
        // Set up test data with different types
        const testState = createTestState({
          stringVar: 'test',
          numberVar: 42,
          boolVar: false
        });

        const elseIf1Assign = new AssignNode({ assign: { location: 'result', expr: '"number high"', content: '', children: [] } });
        const elseIf1 = new ElseIfNode({ elseif: { cond: 'data.numberVar > 50', content: '', children: [elseIf1Assign] } });

        const elseIf2Assign = new AssignNode({ assign: { location: 'result', expr: '"number exact"', content: '', children: [] } });
        const elseIf2 = new ElseIfNode({ elseif: { cond: 'data.numberVar == 42', content: '', children: [elseIf2Assign] } });

        const elseIf3Assign = new AssignNode({ assign: { location: 'result', expr: '"bool true"', content: '', children: [] } });
        const elseIf3 = new ElseIfNode({ elseif: { cond: 'data.boolVar == true', content: '', children: [elseIf3Assign] } });

        const elseAssign = new AssignNode({ assign: { location: 'result', expr: '"fallback"', content: '', children: [] } });
        const elseNode = new ElseNode({ else: { content: '', children: [elseAssign] } });

        const ifAssign = new AssignNode({ assign: { location: 'result', expr: '"string match"', content: '', children: [] } });
        const ifNode = new IfNode({ if: { cond: 'data.stringVar == "nottest"', content: '', children: [
          ifAssign,
          elseIf1,
          elseIf2,
          elseIf3,
          elseNode
        ] } });

        const result = await ifNode.run(testState);
        expect(result.data.result).toBe('number exact');
      });
    });

    describe('Error Handling', () => {
      it('should handle errors in elseif conditions', async () => {
        // Arrange
        const originalState = createTestState({ x: 1 });

        const elseIfAssign = new AssignNode({ assign: { location: 'result', expr: '"should not execute"', content: '', children: [] } });
        const elseIf = new ElseIfNode({ elseif: { cond: 'undefinedVar.property', content: '', children: [elseIfAssign] } });
        const elseAssign = new AssignNode({ assign: { location: 'result', expr: '"else executed"', content: '', children: [] } });
        const elseNode = new ElseNode({ else: { content: '', children: [elseAssign] } });
        const ifNode = new IfNode({ if: { cond: 'data.x == 0', content: '', children: [
          elseIf,
          elseNode
        ]}});

        const result = await ifNode.run(originalState);

        // Should execute else branch when elseif fails
        expect(result.data.result).toBe('else executed');

        // Should generate error event for elseif condition failure
        expect(result._pendingInternalEvents).toHaveLength(1);

        const [ elseIfError ] = result._pendingInternalEvents ?? [];
        expect(elseIfError.name).toBe('error.execution');
      });

    });

    describe('State Immutability', () => {
      it('should not modify original state when no conditions match', async () => {
        const originalData = createTestState();
        const originalDataCopy = JSON.parse(JSON.stringify(originalData));

        const assignNode = new AssignNode({ assign: { location: 'newVar', expr: '"should not execute"', content: '', children: [] } });
        const ifNode = new IfNode({ if: { cond: 'data.x == 0', content: '', children: [assignNode] } });

        const result = await ifNode.run(originalData);

        // Original state should be unchanged
        expect(originalData).toEqual(originalDataCopy);

        // Result should not have the new variable
        expect('newVar' in result.data).toBe(false);
      });
    });
  });
});
