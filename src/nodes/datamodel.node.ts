import z from 'zod';
import { BaseNode, BaseNodeAttr } from '../models/base';
import { CreateFromJsonResponse } from '../models/methods';
import { InternalState } from '../models/internalState';

export type DataModelNodeType = {
    datamodel: z.infer<typeof BaseNodeAttr>;
}

/**
 * Class implementation of the SCXML <datamodel> node.
 * 
 * @see https://www.w3.org/TR/scxml/#datamodel
 */
export class DataModelNode extends BaseNode implements z.infer<typeof BaseNodeAttr> {

  static label = 'datamodel';
  static schema = BaseNodeAttr;

  constructor({ datamodel }: DataModelNodeType) {
    super(datamodel);
    this.allowChildren = true;
  }

  async run(state: InternalState): Promise<InternalState> {
    let nextState = { ...state };

    for await (const { state } of this.executeAllChildren(nextState)) {
      // TODO: Record the state changes

      nextState = state as InternalState;
    }

    return nextState;
  }

  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<DataModelNode>{
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }
    
    return {
      success: true,
      node: new DataModelNode({ datamodel: data }),
      error: undefined
    }
  }
}