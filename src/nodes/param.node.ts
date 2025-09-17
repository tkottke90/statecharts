import z from 'zod';
import { BaseExecutableNode } from '../models/base-executable';
import { CreateFromJsonResponse } from '../models/methods';
import { InternalState } from '../models/internalState';
import { evaluateExpression } from '../parser/expressions.nodejs';

/**
 * Zod schema for ParamNode attributes
 * 
 * The <param> element is used to pass parameters to external services
 * or other state machine instances. It can specify a parameter name
 * and either an expression to evaluate or literal content.
 */
const ParamNodeAttr = BaseExecutableNode.schema.extend({
  name: z.string().min(1), // Required parameter name
  expr: z.string().optional(), // Optional expression to evaluate
  location: z.string().optional(), // Optional location expression (alternative to expr)
}).refine(
  (data) => {
    // Must have either expr OR location OR content, but not multiple
    const hasExpr = data.expr && data.expr.length > 0;
    const hasLocation = data.location && data.location.length > 0;
    const hasContent = (data.children && data.children.length > 0) || (data.content && data.content.length > 0);

    // Count how many value sources are provided
    const valueSourceCount = [hasExpr, hasLocation, hasContent].filter(Boolean).length;

    // Exactly one value source must be provided
    return valueSourceCount === 1;
  },
  { message: "Must specify exactly one of: 'expr' attribute, 'location' attribute, or child content" }
);

export type ParamNodeType = {
  param: z.infer<typeof ParamNodeAttr>;
};

/**
 * Class implementation of the SCXML <param> node.
 * 
 * The <param> element is used within <send> and <invoke> elements to specify
 * parameters that should be passed to external services or other state machines.
 * 
 * @see https://www.w3.org/TR/scxml/#param
 */
export class ParamNode extends BaseExecutableNode implements z.infer<typeof ParamNodeAttr> {
  readonly name: string;
  readonly expr: string | undefined;
  readonly location: string | undefined;
  readonly content: string;

  static label = 'param';
  static schema = ParamNodeAttr;

  constructor({ param }: ParamNodeType) {
    super(param);
    
    this.name = param.name;
    this.expr = param.expr;
    this.location = param.location;
    this.content = param.content ?? '';
  }

  /**
   * Execute the param node to evaluate its value.
   * 
   * This method evaluates the parameter value based on the specified
   * expression, location, or content, and returns it as part of the
   * state's parameter collection.
   * 
   * Note: Unlike other executable nodes, ParamNode doesn't modify the
   * main state data. Instead, it's typically used by parent nodes
   * (like SendNode) to collect parameter values.
   */
  async run(state: InternalState): Promise<InternalState> {
    // ParamNode execution is typically handled by parent nodes
    // This method is provided for consistency with BaseExecutableNode
    return state;
  }

  /**
   * Evaluate the parameter value in the context of the given state.
   * 
   * This method is called by parent nodes (like SendNode) to get the
   * actual parameter value that should be passed to external services.
   * 
   * @param state - The current internal state
   * @returns The evaluated parameter value
   */
  async evaluateValue(state: InternalState): Promise<unknown> {
    try {
      if (this.expr) {
        // Evaluate the expression to get the value
        return evaluateExpression(this.expr, state);
      } else if (this.location) {
        // Evaluate the location expression to get the value
        return evaluateExpression(this.location, state);
      } else if (this.children.length > 0) {
        // Use child content as the value
        return this.children.map(child => child.content).join('');
      } else {
        // Use direct content as the value
        return this.content;
      }
    } catch (error) {
      // Re-throw with context for better error handling by parent nodes
      throw new Error(`Failed to evaluate param '${this.name}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the parameter name and evaluated value as a key-value pair.
   * 
   * This is a convenience method for parent nodes to easily collect
   * parameter values.
   * 
   * @param state - The current internal state
   * @returns Promise resolving to [name, value] tuple
   */
  async getNameValuePair(state: InternalState): Promise<[string, unknown]> {
    const value = await this.evaluateValue(state);
    return [this.name, value];
  }

  /**
   * Create a ParamNode instance from JSON data.
   * 
   * @param jsonInput - JSON representation of the param element
   * @returns Result containing the created node or validation error
   */
  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<ParamNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new ParamNode({ param: data }),
      error: undefined,
    };
  }
}

/**
 * Utility function to collect parameter values from an array of ParamNode instances.
 * 
 * This function is typically used by parent nodes (like SendNode) to collect
 * all parameter values from their child param elements.
 * 
 * @param paramNodes - Array of ParamNode instances
 * @param state - The current internal state
 * @returns Promise resolving to an object with parameter names as keys and evaluated values as values
 */
export async function collectParamValues(
  paramNodes: ParamNode[], 
  state: InternalState
): Promise<Record<string, unknown>> {
  const params: Record<string, unknown> = {};
  
  for (const paramNode of paramNodes) {
    try {
      const [name, value] = await paramNode.getNameValuePair(state);
      params[name] = value;
    } catch (error) {
      // Re-throw with additional context
      throw new Error(`Failed to collect parameter '${paramNode.name}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return params;
}
