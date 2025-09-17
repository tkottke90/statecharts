import { StateExecutionHistory } from './state-execution-history';
import {
  HistoryEventType,
  HistoryTrackingOptions,
  HistoryQueryOptions,
  SerializableHistoryEntry,
} from './history';
import { InternalState, SCXMLEvent } from './internalState';

describe('StateExecutionHistory', () => {
  let history: StateExecutionHistory;
  let mockState: InternalState;
  let mockEvent: SCXMLEvent;

  beforeEach(() => {
    history = new StateExecutionHistory();
    mockState = {
      data: { counter: 0 },
      _datamodel: 'ecmascript',
    };
    mockEvent = {
      name: 'test.event',
      type: 'internal',
      sendid: 'test-send',
      origin: 'test-origin',
      origintype: 'test-type',
      invokeid: 'test-invoke',
      data: { key: 'value' },
    };
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      // Arrange & Act
      const defaultHistory = new StateExecutionHistory();

      // Assert
      const options = defaultHistory.getOptions();
      expect(options.enabled).toBe(true);
      expect(options.maxEntries).toBe(1000);
      expect(options.includeInternalState).toBe(true);
    });

    it('should initialize with custom options', () => {
      // Arrange
      const customOptions: Partial<HistoryTrackingOptions> = {
        enabled: false,
        maxEntries: 500,
        includeInternalState: false,
      };

      // Act
      const customHistory = new StateExecutionHistory(customOptions);

      // Assert
      const options = customHistory.getOptions();
      expect(options.enabled).toBe(false);
      expect(options.maxEntries).toBe(500);
      expect(options.includeInternalState).toBe(false);
    });
  });

  describe('addEntry', () => {
    it('should add a history entry when enabled', () => {
      // Arrange
      const stateConfig = ['state1', 'state2'];

      // Act
      const entryId = history.addEntry(
        HistoryEventType.STATE_ENTRY,
        stateConfig,
        mockState,
        { metadata: { test: true } }
      );

      // Assert
      expect(entryId).toBeTruthy();
      const entry = history.getEntry(entryId);
      expect(entry).toBeDefined();
      expect(entry!.type).toBe(HistoryEventType.STATE_ENTRY);
      expect(entry!.stateConfiguration).toEqual(stateConfig);
      expect(entry!.metadata.test).toBe(true);
    });

    it('should not add entry when disabled', () => {
      // Arrange
      history.updateOptions({ enabled: false });
      const stateConfig = ['state1'];

      // Act
      const entryId = history.addEntry(
        HistoryEventType.STATE_ENTRY,
        stateConfig,
        mockState
      );

      // Assert
      expect(entryId).toBe('');
      expect(history.getAllEntries()).toHaveLength(0);
    });

    it('should not add entry for untracked event types', () => {
      // Arrange
      history.updateOptions({ 
        trackedEventTypes: [HistoryEventType.STATE_ENTRY] 
      });
      const stateConfig = ['state1'];

      // Act
      const entryId = history.addEntry(
        HistoryEventType.STATE_EXIT,
        stateConfig,
        mockState
      );

      // Assert
      expect(entryId).toBe('');
      expect(history.getAllEntries()).toHaveLength(0);
    });

    it('should emit history event when entry is added', (done) => {
      // Arrange
      const stateConfig = ['state1'];
      
      history.on('history', (payload) => {
        // Assert
        expect(payload.entry.type).toBe(HistoryEventType.STATE_ENTRY);
        expect(payload.totalEntries).toBe(1);
        expect(payload.entriesPruned).toBe(false);
        done();
      });

      // Act
      history.addEntry(HistoryEventType.STATE_ENTRY, stateConfig, mockState);
    });

    it('should include event data when provided', () => {
      // Arrange
      const stateConfig = ['state1'];

      // Act
      const entryId = history.addEntry(
        HistoryEventType.EVENT_PROCESSED,
        stateConfig,
        mockState,
        { event: mockEvent }
      );

      // Assert
      const entry = history.getEntry(entryId);
      expect(entry!.event).toEqual(mockEvent);
    });

    it('should exclude internal state when configured', () => {
      // Arrange
      history.updateOptions({ includeInternalState: false });
      const stateConfig = ['state1'];

      // Act
      const entryId = history.addEntry(
        HistoryEventType.STATE_ENTRY,
        stateConfig,
        mockState
      );

      // Assert
      const entry = history.getEntry(entryId);
      expect(entry!.internalState).toEqual({ data: {} });
    });

    it('should exclude timing when configured', () => {
      // Arrange
      history.updateOptions({ trackTiming: false });
      const stateConfig = ['state1'];

      // Act
      const entryId = history.addEntry(
        HistoryEventType.STATE_ENTRY,
        stateConfig,
        mockState,
        { duration: 100 }
      );

      // Assert
      const entry = history.getEntry(entryId);
      expect(entry!.duration).toBeUndefined();
    });
  });

  describe('causality tracking', () => {
    it('should track parent-child relationships when enabled', () => {
      // Arrange
      const stateConfig = ['state1'];

      // Act
      const parentId = history.addEntry(
        HistoryEventType.MACROSTEP_START,
        stateConfig,
        mockState
      );
      
      history.startContext(parentId);
      
      const childId = history.addEntry(
        HistoryEventType.MICROSTEP_START,
        stateConfig,
        mockState
      );
      
      history.endContext();

      // Assert
      const parent = history.getEntry(parentId);
      const child = history.getEntry(childId);
      
      expect(parent!.childIds).toContain(childId);
      expect(child!.parentId).toBe(parentId);
    });

    it('should not track causality when disabled', () => {
      // Arrange
      history.updateOptions({ trackCausality: false });
      const stateConfig = ['state1'];

      // Act
      const parentId = history.addEntry(
        HistoryEventType.MACROSTEP_START,
        stateConfig,
        mockState
      );
      
      history.startContext(parentId);
      
      const childId = history.addEntry(
        HistoryEventType.MICROSTEP_START,
        stateConfig,
        mockState
      );

      // Assert
      const child = history.getEntry(childId);
      expect(child!.parentId).toBeUndefined();
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Add some test entries
      history.addEntry(HistoryEventType.STATE_ENTRY, ['state1'], mockState, {
        event: mockEvent,
        metadata: { timestamp: 1000 }
      });
      
      history.addEntry(HistoryEventType.STATE_EXIT, ['state1'], mockState, {
        metadata: { timestamp: 2000 }
      });
      
      history.addEntry(HistoryEventType.EVENT_PROCESSED, ['state2'], mockState, {
        event: { ...mockEvent, name: 'other.event' },
        metadata: { timestamp: 3000 }
      });
    });

    it('should return all entries with no filters', () => {
      // Act
      const result = history.query();

      // Assert
      expect(result.entries).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.metadata.queryOptions).toEqual({});
    });

    it('should filter by event types', () => {
      // Arrange
      const options: HistoryQueryOptions = {
        eventTypes: [HistoryEventType.STATE_ENTRY, HistoryEventType.STATE_EXIT]
      };

      // Act
      const result = history.query(options);

      // Assert
      expect(result.entries).toHaveLength(2);
      expect(result.entries.every(e => 
        e.type === HistoryEventType.STATE_ENTRY || e.type === HistoryEventType.STATE_EXIT
      )).toBe(true);
    });

    it('should filter by state configuration', () => {
      // Arrange
      const options: HistoryQueryOptions = {
        stateFilter: 'state2'
      };

      // Act
      const result = history.query(options);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].stateConfiguration).toContain('state2');
    });

    it('should filter by event name pattern', () => {
      // Arrange
      const options: HistoryQueryOptions = {
        eventNamePattern: /^test\./
      };

      // Act
      const result = history.query(options);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].event!.name).toBe('test.event');
    });

    it('should apply pagination', () => {
      // Arrange
      const options: HistoryQueryOptions = {
        limit: 2,
        offset: 1
      };

      // Act
      const result = history.query(options);

      // Assert
      expect(result.entries).toHaveLength(2);
      expect(result.totalCount).toBe(3);
    });

    it('should sort in descending order', () => {
      // Arrange
      const options: HistoryQueryOptions = {
        sortOrder: 'desc'
      };

      // Act
      const result = history.query(options);

      // Assert
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].type).toBe(HistoryEventType.EVENT_PROCESSED);
      expect(result.entries[2].type).toBe(HistoryEventType.STATE_ENTRY);
    });
  });

  describe('memory management', () => {
    it('should prune old entries when maxEntries is exceeded', (done) => {
      // Arrange
      history.updateOptions({ maxEntries: 2 });
      const stateConfig = ['state1'];

      history.on('pruned', (data) => {
        // Assert
        expect(data.removedCount).toBe(1);
        expect(history.getAllEntries()).toHaveLength(2);
        done();
      });

      // Act - Add 3 entries to trigger pruning
      history.addEntry(HistoryEventType.STATE_ENTRY, stateConfig, mockState);
      history.addEntry(HistoryEventType.STATE_EXIT, stateConfig, mockState);
      history.addEntry(HistoryEventType.EVENT_PROCESSED, stateConfig, mockState);
    });

    it('should not prune when maxEntries is 0 (unlimited)', () => {
      // Arrange
      history.updateOptions({ maxEntries: 0 });
      const stateConfig = ['state1'];

      // Act - Add many entries
      for (let i = 0; i < 1500; i++) {
        history.addEntry(HistoryEventType.STATE_ENTRY, stateConfig, mockState);
      }

      // Assert
      expect(history.getAllEntries()).toHaveLength(1500);
    });
  });

  describe('import/export', () => {
    it('should export and import history correctly', () => {
      // Arrange
      const stateConfig = ['state1'];
      history.addEntry(HistoryEventType.STATE_ENTRY, stateConfig, mockState, {
        event: mockEvent,
        metadata: { test: true }
      });

      // Act
      const exported = history.export();
      const newHistory = new StateExecutionHistory();
      newHistory.import(exported);

      // Assert
      expect(newHistory.getAllEntries()).toHaveLength(1);
      const importedEntry = newHistory.getAllEntries()[0];
      expect(importedEntry.type).toBe(HistoryEventType.STATE_ENTRY);
      expect(importedEntry.event).toEqual(mockEvent);
      expect(importedEntry.metadata.test).toBe(true);
    });

    it('should emit imported event', (done) => {
      // Arrange
      const exported: SerializableHistoryEntry[] = [];
      const newHistory = new StateExecutionHistory();

      newHistory.on('imported', (data) => {
        // Assert
        expect(data.count).toBe(0);
        done();
      });

      // Act
      newHistory.import(exported);
    });
  });

  describe('statistics', () => {
    it('should provide accurate statistics', () => {
      // Arrange
      const stateConfig = ['state1'];
      history.addEntry(HistoryEventType.STATE_ENTRY, stateConfig, mockState);
      history.addEntry(HistoryEventType.STATE_ENTRY, stateConfig, mockState);
      history.addEntry(HistoryEventType.STATE_EXIT, stateConfig, mockState);

      // Act
      const stats = history.getStats();

      // Assert
      expect(stats.totalEntries).toBe(3);
      expect(stats.entriesByType[HistoryEventType.STATE_ENTRY]).toBe(2);
      expect(stats.entriesByType[HistoryEventType.STATE_EXIT]).toBe(1);
      expect(stats.entriesByType[HistoryEventType.TRANSITION]).toBe(0);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all entries and emit cleared event', (done) => {
      // Arrange
      const stateConfig = ['state1'];
      history.addEntry(HistoryEventType.STATE_ENTRY, stateConfig, mockState);

      history.on('cleared', () => {
        // Assert
        expect(history.getAllEntries()).toHaveLength(0);
        done();
      });

      // Act
      history.clear();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully when adding entries', () => {
      // Arrange
      const stateConfig = ['state1'];
      const errorState = { ...mockState };
      // Create a circular reference to cause JSON serialization issues
      (errorState as any).circular = errorState;

      // Act & Assert - Should not throw
      expect(() => {
        history.addEntry(HistoryEventType.STATE_ENTRY, stateConfig, errorState);
      }).not.toThrow();
    });

    it('should handle invalid query options gracefully', () => {
      // Arrange
      const invalidOptions = {
        limit: -1,
        offset: -5,
      } as HistoryQueryOptions;

      // Act & Assert - Should not throw and return empty results
      expect(() => {
        const result = history.query(invalidOptions);
        expect(result.entries).toHaveLength(0);
      }).not.toThrow();
    });
  });
});
