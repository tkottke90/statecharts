import { InitialNode } from '../../nodes/initial.node';
import { BaseNode } from '../base';
import { BaseStateNode } from '../base-state';
import { Constructor } from './core';


class InitialStateResolutionError extends Error {
  readonly name = 'InitialStateResolutionError';
}

// This mixin adds a calculateInititalState method, which executes all
// datamodel nodes in the root SCXML node and returns the resulting state:

/**
 * This mixin provides the capability to calculate initial state of a
 * StateChart or StateNode from the configuration of the children which can
 * either be through a `initial` attribute, an `<initial>` node, OR the first
 * child `<state>` node found
 * @param Base
 * @returns
 */
export function CalculateInitialStateMixin<TBase extends Constructor>(
  Base: TBase,
) {
  return class CalculateInititalState extends Base {
    determineInititalState() {
      if ('initial' in this && typeof this.initial === 'string' && this.initial) {
        return this.initial;
      }

      if (this instanceof BaseNode) {
        // Check for <initial> node
        const [initialNode] = this.getChildrenOfType(InitialNode);
        if (initialNode) {
          return initialNode.content;
        }

        // Grab the first state element
        const [firstStateNode] = this.getChildrenOfType(BaseStateNode);
        if (firstStateNode) {
          return firstStateNode.id;
        }
      }

      // Enhanced error message with context
      const nodeType = ('label' in this.constructor && this.constructor?.label) || this.constructor?.name || 'Unknown';
      const nodeId = ('id' in this) ? this.id : 'root';
      const hasInitialAttr = 'initial' in this;
      const initialValue = hasInitialAttr ? this.initial : 'N/A';
      const childStates = (this instanceof BaseNode) 
        ? this.getChildrenOfType(BaseStateNode).map(s => s.id)
        : [];

      throw new InitialStateResolutionError(
        `Could not determine initial state for node '${nodeId}'\n\n` +
        `Details:\n` +
        `- Node type: ${nodeType}\n` +
        `- Has 'initial' attribute: ${hasInitialAttr}\n` +
        `- Initial attribute value: "${initialValue}"\n` +
        `- Number of child states: ${childStates.length}\n` +
        `- Child state IDs: [${childStates.map(id => `"${id}"`).join(', ')}]\n\n` +
        `Possible causes:\n` +
        `1. The 'initial' attribute references a non-existent child state\n` +
        `2. The node has no child states and no <initial> element\n` +
        `3. The node's children haven't been parsed yet\n\n` +
        `Suggestion: ${hasInitialAttr 
          ? `Verify that initial="${initialValue}" matches a child <state id="${initialValue}">`
          : `Add an 'initial' attribute or <initial> child element`}\n\n` +
        `For more information, see: https://www.w3.org/TR/scxml/#initial`
      );
    }
  };
}
