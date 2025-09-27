import { EventEmitter } from 'events';
import {
  HistoryEntry,
  HistoryId,
  HistoryEventType,
  HistoryTrackingOptions,
  HistoryQueryOptions,
  HistoryQueryResult,
  HistoryEventPayload,
  SerializableHistoryEntry,
  DEFAULT_HISTORY_OPTIONS,
  generateHistoryId,
  serializeHistoryEntry,
  deserializeHistoryEntry,
} from './history';
import { InternalState } from './internalState';
import { performance } from 'perf_hooks';

/**
 * Core class for tracking state machine execution history
 * Provides comprehensive history tracking, querying, and event emission capabilities
 */
export class StateExecutionHistory extends EventEmitter {
  private entries: Map<HistoryId, HistoryEntry> = new Map();
  private orderedEntries: HistoryId[] = [];
  private options: HistoryTrackingOptions;
  private currentParentId?: HistoryId | undefined;

  constructor(options: Partial<HistoryTrackingOptions> = {}) {
    super();
    this.options = { ...DEFAULT_HISTORY_OPTIONS, ...options };
  }

  /**
   * Add a new history entry
   */
  addEntry(
    type: HistoryEventType,
    stateConfiguration: string[],
    internalState: InternalState,
    additionalData: Partial<
      Pick<
        HistoryEntry,
        'event' | 'transition' | 'duration' | 'error' | 'metadata'
      >
    > = {},
  ): HistoryId {
    if (!this.options.enabled) {
      return '';
    }

    if (!this.options.trackedEventTypes.includes(type)) {
      return '';
    }

    const id = generateHistoryId();
    const timestamp = Date.now();

    const entry: HistoryEntry = {
      id,
      timestamp,
      type,
      stateConfiguration: [...stateConfiguration],
      internalState: this.options.includeInternalState
        ? { ...internalState }
        : { data: {} },
      metadata: { ...this.options.defaultMetadata, ...additionalData.metadata },
      childIds: [],
    };

    // Add optional properties only if they have values
    if (additionalData.event !== undefined) {
      entry.event = additionalData.event;
    }
    if (additionalData.transition !== undefined) {
      entry.transition = additionalData.transition;
    }
    if (this.options.trackTiming && additionalData.duration !== undefined) {
      entry.duration = additionalData.duration;
    }
    if (additionalData.error !== undefined) {
      entry.error = additionalData.error;
    }
    if (this.options.trackCausality && this.currentParentId !== undefined) {
      entry.parentId = this.currentParentId;
    }

    // Add to parent's children if causality tracking is enabled
    if (this.options.trackCausality && this.currentParentId) {
      const parent = this.entries.get(this.currentParentId);
      if (parent) {
        parent.childIds.push(id);
      }
    }

    // Store the entry
    this.entries.set(id, entry);
    this.orderedEntries.push(id);

    // Prune old entries if necessary
    const entriesPruned = this.pruneEntries();

    // Emit history event
    const payload: HistoryEventPayload = {
      entry,
      totalEntries: this.entries.size,
      entriesPruned,
    };
    this.emit('history', payload);

    return id;
  }

  /**
   * Start a new causality context (for tracking parent-child relationships)
   */
  startContext(parentId: HistoryId): void {
    if (this.options.trackCausality) {
      this.currentParentId = parentId;
    }
  }

  /**
   * End the current causality context
   */
  endContext(): void {
    if (this.options.trackCausality) {
      this.currentParentId = undefined;
    }
  }

  /**
   * Get a specific history entry by ID
   */
  getEntry(id: HistoryId): HistoryEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get all history entries (ordered by timestamp)
   */
  getAllEntries(): HistoryEntry[] {
    return this.orderedEntries.map(id => this.entries.get(id)!).filter(Boolean);
  }

  getTimestamp() {
    return performance.now();
  }

  /**
   * Query history entries with filtering options
   */
  query(options: HistoryQueryOptions = {}): HistoryQueryResult {
    const startTime = Date.now();
    let results = this.getAllEntries();

    // Apply filters
    if (options.eventTypes) {
      results = results.filter(entry =>
        options.eventTypes!.includes(entry.type),
      );
    }

    if (options.timeRange) {
      results = results.filter(
        entry =>
          entry.timestamp >= options.timeRange!.start &&
          entry.timestamp <= options.timeRange!.end,
      );
    }

    if (options.stateFilter) {
      const stateFilters = Array.isArray(options.stateFilter)
        ? options.stateFilter
        : [options.stateFilter];
      results = results.filter(entry =>
        stateFilters.some(filter => entry.stateConfiguration.includes(filter)),
      );
    }

    if (options.eventNamePattern) {
      const pattern =
        options.eventNamePattern instanceof RegExp
          ? options.eventNamePattern
          : new RegExp(options.eventNamePattern);
      results = results.filter(
        entry => entry.event && pattern.test(entry.event.name),
      );
    }

    const totalCount = results.length;

    // Apply sorting
    if (options.sortOrder === 'desc') {
      results.reverse();
    }

    // Apply pagination
    if (options.offset) {
      results = results.slice(options.offset);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    // Include children if requested
    if (options.includeChildren) {
      const allResults = [...results];
      for (const entry of results) {
        allResults.push(...this.getChildEntries(entry.id));
      }
      results = allResults;
    }

    const executionTime = Date.now() - startTime;

    return {
      entries: results,
      totalCount,
      metadata: {
        executionTime,
        queryOptions: options,
      },
    };
  }

  /**
   * Get child entries for a given parent ID
   */
  private getChildEntries(parentId: HistoryId): HistoryEntry[] {
    const parent = this.entries.get(parentId);
    if (!parent) return [];

    const children: HistoryEntry[] = [];
    for (const childId of parent.childIds) {
      const child = this.entries.get(childId);
      if (child) {
        children.push(child);
        // Recursively get grandchildren
        children.push(...this.getChildEntries(childId));
      }
    }
    return children;
  }

  /**
   * Clear all history entries
   */
  clear(): void {
    this.entries.clear();
    this.orderedEntries = [];
    this.currentParentId = undefined;
    this.emit('cleared');
  }

  /**
   * Get current configuration
   */
  getOptions(): HistoryTrackingOptions {
    return { ...this.options };
  }

  /**
   * Update configuration
   */
  updateOptions(newOptions: Partial<HistoryTrackingOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // If disabled, clear existing entries
    if (!this.options.enabled) {
      this.clear();
    }

    // Prune entries if max entries was reduced
    this.pruneEntries();
  }

  /**
   * Get current statistics
   */
  getStats(): {
    totalEntries: number;
    entriesByType: Record<HistoryEventType, number>;
    oldestEntry?: number;
    newestEntry?: number;
    memoryUsage: number;
  } {
    const entriesByType = {} as Record<HistoryEventType, number>;
    Object.values(HistoryEventType).forEach(type => {
      entriesByType[type] = 0;
    });

    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    for (const entry of this.entries.values()) {
      entriesByType[entry.type]++;

      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    // Rough memory usage calculation
    const memoryUsage = JSON.stringify(
      Array.from(this.entries.values()),
    ).length;

    const result: {
      totalEntries: number;
      entriesByType: Record<HistoryEventType, number>;
      oldestEntry?: number;
      newestEntry?: number;
      memoryUsage: number;
    } = {
      totalEntries: this.entries.size,
      entriesByType,
      memoryUsage,
    };

    // Add optional properties only if they have values
    if (oldestEntry !== undefined) {
      result.oldestEntry = oldestEntry;
    }
    if (newestEntry !== undefined) {
      result.newestEntry = newestEntry;
    }

    return result;
  }

  /**
   * Export history to serializable format
   */
  export(): SerializableHistoryEntry[] {
    return this.getAllEntries().map(serializeHistoryEntry);
  }

  /**
   * Import history from serializable format
   */
  import(serializedEntries: SerializableHistoryEntry[]): void {
    this.clear();

    for (const serialized of serializedEntries) {
      const entry = deserializeHistoryEntry(serialized);
      this.entries.set(entry.id, entry);
      this.orderedEntries.push(entry.id);
    }

    // Sort by timestamp to maintain order
    this.orderedEntries.sort((a, b) => {
      const entryA = this.entries.get(a)!;
      const entryB = this.entries.get(b)!;
      return entryA.timestamp - entryB.timestamp;
    });

    this.emit('imported', { count: serializedEntries.length });
  }

  /**
   * Prune old entries based on maxEntries setting
   */
  private pruneEntries(): boolean {
    if (
      this.options.maxEntries === 0 ||
      this.entries.size <= this.options.maxEntries
    ) {
      return false;
    }

    const entriesToRemove = this.entries.size - this.options.maxEntries;
    const removedIds = this.orderedEntries.splice(0, entriesToRemove);

    for (const id of removedIds) {
      this.entries.delete(id);
    }

    this.emit('pruned', { removedCount: entriesToRemove });
    return true;
  }
}
