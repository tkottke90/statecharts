import z from 'zod';
import { BaseExecutableNode } from '../models/base-executable';
import { CreateFromJsonResponse } from '../models/methods';
import { addPendingEvent, InternalState } from '../models/internalState';
import { evaluateExpression } from '../parser/expressions.nodejs';
import _ from 'lodash';

const DataNodeAttr = BaseExecutableNode.schema
  .extend({
    id: z.string(),
    type: z.string().optional().default('text'),
    src: z.string().optional(),
    expr: z.string().optional(),
  })
  .check(ctx => {
    const { expr, content, src } = ctx.value;

    const hasExpr = (expr?.length ?? 0) > 0;
    const hasContent = (content?.length ?? 0) > 0;
    const hasSrc = (src?.length ?? 0) > 0;

    const fields = [hasExpr, hasContent, hasSrc];

    // If none of the attributes are populated, we throw an error
    if (!fields.some(Boolean)) {
      ctx.issues.push({
        code: 'custom',
        message: `Must specify exactly one of 'expr', 'src', or child content`,
        input: ctx.value,
        continue: true, // make this issue continuable (default: false)
      });
    }

    if (fields.filter(Boolean).length > 1) {
      ctx.issues.push({
        code: 'custom',
        message: `Only one of 'expr', 'src', or child content may be specified`,
        input: ctx.value,
        continue: true, // make this issue continuable (default: false)
      });
    }
  });

export type DataNodeType = {
  data: z.infer<typeof DataNodeAttr>;
};

/**
 * Class implementation of the SCXML <data> node.
 *
 * @see https://www.w3.org/TR/scxml/#data
 */
export class DataNode
  extends BaseExecutableNode
  implements z.infer<typeof DataNodeAttr>
{
  id: string;
  type: string;
  src: string | undefined;
  expr: string | undefined;
  content: string;

  static label = 'data';
  static schema = DataNodeAttr;

  constructor({ data }: DataNodeType) {
    super(data);
    this.id = data.id;
    this.type = data.type ?? 'text';
    this.src = data.src ?? undefined;
    this.expr = data.expr ?? undefined;
    this.content = data.content ?? '';
  }

  /**
   * Execute the data node to initialize a data model variable.
   * This is called during data model initialization.
   */
  async run(state: InternalState): Promise<InternalState> {
    const nextState = { ...state };
    let value: unknown;

    if (this.expr) {
      // Evaluate the expression to get the value
      value = evaluateExpression(this.expr, state);
    } else if (this.src) {
      // Add a not implemented error event to the queue
      return addPendingEvent(state, {
        name: 'error.data.src-not-implemented',
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: 'The `src` attribute on the data node is not yet available',
          source: 'data',
        },
      });
    } else {
      // Use child content as the value
      value = this.convertToType(this.content);
    }

    _.set(nextState.data, this.id, value);

    return nextState;
  }

  protected convertToType(value: unknown) {
    switch (this.type) {
      case 'json': {
        try {
          return JSON.parse(value as string);
        } catch {
          return {
            json: value,
          };
        }
      }

      case 'text':
        return `${value}`;

      default:
        return value;
    }
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<DataNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new DataNode({ data }),
      error: undefined,
    };
  }
}
