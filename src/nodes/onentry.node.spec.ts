import { OnEntryNode } from './onentry.node';
import { AssignNode } from './assign.node';
import { RaiseNode } from './raise.node';
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
    data: { ...data },
    ...data // Also spread data at root level for backward compatibility with tests
  };
}

describe('Node: <onentry>', () => {
  describe('constructor', () => {
    it('should create OnEntryNode with default properties', () => {
      // Arrange & Act
      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: []
        }
      });

      // Assert
      expect(onentryNode).toBeInstanceOf(OnEntryNode);
      expect(onentryNode.isExecutable).toBe(true);
      expect(onentryNode.allowChildren).toBe(true); // Enabled for executable children
      expect(onentryNode.content).toBe('');
      expect(onentryNode.children).toEqual([]);
    });

    it('should create OnEntryNode with content', () => {
      // Arrange & Act
      const onentryNode = new OnEntryNode({
        onentry: {
          content: 'Entry action content',
          children: []
        }
      });

      // Assert
      expect(onentryNode.content).toBe('Entry action content');
      expect(onentryNode.children).toEqual([]);
    });

    it('should create OnEntryNode with executable children', () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'entryFlag',
          expr: 'true',
          content: '',
          children: []
        }
      });

      const raiseChild = new RaiseNode({
        raise: {
          event: 'entry.complete',
          content: '',
          children: []
        }
      });

      // Act
      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [assignChild, raiseChild]
        }
      });

      // Assert
      expect(onentryNode.children).toHaveLength(2);
      expect(onentryNode.children[0]).toBeInstanceOf(AssignNode);
      expect(onentryNode.children[1]).toBeInstanceOf(RaiseNode);
    });

    it('should have correct static properties', () => {
      // Assert
      expect(OnEntryNode.label).toBe('onentry');
      expect(OnEntryNode.schema).toBeDefined();
    });
  });

  describe('run method', () => {
    it('should return unchanged state when no children', async () => {
      // Arrange
      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: []
        }
      });

      const initialState = createTestEventState({ counter: 0 });

      // Act
      const result = await onentryNode.run(initialState);

      // Assert
      expect(result).toEqual(initialState);
      expect(result.data.counter).toBe(0);
    });

    it('should execute single child and return modified state', async () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'entryExecuted',
          expr: 'true',
          content: '',
          children: []
        }
      });

      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [assignChild]
        }
      });

      const initialState = createTestEventState({ counter: 0 });

      // Act
      const result = await onentryNode.run(initialState);

      // Assert
      expect(result.data.entryExecuted).toBe(true);
      expect(result.data.counter).toBe(0); // Original data preserved
      expect(result._event).toBeDefined(); // Event context preserved
    });

    it('should execute multiple children in sequence', async () => {
      // Arrange
      const assignChild1 = new AssignNode({
        assign: {
          location: 'step1',
          expr: '"completed"',
          content: '',
          children: []
        }
      });

      const assignChild2 = new AssignNode({
        assign: {
          location: 'step2',
          expr: '"completed"',
          content: '',
          children: []
        }
      });

      const assignChild3 = new AssignNode({
        assign: {
          location: 'counter',
          expr: 'counter + 1',
          content: '',
          children: []
        }
      });

      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [assignChild1, assignChild2, assignChild3]
        }
      });

      const initialState = createTestEventState({ counter: 5 });

      // Act
      const result = await onentryNode.run(initialState);

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
          event: 'entry.completed',
          content: '',
          children: []
        }
      });

      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [raiseChild]
        }
      });

      const initialState = createTestEventState({ status: 'entering' });

      // Act
      const result = await onentryNode.run(initialState);

      // Assert
      expect(result.data.status).toBe('entering'); // Original data preserved
      expect(result._pendingInternalEvents).toBeDefined();
      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0].name).toBe('entry.completed');
      expect(result._pendingInternalEvents![0].type).toBe('internal');
    });

    it('should handle mixed executable children (assign + raise)', async () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'entryTime',
          expr: 'Date.now()',
          content: '',
          children: []
        }
      });

      const raiseChild = new RaiseNode({
        raise: {
          event: 'state.entered',
          content: '',
          children: []
        }
      });

      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [assignChild, raiseChild]
        }
      });

      const initialState = createTestEventState({ counter: 1 });

      // Act
      const result = await onentryNode.run(initialState);

      // Assert
      expect(result.data.entryTime).toBeDefined();
      expect(typeof result.data.entryTime).toBe('number');
      expect(result.data.counter).toBe(1); // Original data preserved
      expect(result._pendingInternalEvents).toBeDefined();
      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0].name).toBe('state.entered');
    });

    it('should preserve state structure and event context', async () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'nested.value',
          expr: '"entry-value"',
          content: '',
          children: []
        }
      });

      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [assignChild]
        }
      });

      const initialState = createTestEventState({
        existing: { prop: 'value' },
        counter: 42
      });

      // Act
      const result = await onentryNode.run(initialState);

      // Assert
      expect(result._event).toEqual(initialState._event); // Event context preserved
      expect(result._datamodel).toBe('ecmascript'); // Datamodel preserved
      expect(result.data.existing).toEqual({ prop: 'value' }); // Existing data preserved
      expect(result.data.counter).toBe(42); // Existing data preserved
      expect(result.data.nested).toEqual({ value: 'entry-value' }); // New data added
    });
  });

  describe('createFromJSON', () => {
    it('should create OnEntryNode from valid JSON input', () => {
      // Arrange
      const jsonInput = {
        onentry: {
          content: 'Entry content',
          children: []
        }
      };

      // Act
      const result = OnEntryNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(OnEntryNode);
      expect(result.node?.content).toBe('Entry content');
      expect(result.error).toBeUndefined();
    });

    it('should create OnEntryNode from minimal JSON input', () => {
      // Arrange
      const jsonInput = {
        onentry: {}
      };

      // Act
      const result = OnEntryNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(OnEntryNode);
      expect(result.node?.content).toBe(''); // Default value
      expect(result.node?.children).toEqual([]); // Default value
      expect(result.error).toBeUndefined();
    });

    it('should handle empty JSON input', () => {
      // Arrange
      const jsonInput = {};

      // Act
      const result = OnEntryNode.createFromJSON(jsonInput);

      // Assert - Empty input should succeed with defaults since no onentry key is required
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(OnEntryNode);
      expect(result.node?.content).toBe(''); // Default value
      expect(result.error).toBeUndefined();
    });
  });

  describe('schema validation', () => {
    it('should validate successfully with valid input', () => {
      // Arrange & Act
      const result = OnEntryNode.schema.safeParse({
        content: 'Entry content',
        children: []
      });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate successfully with minimal input', () => {
      // Arrange & Act
      const result = OnEntryNode.schema.safeParse({});

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(''); // Default value
        expect(result.data.children).toEqual([]); // Default value
      }
    });
  });

  describe('SCXML compliance', () => {
    it('should follow SCXML specification for onentry elements', () => {
      // Arrange & Act
      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: []
        }
      });

      // Assert - SCXML compliance checks
      expect(onentryNode.isExecutable).toBe(true); // Must be executable
      expect(OnEntryNode.label).toBe('onentry'); // Correct SCXML element name
      expect(typeof onentryNode.run).toBe('function'); // Must have run method
    });

    it('should demonstrate usage as executable content in state entry', async () => {
      // Arrange - Simulate SCXML onentry usage
      const logAssign = new AssignNode({
        assign: {
          location: 'log',
          expr: '"Entering state"',
          content: '',
          children: []
        }
      });

      const notifyRaise = new RaiseNode({
        raise: {
          event: 'state.entry.complete',
          content: '',
          children: []
        }
      });

      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [logAssign, notifyRaise]
        }
      });

      const stateContext = createTestEventState({
        currentState: 'idle',
        timestamp: Date.now()
      });

      // Act
      const result = await onentryNode.run(stateContext);

      // Assert - Demonstrates proper SCXML onentry behavior
      expect(result.data.log).toBe('Entering state');
      expect(result.data.currentState).toBe('idle'); // Preserved
      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0].name).toBe('state.entry.complete');
    });
  });

  describe('edge cases', () => {
    it('should handle empty children array gracefully', async () => {
      // Arrange
      const onentryNode = new OnEntryNode({
        onentry: {
          content: 'Some content',
          children: []
        }
      });

      const initialState = createTestEventState();

      // Act
      const result = await onentryNode.run(initialState);

      // Assert
      expect(result).toEqual(initialState);
    });

    it('should handle state with no data property', async () => {
      // Arrange
      const assignChild = new AssignNode({
        assign: {
          location: 'newProp',
          expr: '"test"',
          content: '',
          children: []
        }
      });

      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [assignChild]
        }
      });

      const minimalState: InternalState = {
        _datamodel: 'ecmascript',
        data: {}
      };

      // Act
      const result = await onentryNode.run(minimalState);

      // Assert
      expect(result.data.newProp).toBe('test');
    });

    it('should handle complex nested state modifications', async () => {
      // Arrange
      const assignChild1 = new AssignNode({
        assign: {
          location: 'user.profile.name',
          expr: '"John Doe"',
          content: '',
          children: []
        }
      });

      const assignChild2 = new AssignNode({
        assign: {
          location: 'user.profile.active',
          expr: 'true',
          content: '',
          children: []
        }
      });

      const onentryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [assignChild1, assignChild2]
        }
      });

      const initialState = createTestEventState({
        user: { id: 123 },
        system: { version: '1.0' }
      });

      // Act
      const result = await onentryNode.run(initialState);

      // Assert
      expect(result.data.user).toBeDefined();
      expect(result.data.system).toBeDefined();

      const { user } = result.data as { user: { id: number; profile: { name: string; active: boolean } } };
      const { system } = result.data as { system: { version: string } };

      expect(user.id).toBe(123); // Preserved
      expect(user.profile.name).toBe('John Doe'); // Added
      expect(user.profile.active).toBe(true); // Added
      expect(system.version).toBe('1.0'); // Preserved
    });
  });
});