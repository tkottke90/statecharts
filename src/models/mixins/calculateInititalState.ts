import { InitialNode } from '../../nodes/initial.node';
import { BaseNode } from '../base';
import { BaseStateNode } from '../base-state';
import { Constructor } from './core';

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
      if (this instanceof BaseStateNode && this.initial) {
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

      throw new Error(
        'Could not identify an initial state from the provided configuration',
      );
    }
  };
}
