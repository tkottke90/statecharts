
export interface SCXMLEvent {
  name: string;
  type: 'platform' | 'internal' | 'external';
  sendid: string;
  origin: string;
  origintype: string;
  invokeid: string;
  data: Record<string, unknown>;
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
  data: Record<string, unknown>;

  // Event context (optional - only present during event processing)
  _event?: SCXMLEvent;

  // Pending events (optional - used for event generation by executable content)
  _pendingInternalEvents?: SCXMLEvent[];
}

// Legacy type aliases for backward compatibility during migration
// TODO: Remove these once all code is updated to use InternalState
export type EventlessState = InternalState;
export type EventState = InternalState & { _event: SCXMLEvent };

/**
 * Helper function to set event context in state during event processing
 */
export function withEventContext(state: InternalState, event: SCXMLEvent): InternalState {
  return {
    ...state,
    _event: event,
    _pendingInternalEvents: state._pendingInternalEvents || []
  };
}

/**
 * Helper function to clear event context from state after event processing
 */
export function clearEventContext(state: InternalState): InternalState {
  const { _event, ...stateWithoutEvent } = state;
  return stateWithoutEvent;
}

/**
 * Helper function to safely add events to the pending internal events queue
 */
export function addPendingEvent(state: InternalState, event: SCXMLEvent): InternalState {
  return {
    ...state,
    _pendingInternalEvents: [...(state._pendingInternalEvents || []), event]
  };
}

/**
 * Helper function to safely add multiple events to the pending internal events queue
 */
export function addPendingEvents(state: InternalState, events: SCXMLEvent[]): InternalState {
  return {
    ...state,
    _pendingInternalEvents: [...(state._pendingInternalEvents || []), ...events]
  };
}

/**
 * Helper function to extract and clear pending internal events from state
 */
export function extractPendingEvents(state: InternalState): { state: InternalState; events: SCXMLEvent[] } {
  const events = state._pendingInternalEvents || [];
  const { _pendingInternalEvents, ...stateWithoutPending } = state;
  return {
    state: stateWithoutPending,
    events
  };
}

// Legacy conversion functions for backward compatibility during migration
// TODO: Remove these once all code is updated to use InternalState directly

/**
 * @deprecated Use withEventContext() instead
 * Converts an EventlessState to an EventState by adding the _event property
 */
export function toEventState(eventlessState: EventlessState, event: SCXMLEvent): EventState {
  return withEventContext(eventlessState, event) as EventState;
}

/**
 * @deprecated Use clearEventContext() instead
 * Converts an EventState to an EventlessState by removing the _event property
 */
export function toEventlessState(eventState: EventState): EventlessState {
  return clearEventContext(eventState);
}