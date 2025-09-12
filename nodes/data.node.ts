import z from 'zod';
import { BaseNode, BaseStateAttr, CreateFromJsonResponse } from '../models';

const DataNodeAttr = BaseStateAttr.extend({
  type: z.string().optional().default(''),
  src: z.string().optional()
})

export type DataNodeType = {
    data: z.infer<typeof DataNodeAttr>;
}

/**
 * Class implementation of the SCXML <data> node.
 * 
 * @see https://www.w3.org/TR/scxml/#data
 */
export class DataNode extends BaseNode implements z.infer<typeof DataNodeAttr> {
  id: string;
  type: string;
  src: string | undefined;

  static label = 'data';
  static schema = DataNodeAttr;

  constructor({ data }: DataNodeType) {
    super(data);
    this.id = data.id;
    this.type = data.type ?? 'text';
    this.src = data.src ?? undefined;
  }

  mount(state: Record<string, never>){
    return {
      ...state,
      [this.id]: this.content
    } as unknown as Record<string, never>;
  }

  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<DataNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }
    
    return {
      success: true,
      node: new DataNode({ data }),
      error: undefined
    }
  }
}
