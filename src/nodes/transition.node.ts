import z from 'zod';
import { BaseNode, BaseNodeAttr, CreateFromJsonResponse } from '../models';
import { InternalState } from '../models/internalState';

const TransitionNodeAttr = BaseNodeAttr.extend({
  event: z.string().optional().default(''),
  target: z.string().min(1)
})

export type TransitionNodeType = {
    transition: z.infer<typeof TransitionNodeAttr>;
}

/**
 * Class implementation of the SCXML <transition> node.
 * 
 * @see https://www.w3.org/TR/scxml/#transition
 */
export class TransitionNode extends BaseNode implements z.infer<typeof TransitionNodeAttr> {
  readonly event: string;
  readonly target: string;

  static label = 'transition';
  static schema = TransitionNodeAttr;

  constructor({ transition }: TransitionNodeType) {
    super(transition);
    this.event = transition.event;
    this.target = transition.target;
  }

  get isEventLess() {
    return this.event === '';
  }

  get isTargetLess() {
    return this.target === '';
  }

  async run(state: InternalState): Promise<InternalState> {
    return state;
  }

  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<TransitionNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }
    
    return {
      success: true,
      node: new TransitionNode({ transition: data }),
      error: undefined
    }
  }
}