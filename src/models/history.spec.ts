import {
  HistoryEventType,
  HistoryEntry,
  StateTransition,
  HistoryTrackingOptions,
  DEFAULT_HISTORY_OPTIONS,
  generateHistoryId,
  serializeHistoryEntry,
  deserializeHistoryEntry,
} from './history';
import { InternalState, SCXMLEvent } from './internalState';

describe('History Data Structures', () => {
  describe('generateHistoryId', () => {
    it('should generate unique IDs', () => {
      // Arrange & Act
      const id1 = generateHistoryId();
      const id2 = generateHistoryId();

      // Assert
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^hist_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^hist_\d+_[a-z0-9]+$/);
    });

    it('should include timestamp in ID', () => {
      // Arrange
      const beforeTime = Date.now();

      // Act
      const id = generateHistoryId();

      // Assert
      const afterTime = Date.now();
      const timestampMatch = id.match(/^hist_(\d+)_/);
      expect(timestampMatch).toBeTruthy();
      
      const timestamp = parseInt(timestampMatch![1]);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('serializeHistoryEntry', () => {
    it('should serialize a complete history entry', () => {
      // Arrange
      const mockEvent: SCXMLEvent = {
        name: 'test.event',
        type: 'internal',
        sendid: 'test-send',
        origin: 'test-origin',
        origintype: 'test-type',
        invokeid: 'test-invoke',
        data: { key: 'value' },
      };

      const mockTransition: StateTransition = {
        id: 'trans_123',
        timestamp: 1234567890,
        sourceState: 'state1',
        targetState: 'state2',
        triggeringEvent: mockEvent,
        exitedStates: ['state1'],
        enteredStates: ['state2'],
        duration: 100,
        error: new Error('Test error'),
        metadata: { test: true },
      };

      const mockState: InternalState = {
        data: { counter: 5 },
        _datamodel: 'ecmascript',
      };

      const entry: HistoryEntry = {
        id: 'hist_123',
        timestamp: 1234567890,
        type: HistoryEventType.TRANSITION,
        stateConfiguration: ['state1', 'state2'],
        internalState: mockState,
        event: mockEvent,
        transition: mockTransition,
        duration: 150,
        error: new Error('Entry error'),
        metadata: { entryTest: true },
        parentId: 'parent_123',
        childIds: ['child_1', 'child_2'],
      };

      // Act
      const serialized = serializeHistoryEntry(entry);

      // Assert
      expect(serialized.id).toBe(entry.id);
      expect(serialized.timestamp).toBe(entry.timestamp);
      expect(serialized.type).toBe(entry.type);
      expect(serialized.stateConfiguration).toEqual(entry.stateConfiguration);
      expect(serialized.internalState).toEqual(entry.internalState);
      expect(serialized.event).toEqual(entry.event);
      expect(serialized.duration).toBe(entry.duration);
      expect(serialized.error).toBe('Entry error');
      expect(serialized.metadata).toEqual(entry.metadata);
      expect(serialized.parentId).toBe(entry.parentId);
      expect(serialized.childIds).toEqual(entry.childIds);
      
      // Check transition serialization
      expect(serialized.transition).toBeDefined();
      expect(serialized.transition!.error).toBe('Test error');
      expect(serialized.transition!.sourceState).toBe('state1');
    });

    it('should handle entry without error or transition', () => {
      // Arrange
      const mockState: InternalState = {
        data: { counter: 5 },
        _datamodel: 'ecmascript',
      };

      const entry: HistoryEntry = {
        id: 'hist_123',
        timestamp: 1234567890,
        type: HistoryEventType.STATE_ENTRY,
        stateConfiguration: ['state1'],
        internalState: mockState,
        metadata: {},
        childIds: [],
      };

      // Act
      const serialized = serializeHistoryEntry(entry);

      // Assert
      expect(serialized.error).toBeUndefined();
      expect(serialized.transition).toBeUndefined();
      expect(serialized.id).toBe(entry.id);
    });
  });

  describe('deserializeHistoryEntry', () => {
    it('should deserialize a complete history entry', () => {
      // Arrange
      const mockEvent: SCXMLEvent = {
        name: 'test.event',
        type: 'internal',
        sendid: 'test-send',
        origin: 'test-origin',
        origintype: 'test-type',
        invokeid: 'test-invoke',
        data: { key: 'value' },
      };

      const serialized = {
        id: 'hist_123',
        timestamp: 1234567890,
        type: HistoryEventType.TRANSITION,
        stateConfiguration: ['state1', 'state2'],
        internalState: { data: { counter: 5 }, _datamodel: 'ecmascript' },
        event: mockEvent,
        transition: {
          id: 'trans_123',
          timestamp: 1234567890,
          sourceState: 'state1',
          targetState: 'state2',
          triggeringEvent: mockEvent,
          exitedStates: ['state1'],
          enteredStates: ['state2'],
          duration: 100,
          error: 'Test error',
          metadata: { test: true },
        },
        duration: 150,
        error: 'Entry error',
        metadata: { entryTest: true },
        parentId: 'parent_123',
        childIds: ['child_1', 'child_2'],
      };

      // Act
      const deserialized = deserializeHistoryEntry(serialized);

      // Assert
      expect(deserialized.id).toBe(serialized.id);
      expect(deserialized.timestamp).toBe(serialized.timestamp);
      expect(deserialized.type).toBe(serialized.type);
      expect(deserialized.stateConfiguration).toEqual(serialized.stateConfiguration);
      expect(deserialized.internalState).toEqual(serialized.internalState);
      expect(deserialized.event).toEqual(serialized.event);
      expect(deserialized.duration).toBe(serialized.duration);
      expect(deserialized.error).toBeInstanceOf(Error);
      expect(deserialized.error!.message).toBe('Entry error');
      expect(deserialized.metadata).toEqual(serialized.metadata);
      expect(deserialized.parentId).toBe(serialized.parentId);
      expect(deserialized.childIds).toEqual(serialized.childIds);
      
      // Check transition deserialization
      expect(deserialized.transition).toBeDefined();
      expect(deserialized.transition!.error).toBeInstanceOf(Error);
      expect(deserialized.transition!.error!.message).toBe('Test error');
      expect(deserialized.transition!.sourceState).toBe('state1');
    });

    it('should handle serialized entry without error or transition', () => {
      // Arrange
      const serialized = {
        id: 'hist_123',
        timestamp: 1234567890,
        type: HistoryEventType.STATE_ENTRY,
        stateConfiguration: ['state1'],
        internalState: { data: { counter: 5 }, _datamodel: 'ecmascript' },
        metadata: {},
        childIds: [],
      };

      // Act
      const deserialized = deserializeHistoryEntry(serialized);

      // Assert
      expect(deserialized.error).toBeUndefined();
      expect(deserialized.transition).toBeUndefined();
      expect(deserialized.id).toBe(serialized.id);
    });
  });

  describe('DEFAULT_HISTORY_OPTIONS', () => {
    it('should have sensible defaults', () => {
      // Assert
      expect(DEFAULT_HISTORY_OPTIONS.enabled).toBe(true);
      expect(DEFAULT_HISTORY_OPTIONS.maxEntries).toBe(1000);
      expect(DEFAULT_HISTORY_OPTIONS.trackedEventTypes).toEqual(Object.values(HistoryEventType));
      expect(DEFAULT_HISTORY_OPTIONS.includeInternalState).toBe(true);
      expect(DEFAULT_HISTORY_OPTIONS.trackTiming).toBe(true);
      expect(DEFAULT_HISTORY_OPTIONS.trackCausality).toBe(true);
      expect(DEFAULT_HISTORY_OPTIONS.defaultMetadata).toEqual({});
    });
  });

  describe('HistoryEventType enum', () => {
    it('should contain all expected event types', () => {
      // Assert
      expect(HistoryEventType.STATE_ENTRY).toBe('state_entry');
      expect(HistoryEventType.STATE_EXIT).toBe('state_exit');
      expect(HistoryEventType.TRANSITION).toBe('transition');
      expect(HistoryEventType.EVENT_PROCESSED).toBe('event_processed');
      expect(HistoryEventType.MICROSTEP_START).toBe('microstep_start');
      expect(HistoryEventType.MICROSTEP_END).toBe('microstep_end');
      expect(HistoryEventType.MACROSTEP_START).toBe('macrostep_start');
      expect(HistoryEventType.MACROSTEP_END).toBe('macrostep_end');
      expect(HistoryEventType.ERROR).toBe('error');
    });

    it('should have 9 event types', () => {
      // Assert
      expect(Object.values(HistoryEventType)).toHaveLength(9);
    });
  });
});
