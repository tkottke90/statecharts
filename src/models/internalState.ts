
export interface SCXMLEvent {
  name: string;
  type: 'platform' | 'internal' | 'external';
  sendid: string;
  origin: string;
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
}

/**
 * Converts an EventlessState to an EventState by adding the _event property
 */
export function toEventState(eventlessState: EventlessState, event: SCXMLEvent): EventState {
  return {
    ...eventlessState,
    _event: event
  };
}

/**
 * Converts an EventState to an EventlessState by removing the _event property
 */
export function toEventlessState(eventState: EventState): EventlessState {
  const { _event, ...eventlessState } = eventState;
  return eventlessState;
}