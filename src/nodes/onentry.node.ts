import z from 'zod';
import {
  BaseExecutableNode,
  BaseExecutableNodeAttr,
} from '../models/base-executable';
import { InternalState } from '../models/internalState';
import { CreateFromJsonResponse } from '../models/methods';

const OnEntryNodeAttr = BaseExecutableNodeAttr;

export type OnEntryNodeType = {
  onentry: z.infer<typeof OnEntryNodeAttr>;
};

export class OnEntryNode extends BaseExecutableNode {
  static label = 'onentry';
  static schema = OnEntryNodeAttr;

  constructor({ onentry }: OnEntryNodeType) {
    super(onentry);
    this.allowChildren = true; // Enable children execution
  }

  async run(state: InternalState): Promise<InternalState> {
    let nextState = { ...state };

    for await (const { state } of this.executeAllChildren(nextState)) {
      nextState = state;
    }

    return nextState;
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<OnEntryNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new OnEntryNode({ onentry: data }),
      error: undefined,
    };
  }
}
