import { TransitionNode } from './transition.node';
import { AssignNode } from './assign.node';
import { RaiseNode } from './raise.node';
import { BaseNode } from '../models/base';
import { BaseExecutableNode } from '../models/base-executable';
import { InternalState, SCXMLEvent } from '../models/internalState';

// Helper function to create test InternalState
function createTestEventState(data: Record<string, unknown> = {}): InternalState {
  const mockEvent: SCXMLEvent = {
    name: 'test.event',
    type: 'internal',
    sendid: 'test-send-id',
    origin: 'test-origin',
    origintype: '',
    invokeid: '',
    data: {}
  };

  return {
    _event: mockEvent,
    _datamodel: 'ecmascript',
    data: { ...data }
  };
}

describe('Node: <transition>', () => {
  describe('constructor', () => {
    it('should create TransitionNode with required target', () => {
      // Arrange & Act
      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'user.click',
          content: '',
          children: []
        }
      });

      // Assert
      expect(transitionNode.target).toBe('nextState');
      expect(transitionNode.event).toBe('user.click');
      expect(transitionNode.cond).toBeUndefined();
      expect(transitionNode.allowChildren).toBe(true);
    });

    it('should create TransitionNode with condition', () => {
      // Arrange & Act
      const transitionNode = new TransitionNode({
        transition: {
          target: 'conditionalState',
          event: 'check.condition',
          cond: 'data.count > 5',
          content: '',
          children: []
        }
      });

      // Assert
      expect(transitionNode.target).toBe('conditionalState');
      expect(transitionNode.event).toBe('check.condition');
      expect(transitionNode.cond).toBe('data.count > 5');
    });

    it('should create eventless transition with empty event', () => {
      // Arrange & Act
      const transitionNode = new TransitionNode({
        transition: {
          target: 'autoState',
          event: '',
          content: '',
          children: []
        }
      });

      // Assert
      expect(transitionNode.target).toBe('autoState');
      expect(transitionNode.event).toBe('');
      expect(transitionNode.isEventLess).toBe(true);
    });

    it('should have correct static properties', () => {
      // Assert
      expect(TransitionNode.label).toBe('transition');
      expect(TransitionNode.schema).toBeDefined();
    });
  });

  describe('properties', () => {
    it('should identify eventless transitions correctly', () => {
      // Arrange
      const eventlessTransition = new TransitionNode({
        transition: {
          target: 'nextState',
          event: '',
          content: '',
          children: []
        }
      });

      const eventTransition = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'user.action',
          content: '',
          children: []
        }
      });

      // Assert
      expect(eventlessTransition.isEventLess).toBe(true);
      expect(eventTransition.isEventLess).toBe(false);
    });

    it('should identify targetless transitions correctly', () => {
      // Arrange
      const targetlessTransition = new TransitionNode({
        transition: {
          target: '',
          event: 'user.action',
          content: '',
          children: []
        }
      });

      const targetTransition = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'user.action',
          content: '',
          children: []
        }
      });

      // Assert
      expect(targetlessTransition.isTargetLess).toBe(true);
      expect(targetTransition.isTargetLess).toBe(false);
    });
  });

  describe('getTarget method', () => {
    it('should return the target state', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'destinationState',
          event: 'trigger.event',
          content: '',
          children: []
        }
      });

      const state = createTestEventState();

      // Act
      const target = transitionNode.getTarget(state);

      // Assert
      expect(target).toBe('destinationState');
    });

    it('should return target for complex state paths', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'parent.child.grandchild',
          event: 'navigate',
          content: '',
          children: []
        }
      });

      const state = createTestEventState();

      // Act
      const target = transitionNode.getTarget(state);

      // Assert
      expect(target).toBe('parent.child.grandchild');
    });
  });

  describe('checkCondition method', () => {
    it('should return true when no condition is specified', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          content: '',
          children: []
        }
      });

      const state = createTestEventState();

      // Act
      const result = transitionNode.checkCondition(state);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when condition evaluates to true', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          cond: 'data.count > 5 ? "true" : "false"',
          content: '',
          children: []
        }
      });

      const state = createTestEventState({ count: 10 });

      // Act
      const result = transitionNode.checkCondition(state);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when condition evaluates to false', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          cond: 'data.count > 10 ? "true" : "false"',
          content: '',
          children: []
        }
      });

      const state = createTestEventState({ count: 5 });

      // Act
      const result = transitionNode.checkCondition(state);

      // Assert
      expect(result).toBe(false);
    });

    it('should evaluate complex conditions with data access', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          cond: 'data.count > 5 ? "true" : "false"',
          content: '',
          children: []
        }
      });

      const stateWithHighCount = createTestEventState({ count: 10 });
      const stateWithLowCount = createTestEventState({ count: 3 });

      // Act & Assert
      expect(transitionNode.checkCondition(stateWithHighCount)).toBe(true);
      expect(transitionNode.checkCondition(stateWithLowCount)).toBe(false);
    });

    it('should handle condition evaluation errors gracefully', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          cond: 'data.nonexistent.property.access',
          content: '',
          children: []
        }
      });

      const state = createTestEventState();

      // Act
      const result = transitionNode.checkCondition(state);

      // Assert
      expect(result).toBe(false);
      // Note: The current implementation adds pending events but doesn't return the modified state
      // This is a design issue that should be addressed in the implementation
    });

    it('should return true for string "true" condition', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          cond: '"true"',
          content: '',
          children: []
        }
      });

      const state = createTestEventState();

      // Act
      const result = transitionNode.checkCondition(state);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for string "false" condition', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          cond: '"false"',
          content: '',
          children: []
        }
      });

      const state = createTestEventState();

      // Act
      const result = transitionNode.checkCondition(state);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('run method', () => {
    it('should return unchanged state when no executable children', async () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          content: '',
          children: []
        }
      });

      const initialState = createTestEventState({ count: 5 });

      // Act
      const result = await transitionNode.run(initialState);

      // Assert
      expect(result).toEqual(initialState);
    });

    it('should execute single AssignNode child', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'transitionVar',
          expr: '"executed"',
          content: '',
          children: []
        }
      });

      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          content: '',
          children: [assignNode]
        }
      });

      const initialState = createTestEventState();

      // Act
      const result = await transitionNode.run(initialState);

      // Assert
      expect(result.data.transitionVar).toBe('executed');
    });

    it('should execute multiple executable children in document order', async () => {
      // Arrange
      const assignNode1 = new AssignNode({
        assign: {
          location: 'step1',
          expr: '"first"',
          content: '',
          children: []
        }
      });

      const assignNode2 = new AssignNode({
        assign: {
          location: 'step2',
          expr: '"second"',
          content: '',
          children: []
        }
      });

      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          content: '',
          children: [assignNode1, assignNode2]
        }
      });

      const initialState = createTestEventState();

      // Act
      const result = await transitionNode.run(initialState);

      // Assert
      expect(result.data.step1).toBe('first');
      expect(result.data.step2).toBe('second');
    });

    it('should execute AssignNode and RaiseNode together', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'status',
          expr: '"transitioning"',
          content: '',
          children: []
        }
      });

      const raiseNode = new RaiseNode({
        raise: {
          event: 'transition.executed',
          content: '',
          children: []
        }
      });

      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          content: '',
          children: [assignNode, raiseNode]
        }
      });

      const initialState = createTestEventState();

      // Act
      const result = await transitionNode.run(initialState);

      // Assert
      expect(result.data.status).toBe('transitioning');
      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0].name).toBe('transition.executed');
    });

    it('should handle execution errors gracefully', async () => {
      // Arrange
      const failingNode = new (class extends BaseExecutableNode {
        static label = 'failing';

        constructor() {
          super({ content: '', children: [] });
        }

        async run(): Promise<InternalState> {
          throw new Error('Simulated execution error');
        }
      })();

      const successNode = new AssignNode({
        assign: {
          location: 'success',
          expr: '"completed"',
          content: '',
          children: []
        }
      });

      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          content: '',
          children: [failingNode, successNode]
        }
      });

      const initialState = createTestEventState();

      // Act
      const result = await transitionNode.run(initialState);

      // Assert
      expect(result._pendingInternalEvents).toBeDefined();
      expect(result._pendingInternalEvents!.length).toBeGreaterThan(0);
      expect(result._pendingInternalEvents![0].name).toBe('error.transaction.execution-failed');
      expect(result.data.success).toBe('completed'); // Should continue executing after error
    });

    it('should skip non-executable children', async () => {
      // Arrange
      const nonExecutableNode = new (class extends BaseNode {
        static label = 'non-executable';

        constructor() {
          super({ content: '', children: [] });
          this.isExecutable = false;
        }
      })();

      const assignNode = new AssignNode({
        assign: {
          location: 'executed',
          expr: '"yes"',
          content: '',
          children: []
        }
      });

      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          content: '',
          children: [nonExecutableNode, assignNode]
        }
      });

      const initialState = createTestEventState();

      // Act
      const result = await transitionNode.run(initialState);

      // Assert
      expect(result.data.executed).toBe('yes');
    });
  });

  describe('schema validation', () => {
    it('should validate successfully with required target', () => {
      // Arrange
      const validData = {
        target: 'nextState',
        event: 'user.click',
        content: '',
        children: []
      };

      // Act
      const result = TransitionNode.schema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.target).toBe('nextState');
        expect(result.data.event).toBe('user.click');
      }
    });

    it('should validate successfully with minimal required fields', () => {
      // Arrange
      const validData = {
        target: 'state1',
        content: '',
        children: []
      };

      // Act
      const result = TransitionNode.schema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.target).toBe('state1');
        expect(result.data.event).toBe(''); // Should default to empty string
      }
    });

    it('should validate successfully with condition', () => {
      // Arrange
      const validData = {
        target: 'conditionalState',
        event: 'check',
        cond: 'data.ready === true',
        content: '',
        children: []
      };

      // Act
      const result = TransitionNode.schema.safeParse(validData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cond).toBe('data.ready === true');
      }
    });

    it('should fail validation when target is missing', () => {
      // Arrange
      const invalidData = {
        event: 'user.click',
        content: '',
        children: []
      };

      // Act
      const result = TransitionNode.schema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when target is empty string', () => {
      // Arrange
      const invalidData = {
        target: '',
        event: 'user.click',
        content: '',
        children: []
      };

      // Act
      const result = TransitionNode.schema.safeParse(invalidData);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('createFromJSON', () => {
    it('should create TransitionNode from valid JSON input', () => {
      // Arrange
      const jsonInput = {
        transition: {
          target: 'nextState',
          event: 'user.action',
          cond: 'data.valid',
          content: '',
          children: []
        }
      };

      // Act
      const result = TransitionNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(TransitionNode);
      expect(result.node!.target).toBe('nextState');
      expect(result.node!.event).toBe('user.action');
      expect(result.node!.cond).toBe('data.valid');
      expect(result.error).toBeUndefined();
    });

    it('should create TransitionNode with default event', () => {
      // Arrange
      const jsonInput = {
        transition: {
          target: 'autoState',
          content: '',
          children: []
        }
      };

      // Act
      const result = TransitionNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(TransitionNode);
      expect(result.node!.target).toBe('autoState');
      expect(result.node!.event).toBe('');
      expect(result.node!.isEventLess).toBe(true);
    });

    it('should return error for invalid JSON input', () => {
      // Arrange
      const invalidJsonInput = {
        transition: {
          // Missing required target
          event: 'user.action',
          content: '',
          children: []
        }
      };

      // Act
      const result = TransitionNode.createFromJSON(invalidJsonInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.node).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should handle JSON input with complex target paths', () => {
      // Arrange
      const jsonInput = {
        transition: {
          target: 'parent.child.grandchild',
          event: 'navigate.deep',
          content: '',
          children: []
        }
      };

      // Act
      const result = TransitionNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node!.target).toBe('parent.child.grandchild');
    });
  });

  describe('SCXML compliance', () => {
    it('should support eventless transitions for automatic transitions', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'autoTarget',
          event: '',
          content: '',
          children: []
        }
      });

      // Assert
      expect(transitionNode.isEventLess).toBe(true);
      expect(transitionNode.event).toBe('');
    });

    it('should support conditional transitions', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'conditionalTarget',
          event: 'check',
          cond: 'data.count >= 10 ? "true" : "false"',
          content: '',
          children: []
        }
      });

      const stateTrue = createTestEventState({ count: 15 });
      const stateFalse = createTestEventState({ count: 5 });

      // Act & Assert
      expect(transitionNode.checkCondition(stateTrue)).toBe(true);
      expect(transitionNode.checkCondition(stateFalse)).toBe(false);
    });

    it('should execute transition actions in document order', async () => {
      // Arrange
      const actions: string[] = [];

      const action1 = new (class extends BaseExecutableNode {
        static label = 'action1';
        constructor() { super({ content: '', children: [] }); }
        async run(state: InternalState): Promise<InternalState> {
          actions.push('action1');
          return state;
        }
      })();

      const action2 = new (class extends BaseExecutableNode {
        static label = 'action2';
        constructor() { super({ content: '', children: [] }); }
        async run(state: InternalState): Promise<InternalState> {
          actions.push('action2');
          return state;
        }
      })();

      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          content: '',
          children: [action1, action2]
        }
      });

      const initialState = createTestEventState();

      // Act
      await transitionNode.run(initialState);

      // Assert
      expect(actions).toEqual(['action1', 'action2']);
    });
  });

  describe('edge cases', () => {
    it('should handle transitions with complex target expressions', () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'app.workflow.step1.substep.final',
          event: 'complex.navigation',
          content: '',
          children: []
        }
      });

      const state = createTestEventState();

      // Act
      const target = transitionNode.getTarget(state);

      // Assert
      expect(target).toBe('app.workflow.step1.substep.final');
    });

    it('should preserve state properties during execution', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'newProp',
          expr: '"added"',
          content: '',
          children: []
        }
      });

      const transitionNode = new TransitionNode({
        transition: {
          target: 'nextState',
          event: 'trigger',
          content: '',
          children: [assignNode]
        }
      });

      const initialState = createTestEventState({
        existingProp: 'preserved',
        nested: { value: 42 }
      });

      // Act
      const result = await transitionNode.run(initialState);

      // Assert
      expect(result.data.existingProp).toBe('preserved');
      expect((result.data.nested as { value: number }).value).toBe(42);
      expect(result.data.newProp).toBe('added');
      expect(result._event).toBeDefined();
      expect(result._datamodel).toBe('ecmascript');
    });

    it('should handle empty children array', async () => {
      // Arrange
      const transitionNode = new TransitionNode({
        transition: {
          target: 'emptyTarget',
          event: 'empty',
          content: '',
          children: []
        }
      });

      const initialState = createTestEventState({ test: 'value' });

      // Act
      const result = await transitionNode.run(initialState);

      // Assert
      expect(result).toEqual(initialState);
    });
  });
});