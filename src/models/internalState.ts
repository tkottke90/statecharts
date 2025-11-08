/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseNode } from './base';
import { Queue } from './event-queue';

/**
 * Represents an SCXML event as defined by the W3C SCXML specification.
 * Events are one of the basic concepts in SCXML since they drive most transitions.
 *
 * This interface defines the internal structure of events that is accessible via the
 * `_event` system variable during event processing.
 *
 * @see https://www.w3.org/TR/scxml/#InternalStructureofEvents
 */
export interface SCXMLEvent {
  /**
   * The name of the event.
   *
   * This is a character string giving the name of the event. It is what is matched
   * against the 'event' attribute of transitions. Transitions can do additional tests
   * by using the value of this field inside boolean expressions in the 'cond' attribute.
   *
   * Examples: "user.click", "done.state.myState", "error.execution"
   */
  name: string;

  /**
   * The type of the event, indicating its origin.
   *
   * - `"platform"`: Events raised by the platform itself, such as error events
   *   (e.g., error.execution, error.communication, error.platform)
   * - `"internal"`: Events raised by `<raise>` and `<send>` with target '_internal'
   * - `"external"`: All other events, including those from external entities
   */
  type: 'platform' | 'internal' | 'external';

  /**
   * The send identifier of the event.
   *
   * If the sending entity has specified a value for this (via the 'id' or 'idlocation'
   * attribute of `<send>`), this field will contain that value. In the case of error
   * events triggered by a failed attempt to send an event, this field contains the
   * send id of the triggering `<send>` element. Otherwise, this field is left blank (empty string).
   *
   * This can be used to correlate events with their originating send operations.
   */
  sendid: string;

  /**
   * The origin URI of the event.
   *
   * For external events, this is a URI equivalent to the 'target' attribute on the
   * `<send>` element. When used as the value of 'target' in a response `<send>`,
   * it allows the receiver to send a response back to the originating entity via
   * the Event I/O Processor specified in 'origintype'.
   *
   * For internal and platform events, this field is left blank (empty string).
   */
  origin: string;

  /**
   * The origin type of the event.
   *
   * For external events, this is equivalent to the 'type' field on the `<send>` element.
   * When used as the value of 'type' in a response `<send>`, it allows the receiver to
   * send a response back to the originating entity at the URI specified by 'origin'.
   *
   * Common values include "scxml" for the SCXML Event I/O Processor.
   *
   * For internal and platform events, this field is left blank (empty string).
   */
  origintype: string;

  /**
   * The invoke identifier of the event.
   *
   * If this event is generated from an invoked child process (via `<invoke>`),
   * this field contains the invoke id of the invocation that triggered the child process.
   * This is particularly important for events like "done.invoke._id_" which signal
   * that an invoked process has completed.
   *
   * Otherwise, this field is left blank (empty string).
   */
  invokeid: string;

  /**
   * The data payload of the event.
   *
   * This field contains whatever data the sending entity chose to include in this event.
   * The receiving SCXML Processor reformats this data to match its data model, but does
   * not otherwise modify it.
   *
   * Data can be provided via:
   * - The 'namelist' attribute of `<send>` or `<raise>`
   * - `<param>` elements within `<send>` or `<raise>`
   * - `<content>` elements within `<send>` or `<raise>`
   * - External entities sending events to the state machine
   *
   * If the conversion to the data model is not possible, this field is left blank
   * and an 'error.execution' event is placed in the internal event queue.
   */
  data: Record<string, unknown>;
}

const errorMap: Record<string, (node: string) => string> = {
  TypeError: (node: string) => `error.${node}.typeerror`,
};
/**
 * Converts a JS Error into an SCXML Error
 * @param err
 * @returns
 */
export function fromJsError(err: any, node: string = 'scxml'): SCXMLEvent {
  let message = 'Unknown Error';
  let name = 'error.scxml.unknown_error';
  let stack = '';

  if (err instanceof Error || 'name' in err) {
    const nameProp = err!.name as string;

    name = nameProp in errorMap ? errorMap[nameProp]!(node) : err.name;
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
      stack,
    },
  };
}

export function addNodeDetails(event: SCXMLEvent, node: BaseNode) {
  event.data = {
    ...event.data,
    nodeId: node.uuid,
    nodeType: node.label,
  };

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
    ...event,
  };

  const existingEvents = state._pendingInternalEvents ?? [];

  return {
    ...state,
    _pendingInternalEvents: [...existingEvents, newEvent],
  };
}
