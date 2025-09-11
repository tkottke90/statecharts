import z from 'zod';
import { CreateFromJsonResponse } from '../models';
import { StateNodeAttr } from './state.node';
import { BaseStateNode, MountResponse } from '../models/base-state';

const FinalNodeAttr = StateNodeAttr;

export type FinalNodeType = {
    final: z.infer<typeof FinalNodeAttr>;
}

/**
 * Class implementation of the SCXML <final> node.
 * 
 * @see https://www.w3.org/TR/scxml/#final
 */
export class FinalNode extends BaseStateNode implements z.infer<typeof FinalNodeAttr> {
  readonly id: string;

  static label = 'final';
  static schema = FinalNodeAttr;

  constructor({ final }: FinalNodeType) {
    super(final);
    this.id = final.id;
  }

  mount(state: Record<string, unknown>): MountResponse {
    const { node, state: nextState } = super.mount(state);

    return { state: nextState, node };
  }

  async run(state: Record<string, never>) {
    const nextState = { ...state };

    return nextState;
  }

  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<FinalNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }
    
    return {
      success: true,
      node: new FinalNode({ final: data }),
      error: undefined
    }
  }
}