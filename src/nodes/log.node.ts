import { z } from 'zod';
import { BaseExecutableNode } from '../models/base-executable';
import { InternalState } from '../models/internalState';
import { CreateFromJsonResponse } from '../models/methods';
import { evaluateExpression } from '../parser/expressions.nodejs';

/**
 * Zod schema for LogNode attributes
 */
const LogNodeAttr = BaseExecutableNode.schema.extend({
  label: z.string().optional(),
  expr: z.string().optional(),
});

export type LogNodeAttributes = z.infer<typeof LogNodeAttr>;

export type LogNodeType = {
  log: LogNodeAttributes;
};

/**
 * LogNode represents the SCXML `<log>` element for debugging output.
 * 
 * The `<log>` element is used to generate logging output for debugging purposes.
 * It can log either the result of an expression evaluation or literal text content.
 * 
 * @example
 * ```xml
 * <!-- Expression logging -->
 * <log label="Debug" expr="'Current state: ' + _name + ', counter: ' + data.counter"/>
 * 
 * <!-- Literal content logging -->
 * <log label="Info">State machine started</log>
 * 
 * <!-- Simple expression -->
 * <log expr="'Processing complete: ' + data.results.length + ' items'"/>
 * ```
 */
export class LogNode extends BaseExecutableNode {
  /**
   * Optional label for categorizing log messages
   */
  public readonly logLabel: string | undefined;

  /**
   * Optional expression to evaluate and log
   */
  public readonly expr: string | undefined;

  static label = 'log';
  static schema = LogNodeAttr;

  constructor({ log }: LogNodeType) {
    super(log);
    this.logLabel = log.label;
    this.expr = log.expr;
  }

  /**
   * Create a LogNode from JSON representation
   */
  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<LogNode> {
    const attributes = this.getAttributes(this.label, jsonInput) as Record<string, unknown>;

    // Validate that either expr or content is provided
    // We check the original attributes before schema processing to detect explicit content
    const hasExpr = 'expr' in attributes && typeof attributes.expr === 'string' && attributes.expr.length > 0;
    const hasExplicitContent = 'content' in attributes;

    if (!hasExpr && !hasExplicitContent) {
      return {
        success: false,
        node: undefined,
        error: new Error("Either 'expr' attribute or text content must be provided")
      };
    }

    const { success, data, error } = this.schema.safeParse(attributes);

    if (!success) {
      return {
        success: false,
        node: undefined,
        error: new Error(`LogNode validation failed: ${error.message}`)
      };
    }

    try {
      const node = new LogNode({ log: data });
      return { success: true, node, error: undefined };
    } catch (constructorError) {
      return {
        success: false,
        node: undefined,
        error: constructorError instanceof Error ? constructorError : new Error(String(constructorError))
      };
    }
  }

  /**
   * Execute the log node to output debugging information.
   * 
   * This method evaluates the expression (if provided) or uses the text content,
   * formats the log message with the label (if provided), and outputs it.
   * The state is returned unchanged as logging is a side-effect operation.
   * 
   * @param state - Current internal state of the state machine
   * @returns Promise resolving to the unchanged state
   */
  async run(state: InternalState): Promise<InternalState> {
    try {
      let logMessage: string;

      // Determine what to log
      if (this.expr) {
        // Evaluate expression and convert result to string
        const result = await evaluateExpression(this.expr, state);
        logMessage = this.formatLogValue(result);
      } else if (this.content !== undefined) {
        // Use literal text content (including empty string)
        logMessage = this.content.trim();
      } else {
        // This should not happen due to schema validation, but handle gracefully
        logMessage = '[No content to log]';
      }

      // Format the complete log message
      const formattedMessage = this.formatLogMessage(logMessage);

      // Output the log message
      this.outputLog(formattedMessage);

      // Return state unchanged (logging is a side-effect)
      return state;

    } catch (error) {
      // Log the error but don't throw - logging failures shouldn't break execution
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputLog(`[LOG ERROR] Failed to log: ${errorMessage}`);
      return state;
    }
  }

  /**
   * Format a value for logging output
   * 
   * @param value - The value to format
   * @returns Formatted string representation
   */
  private formatLogValue(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (value === undefined) {
      return 'undefined';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '[Object - cannot stringify]';
      }
    }
    return String(value);
  }

  /**
   * Format the complete log message with label if provided
   * 
   * @param message - The core message to log
   * @returns Formatted log message
   */
  private formatLogMessage(message: string): string {
    const timestamp = new Date().toISOString();

    if (this.logLabel) {
      return `[${timestamp}] [${this.logLabel}] ${message}`;
    } else {
      return `[${timestamp}] ${message}`;
    }
  }

  /**
   * Output the log message to the appropriate destination
   * 
   * By default, this outputs to console.log, but can be overridden
   * for custom logging implementations.
   * 
   * @param message - The formatted message to output
   */
  protected outputLog(message: string): void {
    console.log(message);
  }

  /**
   * Get a string representation of this node for debugging
   */
  toString(): string {
    const parts = ['LogNode'];

    if (this.logLabel) {
      parts.push(`label="${this.logLabel}"`);
    }

    if (this.expr) {
      parts.push(`expr="${this.expr}"`);
    } else if (this.content) {
      parts.push(`content="${this.content.substring(0, 50)}${this.content.length > 50 ? '...' : ''}"`);
    }

    return `<${parts.join(' ')}>`;
  }
}
