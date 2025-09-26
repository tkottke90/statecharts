import z from 'zod';
import { BaseExecutableNode, BaseExecutableNodeAttr, CreateFromJsonResponse, InternalState } from '../models';
import { evaluateExpression } from '../parser/expressions.nodejs';

const DebugNodeAttr = BaseExecutableNodeAttr.extend({
  cond: z.string().optional().default(''),
});

export type DebugNodeType = {
  debug: z.infer<typeof DebugNodeAttr>;
};

export class DebugNode extends BaseExecutableNode {
  readonly cond: string;

  static label = 'debug';
  static schema = DebugNodeAttr

  constructor({ debug }: DebugNodeType) {
    super(debug);
    this.cond = debug.cond;
  }


  async run(state: InternalState) {

    // If a condition is configured, then only pause if the condition is true.
    if (this.cond && evaluateExpression(this.cond, state)) {
      debugger;
    } else { // If there is no condition, always stop
      debugger;
    }

    return state;
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<DebugNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new DebugNode({ debug: data }),
      error: undefined,
    };
  }
}