import z from 'zod';
import { BaseNode, BaseNodeAttr, CreateFromJsonResponse } from '../models';

const InitialNodeAttr = BaseNodeAttr;

export type InitialNodeType = {
  initial: z.infer<typeof InitialNodeAttr>;
}

/**
 * Class implementation of the SCXML <initial> node.  This node is purely
 * informational as a way to notate the initial state of a compound state.
 * 
 * @see https://www.w3.org/TR/scxml/#initial
 * 
 * @example
 * 
 * ```xml
 * <state id="A">
 *   <initial>AB</initial>
 * 
 *    <state id="AA"></state>
 *    <state id="AB"></state>
 * </state>
 * ```
 * 
 * From the above XML configuration, the initial state for A is AB.
 */
export class InitialNode extends BaseNode implements z.infer<typeof InitialNodeAttr> {
  static label = 'initial';
  static schema = InitialNodeAttr;

  constructor({ initial }: InitialNodeType) {
    super(initial);
  }

  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<InitialNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }
    
    return {
      success: true,
      node: new InitialNode({ initial: data }),
      error: undefined
    }
  }
}
