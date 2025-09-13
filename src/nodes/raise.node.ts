import z from 'zod';
import { BaseExecutableNode } from '../models/base-executable';
import { EventState, SCXMLEvent } from '../models/internalState';
import { BaseSCXMLError } from '../errors';

class RaiseNodeBadAttrError extends BaseSCXMLError {
  constructor(message: string) {
    super(message, 'error.raise.bad-attribute');
  }
}

const RaiseNodeAttr = BaseExecutableNode.schema.extend({
  event: z.string().optional(),     // Event name to raise (mutually exclusive with eventexpr)
  eventexpr: z.string().optional()  // Expression that evaluates to event name (mutually exclusive with event)
}).refine(
  (data) => {
    // Must have exactly one of 'event' or 'eventexpr', but not both
    const hasEvent = data.event && data.event.length > 0;
    const hasEventExpr = data.eventexpr && data.eventexpr.length > 0;
    return hasEvent !== hasEventExpr; // XOR - exactly one must be true
  },
  { message: "Must specify exactly one of 'event' or 'eventexpr' attribute" }
);

export type RaiseNodeType = {
  raise: z.infer<typeof RaiseNodeAttr>;
}

export class RaiseNode extends BaseExecutableNode {
  readonly event: string | undefined;
  readonly eventexpr: string | undefined;

  static label = 'raise';
  static schema = RaiseNodeAttr;

  constructor({ raise }: RaiseNodeType) {
    super(raise);

    this.event = raise.event;
    this.eventexpr = raise.eventexpr;
  }

  async run(state: EventState): Promise<EventState> {
    try {
      let eventName: string;

      if (this.event) {
        // Use static event name
        eventName = this.event;
      } else if (this.eventexpr) {
        // Evaluate expression to get event name
        // TODO: Create Expression Evaluator
        // eventName = this.evaluateExpression(this.eventexpr, state);
        eventName = this.eventexpr; // Temporary - should be evaluated
      } else {
        // We should never get here because the RaiseNodeAttr schema would prevent it.  But we need
        // to appease the type checker.
        throw new RaiseNodeBadAttrError('RaiseNode must have either event or eventexpr attribute');
      }

      // Create the internal event according to SCXML spec
      const eventToRaise: SCXMLEvent = {
        name: eventName,
        type: 'internal',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {}
      };

      // Add the event to the pending internal events list
      const pendingEvents = state._pendingInternalEvents || [];

      return {
        ...state,
        _pendingInternalEvents: [...pendingEvents, eventToRaise]
      };
    } catch (err) {
      // Determine specific error type based on the error message
      const error = BaseSCXMLError.fromCatch(err);

      const errorEvent: SCXMLEvent = {
        name: error.name,
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: error.message,
          source: 'raise'
        }
      };

      const pendingEvents = state._pendingInternalEvents || [];

      return {
        ...state,
        _pendingInternalEvents: [...pendingEvents, errorEvent]
      };
    }
  }

  static createFromJSON(jsonInput: Record<string, unknown>) {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }
    
    return {
      success: true,
      node: new RaiseNode({ raise: data }),
      error: undefined
    }
  }
}