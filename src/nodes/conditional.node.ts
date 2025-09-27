import { z } from 'zod';
import { BaseConditionalNode } from '../models/base-conditional';
import { InternalState } from '../models/internalState';
import { CreateFromJsonResponse } from '../models/methods';
import { BaseExecutableNodeAttr } from '../models';

// Schema definitions for conditional nodes
const IfNodeAttr = BaseExecutableNodeAttr.extend({
  cond: z.string().min(1, 'If condition cannot be empty'),
});

const ElseIfNodeAttr = BaseExecutableNodeAttr.extend({
  cond: z.string().min(1, 'ElseIf condition cannot be empty'),
});

const ElseNodeAttr = BaseExecutableNodeAttr.extend({
  // ElseNode has no attributes - it's always the fallback
});

export type IfNodeType = { if: z.infer<typeof IfNodeAttr> };
export type ElseIfNodeType = { elseif: z.infer<typeof ElseIfNodeAttr> };
export type ElseNodeType = { else: z.infer<typeof ElseNodeAttr> };

/**
 * IfNode - Main conditional container that orchestrates execution
 *
 * Execution flow:
 * 1. Evaluate own condition - if true, execute own children
 * 2. If false, check each ElseIfNode child in document order
 * 3. If no ElseIf matches, execute ElseNode child (if present)
 * 4. If no conditions match and no else, do nothing
 */
export class IfNode extends BaseConditionalNode {
  static label = 'if';

  constructor({ if: ifConfig }: IfNodeType) {
    super(ifConfig);

    this.condition = ifConfig.cond;
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<IfNode> {
    const { success, data, error } = IfNodeAttr.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return {
        success: false,
        node: undefined,
        error,
      };
    }

    return {
      success: true,
      node: new IfNode({ if: data }),
      error: undefined,
    };
  }

  async run(state: InternalState): Promise<InternalState> {
    let nextState = { ...state };

    // Check own condition first
    const [success, stateAfterEval] = await this.evaluateCondition(nextState);
    nextState = stateAfterEval;

    if (success) {
      nextState = await this.executeOwnChildren(nextState);
    } else {
      // Collect all the Else If and Else nodes.  Then sort them so that
      // we can process them in order.  If there was an else node before
      // and else-if node, then we should update the sorting
      const boundaryChildren = this.children
        .filter(child => {
          return child instanceof ElseIfNode || child instanceof ElseNode;
        })
        .sort((childA, childB) => {
          const aIsElse = childA instanceof ElseNode ? 0 : 1;
          const bIsElse = childB instanceof ElseNode ? 0 : 1;

          return bIsElse - aIsElse;
        });

      // Go through the boundary children and evaluate if any of them
      // match the condition, return the first one that does and it's
      // result.
      for (const child of boundaryChildren) {
        const [success, stateAfterChildEval] =
          await child.evaluateCondition(nextState);
        nextState = stateAfterChildEval;

        if (success) {
          nextState = await child.run(nextState);

          break;
        }
      }
    }

    // No conditions matched and no else clause
    return nextState;
  }
}

/**
 * ElseIfNode - Additional conditional branch within an IfNode
 *
 * Execution is controlled by parent IfNode - this node's run method
 * is called directly by the parent when its condition needs evaluation
 */
export class ElseIfNode extends BaseConditionalNode {
  static label = 'elseif';

  constructor({ elseif: elseifConfig }: ElseIfNodeType) {
    super(elseifConfig);
    this.condition = elseifConfig.cond;
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<ElseIfNode> {
    const { success, data, error } = ElseIfNodeAttr.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return {
        success: false,
        node: undefined,
        error,
      };
    }

    return {
      success: true,
      node: new ElseIfNode({ elseif: data }),
      error: undefined,
    };
  }

  async run(state: InternalState): Promise<InternalState> {
    // ElseIfNode execution is typically handled by parent IfNode
    // This method is here for completeness and direct testing

    const [success, nextState] = await this.evaluateCondition(state);
    if (success) {
      return await this.executeOwnChildren(nextState);
    }
    return nextState;
  }
}

/**
 * ElseNode - Fallback branch that executes when no conditions match
 *
 * Has no condition - always executes its children when called
 * Execution is controlled by parent IfNode
 */
export class ElseNode extends BaseConditionalNode {
  static label = 'else';

  constructor({ else: elseConfig }: ElseNodeType) {
    super(elseConfig);
    // ElseNode always executes
    this.condition = 'true';
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<ElseNode> {
    const { success, data, error } = ElseNodeAttr.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return {
        success: false,
        node: undefined,
        error,
      };
    }

    return {
      success: true,
      node: new ElseNode({ else: data }),
      error: undefined,
    };
  }

  async run(state: InternalState): Promise<InternalState> {
    // ElseNode execution is typically handled by parent IfNode
    // Always execute children when called (no condition to check)
    return await this.executeOwnChildren(state);
  }

  /**
   * Override evaluateCondition to always return true
   * ElseNode has no condition and should always execute when reached
   */
  async evaluateCondition(
    state: InternalState,
  ): Promise<[boolean, InternalState]> {
    return [true, state];
  }
}
