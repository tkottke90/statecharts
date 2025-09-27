import { OnExitNode } from './onexit.node';
import { AssignNode } from './assign.node';
import { RaiseNode } from './raise.node';
import { InternalState, SCXMLEvent } from '../models/internalState';

// Helper function to create test InternalState
function createTestEventState(
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
    _datamodel: 'ecmascript',
    data: { ...data },
    ...data, // Also spread data at root level for backward compatibility with tests
  };
}

describe('Node: <onexit>', () => {
  describe('constructor', () => {
    it('should create OnExitNode with default properties', () => {
      // Arrange & Act
      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [],
        },
      });

      // Assert
      expect(onexitNode).toBeInstanceOf(OnExitNode);
      expect(onexitNode.isExecutable).toBe(true);
      expect(onexitNode.allowChildren).toBe(true); // Enabled for executable children
      expect(onexitNode.content).toBe('');
      expect(onexitNode.children).toEqual([]);
    });

    it('should create OnExitNode with content', () => {
      // Arrange & Act
      const onexitNode = new OnExitNode({
        onexit: {
          content: 'Exit action content',
          children: [],
        },
      });

      // Assert
      expect(onexitNode.content).toBe('Exit action content');
      expect(onexitNode.children).toEqual([]);
    });

    it('should create OnExitNode with executable children', () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'exitFlag',
          expr: 'true',
          content: '',
          children: [],
        },
      });

      const raiseChild = new RaiseNode({
        raise: {
          event: 'exit.complete',
          content: '',
          children: [],
        },
      });

      // Act
      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [assignChild, raiseChild],
        },
      });

      // Assert
      expect(onexitNode.children).toHaveLength(2);
      expect(onexitNode.children[0]).toBeInstanceOf(AssignNode);
      expect(onexitNode.children[1]).toBeInstanceOf(RaiseNode);
    });

    it('should have correct static properties', () => {
      // Assert
      expect(OnExitNode.label).toBe('onexit');
      expect(OnExitNode.schema).toBeDefined();
    });
  });

  describe('run method', () => {
    it('should return unchanged state when no children', async () => {
      // Arrange
      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({ counter: 0 });

      // Act
      const result = await onexitNode.run(initialState);

      // Assert
      expect(result).toEqual(initialState);
      expect(result.data.counter).toBe(0);
    });

    it('should execute single child and return modified state', async () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'data.exitExecuted',
          expr: 'true',
          content: '',
          children: [],
        },
      });

      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [assignChild],
        },
      });

      const initialState = createTestEventState({ counter: 0 });

      // Act
      const result = await onexitNode.run(initialState);

      // Assert
      expect(result.data.exitExecuted).toBe(true);
      expect(result.data.counter).toBe(0); // Original data preserved
      expect(result._event).toBeDefined(); // Event context preserved
    });

    it('should execute multiple children in sequence', async () => {
      // Arrange
      const assignChild1 = new AssignNode({
        assign: {
          location: 'data.step1',
          expr: '"completed"',
          content: '',
          children: [],
        },
      });

      const assignChild2 = new AssignNode({
        assign: {
          location: 'data.step2',
          expr: '"completed"',
          content: '',
          children: [],
        },
      });

      const assignChild3 = new AssignNode({
        assign: {
          location: 'data.counter',
          expr: 'counter + 1',
          content: '',
          children: [],
        },
      });

      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [assignChild1, assignChild2, assignChild3],
        },
      });

      const initialState = createTestEventState({ counter: 5 });

      // Act
      const result = await onexitNode.run(initialState);

      // Assert
      expect(result.data.step1).toBe('completed');
      expect(result.data.step2).toBe('completed');
      expect(result.data.counter).toBe(6); // Incremented from 5
      expect(result._event).toBeDefined();
    });

    it('should execute children with raise node and generate events', async () => {
      // Arrange
      const raiseChild = new RaiseNode({
        raise: {
          event: 'exit.completed',
          content: '',
          children: [],
        },
      });

      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [raiseChild],
        },
      });

      const initialState = createTestEventState({ status: 'exiting' });

      // Act
      const result = await onexitNode.run(initialState);

      // Assert
      expect(result.data.status).toBe('exiting'); // Original data preserved
      expect(result._pendingInternalEvents).toBeDefined();
      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0].name).toBe('exit.completed');
      expect(result._pendingInternalEvents![0].type).toBe('internal');
    });

    it('should handle mixed executable children (assign + raise)', async () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'data.exitTime',
          expr: 'Date.now()',
          content: '',
          children: [],
        },
      });

      const raiseChild = new RaiseNode({
        raise: {
          event: 'state.exited',
          content: '',
          children: [],
        },
      });

      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [assignChild, raiseChild],
        },
      });

      const initialState = createTestEventState({ counter: 1 });

      // Act
      const result = await onexitNode.run(initialState);

      // Assert
      expect(result.data.exitTime).toBeDefined();
      expect(typeof result.data.exitTime).toBe('number');
      expect(result.data.counter).toBe(1); // Original data preserved
      expect(result._pendingInternalEvents).toBeDefined();
      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0].name).toBe('state.exited');
    });

    it('should preserve state structure and event context', async () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'data.nested.value',
          expr: '"exit-value"',
          content: '',
          children: [],
        },
      });

      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [assignChild],
        },
      });

      const initialState = createTestEventState({
        existing: { prop: 'value' },
        counter: 42,
      });

      // Act
      const result = await onexitNode.run(initialState);

      // Assert
      expect(result._event).toEqual(initialState._event); // Event context preserved
      expect(result._datamodel).toBe('ecmascript'); // Datamodel preserved
      expect(result.data.existing).toEqual({ prop: 'value' }); // Existing data preserved
      expect(result.data.counter).toBe(42); // Existing data preserved
      expect(result.data.nested).toEqual({ value: 'exit-value' }); // New data added
    });
  });

  describe('createFromJSON', () => {
    it('should create OnExitNode from valid JSON input', () => {
      // Arrange
      const jsonInput = {
        onexit: {
          content: 'Exit content',
          children: [],
        },
      };

      // Act
      const result = OnExitNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(OnExitNode);
      expect(result.node?.content).toBe('Exit content');
      expect(result.error).toBeUndefined();
    });

    it('should create OnExitNode from minimal JSON input', () => {
      // Arrange
      const jsonInput = {
        onexit: {},
      };

      // Act
      const result = OnExitNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(OnExitNode);
      expect(result.node?.content).toBe(''); // Default value
      expect(result.node?.children).toEqual([]); // Default value
      expect(result.error).toBeUndefined();
    });

    it('should handle empty JSON input', () => {
      // Arrange
      const jsonInput = {};

      // Act
      const result = OnExitNode.createFromJSON(jsonInput);

      // Assert - Empty input should succeed with defaults since no onexit key is required
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(OnExitNode);
      expect(result.node?.content).toBe(''); // Default value
      expect(result.error).toBeUndefined();
    });
  });

  describe('schema validation', () => {
    it('should validate successfully with valid input', () => {
      // Arrange & Act
      const result = OnExitNode.schema.safeParse({
        content: 'Exit content',
        children: [],
      });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate successfully with minimal input', () => {
      // Arrange & Act
      const result = OnExitNode.schema.safeParse({});

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(''); // Default value
        expect(result.data.children).toEqual([]); // Default value
      }
    });
  });

  describe('SCXML compliance', () => {
    it('should follow SCXML specification for onexit elements', () => {
      // Arrange & Act
      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [],
        },
      });

      // Assert - SCXML compliance checks
      expect(onexitNode.isExecutable).toBe(true); // Must be executable
      expect(OnExitNode.label).toBe('onexit'); // Correct SCXML element name
      expect(typeof onexitNode.run).toBe('function'); // Must have run method
    });

    it('should demonstrate usage as executable content in state exit', async () => {
      // Arrange - Simulate SCXML onexit usage
      const logAssign = new AssignNode({
        assign: {
          location: 'data.log',
          expr: '"Exiting state"',
          content: '',
          children: [],
        },
      });

      const notifyRaise = new RaiseNode({
        raise: {
          event: 'state.exit.complete',
          content: '',
          children: [],
        },
      });

      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [logAssign, notifyRaise],
        },
      });

      const stateContext = createTestEventState({
        currentState: 'active',
        timestamp: Date.now(),
      });

      // Act
      const result = await onexitNode.run(stateContext);

      // Assert - Demonstrates proper SCXML onexit behavior
      expect(result.data.log).toBe('Exiting state');
      expect(result.data.currentState).toBe('active'); // Preserved
      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0].name).toBe(
        'state.exit.complete',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty children array gracefully', async () => {
      // Arrange
      const onexitNode = new OnExitNode({
        onexit: {
          content: 'Some content',
          children: [],
        },
      });

      const initialState = createTestEventState();

      // Act
      const result = await onexitNode.run(initialState);

      // Assert
      expect(result).toEqual(initialState);
    });

    it('should handle state with no data property', async () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'data.newProp',
          expr: '"test"',
          content: '',
          children: [],
        },
      });

      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [assignChild],
        },
      });

      const minimalState: InternalState = {
        _datamodel: 'ecmascript',
        data: {},
      };

      // Act
      const result = await onexitNode.run(minimalState);

      // Assert
      expect(result.data.newProp).toBe('test');
    });

    it('should handle complex nested state modifications', async () => {
      // Arrange
      const assignChild1 = new AssignNode({
        assign: {
          location: 'user.session.endTime',
          expr: 'Date.now()',
          content: '',
          children: [],
        },
      });

      const assignChild2 = new AssignNode({
        assign: {
          location: 'user.session.active',
          expr: 'false',
          content: '',
          children: [],
        },
      });

      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [assignChild1, assignChild2],
        },
      });

      const initialState = createTestEventState({
        user: { id: 123, session: { startTime: 1000 } },
        system: { version: '1.0' },
      });

      // Act
      const result = await onexitNode.run(initialState);

      // Assert
      expect(result.data.user).toBeDefined();
      expect(result.data.system).toBeDefined();

      const { user } = result.data as {
        user: {
          id: number;
          session: { startTime: number; endTime: number; active: boolean };
        };
      };
      const { system } = result.data as { system: { version: string } };

      expect(user.id).toBe(123); // Preserved
      expect(user.session.startTime).toBe(1000); // Preserved
      expect(user.session.endTime).toBeDefined(); // Added
      expect(user.session.active).toBe(false); // Added
      expect(system.version).toBe('1.0'); // Preserved
    });

    it('should handle cleanup operations typical in onexit', async () => {
      // Arrange - Simulate typical onexit cleanup operations
      const clearDataAssign = new AssignNode({
        assign: {
          location: 'data.tempData',
          clear: true,
          content: '',
          children: [],
        },
      });

      const logExitAssign = new AssignNode({
        assign: {
          location: 'data.exitLog',
          expr: '"State cleanup completed"',
          content: '',
          children: [],
        },
      });

      const notifyExitRaise = new RaiseNode({
        raise: {
          event: 'cleanup.complete',
          content: '',
          children: [],
        },
      });

      const onexitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [clearDataAssign, logExitAssign, notifyExitRaise],
        },
      });

      const initialState = createTestEventState({
        tempData: { cache: 'some data' },
        persistentData: { important: 'keep this' },
      });

      // Act
      const result = await onexitNode.run(initialState);

      // Assert
      expect(result.data.tempData).toBeUndefined(); // Cleared
      expect(result.data.exitLog).toBe('State cleanup completed'); // Logged
      expect(result.data.persistentData).toBeDefined(); // Preserved

      const { persistentData } = result.data as {
        persistentData: { important: string };
      };
      expect(persistentData.important).toBe('keep this'); // Preserved
      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0].name).toBe('cleanup.complete');
    });
  });
});
