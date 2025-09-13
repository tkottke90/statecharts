import z from 'zod';
import { BaseNodeAttr, BaseNode, CreateFromJsonResponse } from '../models';
import { EventlessState } from '../models/internalState';

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

  async run(state: EventlessState): Promise<EventlessState> {
    let nextState = { ...state };

    for await (const { node, state } of this.executeAllChildren(nextState)) {
      // TODO: Record the state changes

      nextState = state as EventlessState;
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