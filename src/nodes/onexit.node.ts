import z from "zod";
import { BaseExecutableNode, BaseExecutableNodeAttr } from "../models/base-executable";
import { InternalState } from "../models/internalState";
import { CreateFromJsonResponse } from "../models/methods";

const OnExitNodeAttr = BaseExecutableNodeAttr;

export type OnExitNodeType = {
  onexit: z.infer<typeof OnExitNodeAttr>;
}

export class OnExitNode extends BaseExecutableNode {
  static label = 'onexit';
  static schema = OnExitNodeAttr;

  constructor({ onexit }: OnExitNodeType) {
    super(onexit);
    this.allowChildren = true; // Enable children execution
  }

  async run(state: InternalState): Promise<InternalState> {
    let nextState = { ...state };

    for await (const { state } of this.executeAllChildren(nextState)) {
      nextState = state;
    }

    return nextState;
  }

  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<OnExitNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }
    
    return {
      success: true,
      node: new OnExitNode({ onexit: data }),
      error: undefined
    }
  }
}