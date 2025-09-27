import { BaseExecutableNode } from './base-executable';
import { InternalState, addPendingEvent } from './internalState';
import { evaluateExpression } from '../parser/expressions.nodejs';
import { BaseNode } from './base';

/**
 * Abstract base class for all conditional nodes (if, elseif, else)
 *
 * Provides shared functionality for:
 * - Condition evaluation with error handling
 * - Child execution filtering (excludes other conditional nodes)
 * - Consistent error event generation
 * - Template method pattern for subclass customization
 */
export abstract class BaseConditionalNode extends BaseExecutableNode {
  condition?: string;
  allowChildren = true;

  /**
   * Evaluate this node's condition (if it has one)
   *
   * @param state - Current internal state
   * @returns Promise resolving to boolean result and updated state
   *
   * - Returns true if no condition (for ElseNode)
   * - Evaluates expression and returns result
   * - Generates error.execution event on evaluation failure
   */
  async evaluateCondition(
    state: InternalState,
  ): Promise<[boolean, InternalState]> {
    if (!this.condition) {
      return [true, state]; // No condition = always true (for ElseNode)
    }

    let nextState = { ...state };
    try {
      const result = await evaluateExpression(this.condition, nextState);
      // Ensure we return a boolean value
      return [Boolean(result), state];
    } catch (error) {
      // Generate error.execution event for condition evaluation failures
      nextState = addPendingEvent(state, {
        name: 'error.execution',
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: `Condition evaluation failed in ${this.constructor.name}: ${error instanceof Error ? error.message : String(error)}`,
          condition: this.condition,
          node: this.constructor.name,
        },
      });
      return [false, nextState];
    }
  }

  /**
   * Execute this node's direct executable children
   *
   * Filters out other conditional nodes (ElseIfNode, ElseNode) to avoid
   * executing them as regular children - they are handled by the parent IfNode
   *
   * @param state - Current internal state
   * @returns Promise resolving to updated state
   */
  protected async executeOwnChildren(
    state: InternalState,
  ): Promise<InternalState> {
    let currentState = state;

    const executableChildren = this.getExecutableChildren();

    for (const child of executableChildren) {
      if (child instanceof BaseExecutableNode) {
        currentState = await child.run(currentState);
      }
    }

    return currentState;
  }

  /**
   * Get executable children (excluding other conditional nodes)
   *
   * This prevents ElseIfNode and ElseNode from being executed as regular
   * children - they are handled specially by the parent IfNode
   *
   * @returns Array of executable child nodes
   */
  protected getExecutableChildren(): BaseNode[] {
    return this.children.filter(child => {
      // We'll import the conditional node classes in the concrete implementations
      // to avoid circular dependencies. For now, we filter by constructor name.
      const constructorName = child.constructor.name;
      return constructorName !== 'ElseIfNode' && constructorName !== 'ElseNode';
    });
  }

  /**
   * Template method - subclasses implement specific execution logic
   *
   * @param state - Current internal state
   * @returns Promise resolving to updated state
   */
  abstract run(state: InternalState): Promise<InternalState>;

  /**
   * Get a string representation of this conditional node for debugging
   */
  toString(): string {
    const className =
      (this.constructor as typeof BaseNode).label ?? 'conditional';
    const parts = [className];

    if (this.condition) {
      parts.push(`cond="${this.condition}"`);
    }

    return `<${parts.join(' ')}${this.content ? `>${this.content}</${className}>` : '/>'}`;
  }
}
