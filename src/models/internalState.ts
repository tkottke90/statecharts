/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseNode } from './base';
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

const errorMap: Record<string, (node: string) => string> = {
  'TypeError': (node: string) => `error.${node}.typeerror`
}
/**
 * Converts a JS Error into an SCXML Error
 * @param err 
 * @returns 
 */
export function fromJsError(err: any, node: string = 'scxml'): SCXMLEvent {
  let message = 'Unknown Error';
  let name = 'error.scxml.unknown_error'
  let stack = ''

  if (err instanceof Error || 'name' in err) {
    const nameProp = err!.name as string;

    name = nameProp in errorMap
      ? errorMap[nameProp]!(node)
      : err.name;
  }

  if (err instanceof Error || 'message' in err) {
    message = err.message;
  }

  if (err instanceof Error || 'stack' in err) {
    stack = err.stack;
  }

  return {
    name: name,
    type: 'platform',
    sendid: '',
    origin: '',
    origintype: '',
    invokeid: '',
    data: {
      message,
      stack
    },
  };
}

export function addNodeDetails(event: SCXMLEvent, node: BaseNode) {
  event.data = {
    ...event.data,
    nodeId: node.uuid,
    nodeType: node.label
  }

  return event;
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
  event: Partial<SCXMLEvent>,
): InternalState {
  const newEvent: SCXMLEvent = {
    name: '',
    type: 'platform',
    sendid: '',
    origin: '',
    origintype: '',
    invokeid: '',
    data: {},
    ...event
  }

  const existingEvents = state._pendingInternalEvents ?? [];

  return {
    ...state,
    _pendingInternalEvents: [...existingEvents, newEvent],
  };
}
