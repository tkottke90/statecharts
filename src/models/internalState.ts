
export interface SCXMLEvent {
  name: string;
  type: 'platform' | 'internal' | 'external';
  sendid: string;
  origin: string;
  origintype: string;
  invokeid: string;
  data: Record<string, unknown>;
}

export interface BaseInternalState {
  _name?: string;
  _sessionId?: string;
  data: Record<string, unknown>;
}

export type EventlessState = BaseInternalState & {};

export interface EventState extends BaseInternalState {
  _event: SCXMLEvent;
  _pendingInternalEvents?: SCXMLEvent[];
}

/**
 * Converts an EventlessState to an EventState by adding the _event property
 */
export function toEventState(eventlessState: EventlessState, event: SCXMLEvent): EventState {
  return {
    ...eventlessState,
    _event: event,
    _pendingInternalEvents: []
  };
}

/**
 * Converts an EventState to an EventlessState by removing the _event property
 */
export function toEventlessState(eventState: EventState): EventlessState {
  const { _event, _pendingInternalEvents, ...eventlessState } = eventState;
  return eventlessState;
}