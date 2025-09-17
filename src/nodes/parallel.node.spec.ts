import { ParallelNode } from './parallel.node';
import { StateNode } from './state.node';
import { FinalNode } from './final.node';
import { OnEntryNode } from './onentry.node';
import { AssignNode } from './assign.node';
import { InternalState } from '../models/internalState';

describe('Node: <parallel>', () => {
  let parallelNode: ParallelNode;
  let initialState: InternalState;

  beforeEach(() => {
    parallelNode = new ParallelNode({
      parallel: {
        id: 'testParallel',
        initial: undefined,
        content: '',
        children: [],
      },
    });

    initialState = {
      data: {},
      _name: 'TestStateMachine',
      _sessionId: 'test-session-123',
    };
  });

  describe('Static Properties', () => {
    it('should have correct label', () => {
      expect(ParallelNode.label).toBe('parallel');
    });

    it('should have correct schema', () => {
      expect(ParallelNode.schema).toBeDefined();
    });
  });

  describe('Constructor', () => {
    it('should create instance with required properties', () => {
      expect(parallelNode.id).toBe('testParallel');
      expect(parallelNode.initial).toBeUndefined();
    });

    it('should set allowChildren to true', () => {
      expect(parallelNode.allowChildren).toBe(true);
    });
  });

  describe('Parallel State Properties', () => {
    it('should never be atomic', () => {
      expect(parallelNode.isAtomic).toBe(false);

      // Even with no children, parallel states are not atomic
      expect(parallelNode.children.length).toBe(0);
      expect(parallelNode.isAtomic).toBe(false);
    });

    it('should return empty string for initialState', () => {
      expect(parallelNode.initialState).toBe('');
    });

    it('should return all child states as active child states', () => {
      // Add some child states
      const childState1 = new StateNode({
        state: {
          id: 'child1',
          content: '',
          children: [],
        },
      });
      const childState2 = new StateNode({
        state: {
          id: 'child2',
          content: '',
          children: [],
        },
      });

      parallelNode.children.push(childState1, childState2);

      const activeChildren = parallelNode.activeChildStates;
      expect(activeChildren).toHaveLength(2);
      expect(activeChildren).toContain(childState1);
      expect(activeChildren).toContain(childState2);
    });
  });

  describe('Mount Behavior', () => {
    it('should execute onentry actions before handling children', async () => {
      // Create mock onentry node
      const onEntryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [],
        },
      });

      // Add assign node to onentry
      const assignNode = new AssignNode({
        assign: {
          location: 'testVar',
          expr: '"onentry executed"',
          content: '',
          children: [],
        },
      });
      onEntryNode.children.push(assignNode);
      parallelNode.children.push(onEntryNode);

      const result = await parallelNode.mount(initialState);

      expect(result.state.data.testVar).toBe('onentry executed');
      expect(result.node).toBe(parallelNode);
    });

    it('should return childPath with comma-separated child state IDs', async () => {
      // Add child states
      const childState1 = new StateNode({
        state: {
          id: 'region1',
          content: '',
          children: [],
        },
      });
      const childState2 = new StateNode({
        state: {
          id: 'region2',
          content: '',
          children: [],
        },
      });
      parallelNode.children.push(childState1, childState2);

      const result = await parallelNode.mount(initialState);

      expect(result.childPath).toBe('region1,region2');
    });

    it('should return empty childPath when no children', async () => {
      const result = await parallelNode.mount(initialState);

      expect(result.childPath).toBe('');
    });

    it('should preserve state data through mount process', async () => {
      const stateWithData = {
        ...initialState,
        data: { existingData: 'preserved' },
      };

      const result = await parallelNode.mount(stateWithData);

      expect(result.state.data.existingData).toBe('preserved');
    });
  });

  describe('Completion Detection', () => {
    it('should be complete when no children', () => {
      expect(parallelNode.isComplete).toBe(true);
    });

    it('should be complete when all children have final states', () => {
      // Add child states with final nodes
      const childState1 = new StateNode({
        state: {
          id: 'region1',
          content: '',
          children: [],
        },
      });
      const finalNode1 = new FinalNode({
        final: {
          id: 'final1',
          content: '',
          children: [],
        },
      });
      childState1.children.push(finalNode1);

      const childState2 = new StateNode({
        state: {
          id: 'region2',
          content: '',
          children: [],
        },
      });
      const finalNode2 = new FinalNode({
        final: {
          id: 'final2',
          content: '',
          children: [],
        },
      });
      childState2.children.push(finalNode2);

      parallelNode.children.push(childState1, childState2);

      expect(parallelNode.isComplete).toBe(true);
    });

    it('should not be complete when some children lack final states', () => {
      // Add one child with final, one without
      const childState1 = new StateNode({
        state: {
          id: 'region1',
          content: '',
          children: [],
        },
      });
      const finalNode1 = new FinalNode({
        final: {
          id: 'final1',
          content: '',
          children: [],
        },
      });
      childState1.children.push(finalNode1);

      const childState2 = new StateNode({
        state: {
          id: 'region2',
          content: '',
          children: [],
        },
      });
      // No final node for childState2

      parallelNode.children.push(childState1, childState2);

      expect(parallelNode.isComplete).toBe(false);
    });
  });

  describe('#createFromJSON', () => {
    it('should create ParallelNode from valid JSON', () => {
      const jsonInput = {
        parallel: {
          id: 'testParallel',
          content: '',
          children: [],
        },
      };

      const result = ParallelNode.createFromJSON(jsonInput);

      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(ParallelNode);
      expect(result.node?.id).toBe('testParallel');
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid JSON gracefully', () => {
      const jsonInput = {
        parallel: {
          // Missing required id
          content: '',
          children: [],
        },
      };

      const result = ParallelNode.createFromJSON(jsonInput);

      expect(result.success).toBe(false);
      expect(result.node).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should handle missing parallel property', () => {
      const jsonInput = {
        // Missing parallel property
        someOtherProperty: 'value',
      };

      const result = ParallelNode.createFromJSON(jsonInput);

      expect(result.success).toBe(false);
      expect(result.node).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });
});
