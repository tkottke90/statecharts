import * as _ from 'lodash';
import z from 'zod';
import { BaseExecutableNode } from '../models/base-executable';
import { addPendingEvent, fromJsError, InternalState } from '../models/internalState';
import { CreateFromJsonResponse } from '../models/methods';
import { evaluateExpression } from '../parser/expressions.nodejs';

const AssignNodeAttr = BaseExecutableNode.schema.extend({
  location: z.string().min(1), // Required location expression
  expr: z.string().optional()  // Optional expression (mutually exclusive with content)
}).refine(
  (data) => {
    // Must have either expr OR content, but not both
    const hasExpr = data.expr && data.expr.length > 0;
    const hasContent = data.children && data.children.length > 0;
    return hasExpr !== hasContent; // XOR - exactly one must be true
  },
  { message: "Must specify either 'expr' attribute or child content, but not both" }
);

export type AssignNodeType = {
  assign: z.infer<typeof AssignNodeAttr>;
}

export class AssignNode extends BaseExecutableNode {
  readonly location: string;
  readonly expr: string | undefined;

  static label = 'assign';
  static schema = AssignNodeAttr;

  constructor({ assign }: AssignNodeType) {
    super(assign);

    this.location = assign.location;
    this.expr = assign.expr;
  }

  async run(state: InternalState): Promise<InternalState> {
    try {
      if (this.expr) {
        // Evaluate expression to get value
        
        const value = evaluateExpression(this.expr, state);

        return this.assignToLocation(state, this.location, value);
      } else if (this.children.length > 0) {
        // Use child content as value
        const value = this.children.map(child => child.content).join('');
        return this.assignToLocation(state, this.location, value);
      } else {
        return this.assignToLocation(state, this.location, this.content);
      }
    } catch (err) {
      // Create a new error event and push it to the state queue
      const errorEvent = fromJsError(err);
      errorEvent.name = 'error.assign.src-not-implemented'
      errorEvent.data.source = '<assign>'

      return addPendingEvent(state, errorEvent);
    }
  }

  private assignToLocation(state: InternalState, location: string, value: unknown): InternalState {
    // Create a new state with the assignment
    const updatedState = { ...state };
    _.set(updatedState.data, location, value);
    return updatedState;
  }

  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<AssignNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }
    
    return {
      success: true,
      node: new AssignNode({ assign: data }),
      error: undefined
    }
  }
}