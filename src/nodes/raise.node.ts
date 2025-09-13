import z from 'zod';
import { BaseExecutableNode } from '../models/base-executable';
import { EventState } from '../models/internalState';

class RaiseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RaiseError';
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
        throw new Error('RaiseNode must have either event or eventexpr attribute');
      }

      // TODO: Add event to internal event queue
      // For now, we'll just return the unchanged state
      // In a complete implementation, this would:
      // 1. Create an SCXMLEvent with the eventName
      // 2. Add it to the internal event queue
      // 3. The macrostep would then process this event

      console.log(`RaiseNode: Would raise event "${eventName}"`);

      return state;
    } catch (err) {
      const error = new RaiseError((err as Error).message);

      // Per SCXML spec: place error.execution in internal event queue
      throw error;
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