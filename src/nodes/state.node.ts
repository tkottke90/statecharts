import z from 'zod';
import { BaseNodeAttr, CreateFromJsonResponse } from '../models';
import { BaseStateNode } from '../models/base-state';

export const StateNodeAttr = BaseNodeAttr.extend({
  id: z.string().min(1),
  initial: z.string().optional(),
});

export type StateNodeType = {
  state: z.infer<typeof StateNodeAttr>;
};

/**
 * Class implementation of the SCXML <state> node.
 *
 * These notes encapsulate a specific state of the machine.
 *
 * @see https://www.w3.org/TR/scxml/#state
 */
export class StateNode
  extends BaseStateNode
  implements z.infer<typeof StateNodeAttr>
{
  readonly id: string;
  readonly initial: string;

  static readonly label = 'state';
  static readonly schema = StateNodeAttr;

  constructor({ state }: StateNodeType) {
    super(state);
    this.id = state.id;
    this.initial = state.initial ?? '';
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<StateNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    const node = new StateNode({ state: data });

    return {
      node,
      success: true,
      error: undefined,
    };
  }
}
