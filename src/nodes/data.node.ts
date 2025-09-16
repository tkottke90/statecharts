import z from 'zod';
import { BaseNode, BaseStateAttr } from '../models/base';
import { CreateFromJsonResponse } from '../models/methods';
import { InternalState } from '../models/internalState';
import { evaluateExpression } from '../parser/expressions.nodejs';

const DataNodeAttr = BaseStateAttr.extend({
  type: z.string().optional().default(''),
  src: z.string().optional(),
  expr: z.string().optional()
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
  expr: string | undefined;

  static label = 'data';
  static schema = DataNodeAttr;

  constructor({ data }: DataNodeType) {
    super(data);
    this.id = data.id;
    this.type = data.type ?? 'text';
    this.src = data.src ?? undefined;
    this.expr = data.expr ?? undefined;
    this.isExecutable = true; // Make DataNode executable so it can be run by DataModelNode
  }

  /**
   * Execute the data node to initialize a data model variable.
   * This is called during data model initialization.
   */
  async run(state: InternalState): Promise<InternalState> {
    let value: unknown;

    // According to SCXML spec: expr, src, and children are mutually exclusive
    if (this.expr) {
      // Evaluate the expression to get the value
      value = evaluateExpression(this.expr, state);
    } else if (this.src) {
      // TODO: Implement loading from external source
      throw new Error('Loading data from external sources (src attribute) is not yet implemented');
    } else {
      // Use child content as the value
      value = this.content;
    }

    return {
      ...state,
      data: {
        ...state.data,
        [this.id]: value
      }
    };
  }

  /**
   * Legacy mount method for backward compatibility.
   * @deprecated Use run() method instead for data model initialization.
   */
  mount(state: InternalState): InternalState {
    let value: unknown;

    // According to SCXML spec: expr, src, and children are mutually exclusive
    if (this.expr) {
      // Evaluate the expression to get the value
      value = evaluateExpression(this.expr, state);
    } else if (this.src) {
      // TODO: Implement loading from external source
      throw new Error('Loading data from external sources (src attribute) is not yet implemented');
    } else {
      // Use child content as the value
      value = this.content;
    }

    return {
      ...state,
      data: {
        ...state.data,
        [this.id]: value
      }
    };
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
