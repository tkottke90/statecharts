import { Queue } from './event-queue';

export interface SCXMLEvent {
  name: string;
  type: 'platform' | 'internal' | 'external';
  sendid: string;
  origin: string;
  origintype: string;
  invokeid: string;
  data: Record<string, unknown>;
}

export function fromJsError(err: unknown): SCXMLEvent {
  let message = 'Unknown Error';

  if (err instanceof Error) {
    message = err.message;
  }

  return {
    name: '',
    type: 'platform',
    sendid: '',
    origin: '',
    origintype: '',
    invokeid: '',
    data: {
      error: message,
    },
  };
}

/**
 * Unified internal state interface that replaces both EventlessState and EventState.
 * This interface contains all possible state information and uses optional properties
 * to handle different execution contexts.
 */
export interface InternalState {
  // System variables (always present)
  _name?: string;
  _sessionId?: string;
  _datamodel?: string;
  data: Record<string, unknown>;

  // Event context (optional - only present during event processing)
  _event?: SCXMLEvent;

  // Pending events (optional - used for event generation by executable content)
  _pendingInternalEvents?: SCXMLEvent[];
}

export type EventState = InternalState & { _event: SCXMLEvent };

export function processPendingEvents(
  state: InternalState,
  queue: Queue<SCXMLEvent>,
): void {
  if (state._pendingInternalEvents) {
    state._pendingInternalEvents.forEach(event => {
      queue.enqueue(event);
    });
    delete state._pendingInternalEvents;
  }
}

/**
 * Helper function to safely add events to the pending internal events queue
 */
export function addPendingEvent(
  state: InternalState,
  event: SCXMLEvent,
): InternalState {
  return {
    ...state,
    _pendingInternalEvents: [...(state._pendingInternalEvents || []), event],
  };
}
