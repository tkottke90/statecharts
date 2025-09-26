import * as _ from 'lodash';
import z from 'zod';
import { BaseExecutableNode } from '../models/base-executable';
import {
  addNodeDetails,
  addPendingEvent,
  fromJsError,
  InternalState,
} from '../models/internalState';
import { CreateFromJsonResponse } from '../models/methods';
import { evaluateExpression } from '../parser/expressions.nodejs';

const AssignNodeAttr = BaseExecutableNode.schema
  .extend({
    location: z.string().min(1, 'A location is required for the <assign> node'), // Required location expression
    expr: z.string().optional(), // Optional expression (mutually exclusive with content)
    clear: z.union([
      z.coerce.boolean(),
      z.literal(null),
      z.literal(undefined),
      z.enum(['null', 'undefined'])
    ]).pipe(
      z.transform(val => {
        switch(val) {
          case 'null':
            return null;
          case 'undefined':
            return undefined;
          case null:
            return null;
          case undefined:
            return undefined;
          default:
            return Boolean(val);
        }
      })
    ).optional()
  })
  .refine(
    data => {
      // Must have either expr OR content, but not both
      const hasExpr = data.expr && data.expr.length > 0;
      const hasContent = data.children && data.children.length > 0;
      return hasExpr !== hasContent; // XOR - exactly one must be true
    },
    {
      message:
        "Must specify either 'expr' attribute or child content, but not both",
    },
  );

export type AssignNodeType = {
  assign: z.infer<typeof AssignNodeAttr>;
};

export class AssignNode extends BaseExecutableNode {
  readonly location: string;
  readonly expr: string | undefined;
  readonly clear: boolean | null | undefined;

  static label = 'assign';
  static schema = AssignNodeAttr;

  constructor({ assign }: AssignNodeType) {
    super(assign);

    this.location = assign.location;
    this.expr = assign.expr;
    this.clear = assign.clear;
  }

  async run(state: InternalState): Promise<InternalState> {
    // Create a copy of the state that we can mutate
    const nextState = { ...state };

    try {
      // Handle clear operations first (highest priority)
      if (this.clear !== undefined) {
        switch(this.clear) {
          // Set the value to null when the clear property is set to null
          case null:
            return this.assignToLocation(nextState, this.location, null);

          // Delete the property when clear is true
          case true:
            _.unset(nextState, this.location);
            return nextState;

          // Set the value to undefined when clear property is undefined (explicit)
          // Note: this case should only happen when clear is explicitly set to undefined
          case undefined:
            return this.assignToLocation(nextState, this.location, undefined);
        }
      }

      // Evaluate the expression and populate the location
      if (this.expr !== undefined) {
        const value = evaluateExpression(this.expr, nextState);
        return this.assignToLocation(nextState, this.location, value);
      }

      // Populate with the contents children
      if (this.children.length > 0) {
        return this.assignToLocation(
          nextState,
          this.location,
          this.children.map(child => child.content).join('')
        );
      }

      // Populate with the assign nodes content
      return this.assignToLocation(nextState, this.location, this.content);
    } catch (err) {
      // Create a new error event and push it to the state queue
      const error = fromJsError(err);
      error.name = 'error.assign.parsing_error';
      error.data = {
        ...error.data,
        node: this.toString(),
        state: structuredClone(nextState)
      }

      return addPendingEvent(
        state,
        addNodeDetails(error, this)
      );
    }
  }

  private assignToLocation(
    state: InternalState,
    location: string,
    value: unknown,
  ): InternalState {
    // Assign the value to the location in the data model
    _.set(state, location, value);
    return state;
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<AssignNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new AssignNode({ assign: data }),
      error: undefined,
    };
  }
}
