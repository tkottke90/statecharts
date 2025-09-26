import { SCXMLEvent, InternalState } from './internalState';

/**
 * Unique identifier for history entries
 */
export type HistoryId = string;

/**
 * Types of history events that can be tracked
 */
export enum HistoryEventType {
  ERROR = 'error',
  EVENT_PROCESSED = 'event_processed',
  EVENT_SKIPPED = 'event_skipped',
  INITIAL_STATE = 'initial_state',
  MACROSTEP_END = 'macrostep_end',
  MACROSTEP_START = 'macrostep_start',
  MACROSTEP_EVENTLESS_COMPLETE = 'macrostep_eventless_complete',
  MICROSTEP_END = 'microstep_end',
  MICROSTEP_START = 'microstep_start',
  STATE_ENTRY = 'state_entry',
  STATE_EXIT = 'state_exit',
  TRANSITION = 'transition',
}

/**
 * Represents a state transition for history tracking
 * This is separate from SCXML <history> elements and is used for debugging
 */
export interface StateTransition {
  /** Unique identifier for this transition */
  id: HistoryId;
  
  /** Timestamp when the transition started */
  timestamp: number;
  
  /** Source state path (e.g., "playing.healthSystem.healthy") */
  sourceState: string;
  
  /** Target state path (e.g., "playing.healthSystem.critical") */
  targetState: string;
  
  /** Event that triggered this transition (if any) */
  triggeringEvent?: SCXMLEvent;
  
  /** States that were exited during this transition */
  exitedStates: string[];
  
  /** States that were entered during this transition */
  enteredStates: string[];
  
  /** Duration of the transition in milliseconds */
  duration?: number;
  
  /** Any error that occurred during the transition */
  error?: Error;
  
  /** Additional metadata about the transition */
  metadata: Record<string, unknown>;
}

/**
 * Represents a single entry in the state execution history
 */
export interface HistoryEntry {
  /** Unique identifier for this history entry */
  id: HistoryId;
  
  /** Timestamp when this event occurred */
  timestamp: number;
  
  /** Type of history event */
  type: HistoryEventType;
  
  /** Current state machine configuration at the time of this event */
  stateConfiguration: string[];
  
  /** The internal state at the time of this event */
  internalState: InternalState;
  
  /** Event being processed (if applicable) */
  event?: SCXMLEvent;
  
  /** State transition information (if applicable) */
  transition?: StateTransition;
  
  /** Duration of the operation in milliseconds (if applicable) */
  duration?: number;
  
  /** Any error that occurred */
  error?: Error;
  
  /** Additional context and metadata */
  metadata: Record<string, unknown>;
  
  /** Reference to the parent history entry (for causality tracking) */
  parentId?: HistoryId;
  
  /** References to child history entries */
  childIds: HistoryId[];
}

/**
 * Configuration options for history tracking
 */
export interface HistoryTrackingOptions {
  /** Whether history tracking is enabled */
  enabled: boolean;
  
  /** Maximum number of history entries to retain (0 = unlimited) */
  maxEntries: number;
  
  /** Types of events to track */
  trackedEventTypes: HistoryEventType[];
  
  /** Whether to include full internal state in history entries */
  includeInternalState: boolean;
  
  /** Whether to track timing information */
  trackTiming: boolean;
  
  /** Whether to track causality relationships */
  trackCausality: boolean;
  
  /** Custom metadata to include in all history entries */
  defaultMetadata: Record<string, unknown>;
}

/**
 * Default history tracking configuration
 */
export const DEFAULT_HISTORY_OPTIONS: HistoryTrackingOptions = {
  enabled: true,
  maxEntries: 1000,
  trackedEventTypes: Object.values(HistoryEventType),
  includeInternalState: true,
  trackTiming: true,
  trackCausality: true,
  defaultMetadata: {},
};

/**
 * Query options for filtering history entries
 */
export interface HistoryQueryOptions {
  /** Filter by event types */
  eventTypes?: HistoryEventType[];
  
  /** Filter by time range */
  timeRange?: {
    start: number;
    end: number;
  };
  
  /** Filter by state configuration */
  stateFilter?: string | string[];
  
  /** Filter by event name pattern */
  eventNamePattern?: string | RegExp;
  
  /** Maximum number of results to return */
  limit?: number;
  
  /** Number of results to skip (for pagination) */
  offset?: number;
  
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  
  /** Include child entries in results */
  includeChildren?: boolean;
}

/**
 * Result of a history query
 */
export interface HistoryQueryResult {
  /** Matching history entries */
  entries: HistoryEntry[];
  
  /** Total number of matching entries (before limit/offset) */
  totalCount: number;
  
  /** Query execution metadata */
  metadata: {
    executionTime: number;
    queryOptions: HistoryQueryOptions;
  };
}

/**
 * Event payload emitted when history entries are added
 */
export interface HistoryEventPayload {
  /** The history entry that was added */
  entry: HistoryEntry;
  
  /** Current total number of history entries */
  totalEntries: number;
  
  /** Whether this entry caused old entries to be pruned */
  entriesPruned: boolean;
}

/**
 * Serializable format for history persistence
 */
export interface SerializableHistoryEntry {
  id: HistoryId;
  timestamp: number;
  type: HistoryEventType;
  stateConfiguration: string[];
  internalState: InternalState;
  event?: SCXMLEvent;
  transition?: Omit<StateTransition, 'error'> & { error?: string };
  duration?: number;
  error?: string;
  metadata: Record<string, unknown>;
  parentId?: HistoryId;
  childIds: HistoryId[];
}

/**
 * Utility function to generate unique history IDs
 */
export function generateHistoryId(): HistoryId {
  return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Utility function to convert HistoryEntry to serializable format
 */
export function serializeHistoryEntry(entry: HistoryEntry): SerializableHistoryEntry {
  const result: SerializableHistoryEntry = {
    id: entry.id,
    timestamp: entry.timestamp,
    type: entry.type,
    stateConfiguration: entry.stateConfiguration,
    internalState: entry.internalState,
    metadata: entry.metadata,
    childIds: entry.childIds,
  };

  // Add optional properties only if they have values
  if (entry.event !== undefined) {
    result.event = entry.event;
  }
  if (entry.transition !== undefined) {
    const serializedTransition: Omit<StateTransition, 'error'> & { error?: string } = {
      id: entry.transition.id,
      timestamp: entry.transition.timestamp,
      sourceState: entry.transition.sourceState,
      targetState: entry.transition.targetState,
      exitedStates: entry.transition.exitedStates,
      enteredStates: entry.transition.enteredStates,
      metadata: entry.transition.metadata,
    };

    if (entry.transition.triggeringEvent !== undefined) {
      serializedTransition.triggeringEvent = entry.transition.triggeringEvent;
    }
    if (entry.transition.duration !== undefined) {
      serializedTransition.duration = entry.transition.duration;
    }
    if (entry.transition.error !== undefined) {
      serializedTransition.error = entry.transition.error.message;
    }

    result.transition = serializedTransition;
  }
  if (entry.duration !== undefined) {
    result.duration = entry.duration;
  }
  if (entry.error !== undefined) {
    result.error = entry.error.message;
  }
  if (entry.parentId !== undefined) {
    result.parentId = entry.parentId;
  }

  return result;
}

/**
 * Utility function to convert serializable format back to HistoryEntry
 */
export function deserializeHistoryEntry(serialized: SerializableHistoryEntry): HistoryEntry {
  const result: HistoryEntry = {
    id: serialized.id,
    timestamp: serialized.timestamp,
    type: serialized.type,
    stateConfiguration: serialized.stateConfiguration,
    internalState: serialized.internalState,
    metadata: serialized.metadata,
    childIds: serialized.childIds,
  };

  // Add optional properties only if they have values
  if (serialized.event !== undefined) {
    result.event = serialized.event;
  }
  if (serialized.transition !== undefined) {
    const deserializedTransition: StateTransition = {
      id: serialized.transition.id,
      timestamp: serialized.transition.timestamp,
      sourceState: serialized.transition.sourceState,
      targetState: serialized.transition.targetState,
      exitedStates: serialized.transition.exitedStates,
      enteredStates: serialized.transition.enteredStates,
      metadata: serialized.transition.metadata,
    };

    if (serialized.transition.triggeringEvent !== undefined) {
      deserializedTransition.triggeringEvent = serialized.transition.triggeringEvent;
    }
    if (serialized.transition.duration !== undefined) {
      deserializedTransition.duration = serialized.transition.duration;
    }
    if (serialized.transition.error !== undefined) {
      deserializedTransition.error = new Error(serialized.transition.error);
    }

    result.transition = deserializedTransition;
  }
  if (serialized.duration !== undefined) {
    result.duration = serialized.duration;
  }
  if (serialized.error !== undefined) {
    result.error = new Error(serialized.error);
  }
  if (serialized.parentId !== undefined) {
    result.parentId = serialized.parentId;
  }

  return result;
}
