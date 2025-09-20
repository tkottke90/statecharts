import z from 'zod';
import {
  BaseStateNode,
  BaseStateNodeAttr,
  MountResponse,
} from '../models/base-state';
import { InternalState } from '../models/internalState';
import { CreateFromJsonResponse } from '../models';
import { FinalNode } from './final.node';
import { createStatePath } from '../utils/state-path.utils';

const ParallelNodeAttr = BaseStateNodeAttr;
export type ParallelNodeType = {
  parallel: z.infer<typeof ParallelNodeAttr>;
};

/**
 * Class implementation of the SCXML <parallel> node.
 *
 * Parallel states represent a state that has multiple child states that are all active simultaneously.
 * This is fundamentally different from regular compound states where only one child state is active at a time.
 *
 * Key behaviors:
 * - All child states are entered simultaneously when the parallel state is entered
 * - Events are processed by all active child states
 * - The parallel state is "done" when all child states reach final states
 * - Generates done.state.{parallel_id} event when all children are complete
 *
 * @see https://www.w3.org/TR/scxml/#parallel
 */
export class ParallelNode
  extends BaseStateNode
  implements z.infer<typeof ParallelNodeAttr>
{
  static label = 'parallel';
  static schema = ParallelNodeAttr;
  readonly id: string;
  readonly initial: string | undefined;

  constructor({ parallel }: ParallelNodeType) {
    super(parallel);
    this.id = parallel.id;
    this.initial = parallel.initial;
  }

  // Override isAtomic - parallel states are never atomic
  get isAtomic(): boolean {
    return false; // Always compound, even with no children
  }

  // Override initialState - parallel states don't have a single initial state
  get initialState(): string {
    return ''; // All children are "initial" states
  }

  /**
   * Returns an array of initial state paths.  This will
   * look at all state paths and return a list to every
   * initial path within the parallel node
   * 
   * @param prefix The prefix to use for the initial state path
   * @returns The list of initial state paths
   */
  getInitialStateList(prefix: string) {
    const localPrefix = createStatePath(prefix, this.id);
    const initialActiveStateList = [ localPrefix ]

    const childStates = this.buildParallelChildPath()

    // Loop over each child state and initialize
    for (const child of childStates) {
      // Grab the child node out of the child array
      const [ childNode ] = this.getChildState(child);

      // If the child state exists, concat the childs
      if (childNode) {
        initialActiveStateList.push(...childNode.getInitialStateList(localPrefix))
      }
    }

    return initialActiveStateList;
  }

  // Get all child states (all are active simultaneously)
  get activeChildStates(): BaseStateNode[] {
    return this.getChildrenOfType<BaseStateNode>(BaseStateNode);
  }

  /**
   * Override mount behavior for parallel entry.
   * Unlike regular compound states that enter only one initial child,
   * parallel states enter ALL child states simultaneously.
   */
  async mount(state: InternalState): Promise<MountResponse> {
    // Execute onentry actions first (inherited from BaseStateNode)
    let currentState = { ...state };
    const onEntryNodes = this.getOnEntryNodes();

    for (const onEntryNode of onEntryNodes) {
      currentState = await onEntryNode.run(currentState);
    }

    // For parallel states, we signal that ALL children should be entered
    // The StateChart will handle the actual child entry logic
    return {
      state: currentState,
      node: this,
      childPath: this.buildParallelChildPath().join(','),
    };
  }

  /**
   * Builds a special child path indicator for parallel states.
   * This signals to the StateChart that all child states should be entered.
   * Returns a comma-separated list of all child state IDs.
   */
private buildParallelChildPath() {
    const childStates = this.activeChildStates;
    if (childStates.length === 0) {
      return [];
    }

    // Return all child state IDs separated by commas
    // This signals to StateChart that all children should be entered
    return childStates.map(child => child.id);
  }

  /**
   * Checks if all child states are in final states.
   * Used to determine when to generate done.state.{parallel_id} event.
   */
  get isComplete(): boolean {
    const childStates = this.activeChildStates;
    if (childStates.length === 0) {
      return true; // Empty parallel state is considered complete
    }

    // Check if all children have final states as their active descendants
    // This is a simplified check - in a full implementation, we'd need
    // to check the actual active configuration from StateChart
    return childStates.every(child => {
      const finalNodes = child.getChildrenOfType(FinalNode);
      return finalNodes.length > 0;
    });
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<ParallelNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    const node = new ParallelNode({ parallel: data });

    return {
      node,
      success: true,
      error: undefined,
    };
  }
}
