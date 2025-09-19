import z from 'zod';
import { TransitionNode } from '../nodes/transition.node';
import { BaseNode, BaseNodeAttr } from './base';
import { InitialNode } from '../nodes/initial.node';
import { InternalState } from './internalState';
import { OnEntryNode } from '../nodes/onentry.node';
import { OnExitNode } from '../nodes/onexit.node';
import { DataModelNode } from '../nodes/datamodel.node';

export const BaseStateNodeAttr = BaseNodeAttr.extend({
  id: z.string().min(1),
  initial: z.string().optional(),
});

export type StateNodeType = {
  state: z.infer<typeof BaseStateNodeAttr>;
};

export interface MountResponse {
  state: InternalState;
  node: BaseStateNode;
  childPath?: string;
}

export class BaseStateNode extends BaseNode {
  allowChildren = true;
  readonly id: string = '';
  readonly initial: string | undefined;

  /**
   * Identifies if the state is atomic (has no child states) or not.
   */
  get isAtomic() {
    return this.getChildrenOfType(BaseStateNode).length === 0;
  }

  /**
   * Identifies the initial child state for the state node.
   */
  get initialState() {
    if (this.initial) {
      return this.initial;
    }

    const [initialChild] = this.getChildrenOfType(InitialNode);

    if (initialChild) {
      return initialChild.content;
    }

    const [firstChild] = this.getChildrenOfType<BaseStateNode>(BaseStateNode);

    if (firstChild) {
      return firstChild.id;
    }

    return '';
  }

  /**
   * Utility function for getting all transitions for the state.
   * Both atomic and compound states can have outgoing transitions.
   * @returns A list of all child transitions
   */
  getTransitions() {
    return this.getChildrenOfType(TransitionNode);
  }

  /**
   * Utility function for getting all the eventless transitions for the state.
   * Both atomic and compound states can have outgoing transitions.
   * @returns A list of all the eventless child transitions
   */
  getEventlessTransitions() {
    return this.getChildrenOfType(TransitionNode).filter(
      transition => transition.isEventLess,
    );
  }

  /**
   * Utility function for getting child states.
   * @returns A list of all the child states
   */
  getChildState(id?: string) {
    if (this.isAtomic) {
      return [];
    }

    const childStates = this.getChildrenOfType<BaseStateNode>(BaseStateNode);

    if (id) {
      return childStates.find(child => child.id === id);
    }

    return childStates;
  }

  /**
   * Utility function for getting all onentry nodes for the state.
   * @returns A list of all onentry nodes
   */
  getOnEntryNodes() {
    return this.children.filter(child => {
      if (child instanceof OnEntryNode && child.hasExecutableChildren) {
        return true;
      }
      return false;
    });
  }

  /**
   * Utility function for getting all onexit nodes for the state.
   * @returns A list of all onexit nodes
   */
  getOnExitNodes() {
    return this.children.filter(child => {
      if (child instanceof OnExitNode && child.hasExecutableChildren) {
        return true;
      }
      return false;
    });
  }

  /**
   * Utility function for getting all datamodel nodes for the state.
   * These define local data variables that are initialized when the state is entered.
   * @returns A list of all datamodel nodes
   */
  getDataModelNodes() {
    return this.getChildrenOfType(DataModelNode);
  }

  /**
   * Triggers the state entry behavior according to SCXML specification.
   *
   * Per SCXML spec, when a state is entered:
   * 1. First, process any local <datamodel> elements (initialize local data)
   * 2. Then, execute <onentry> actions (which can reference the local data)
   * 3. Finally, determine initial child state (if compound state)
   *
   * @param state The current state
   * @returns The new state with mount response
   */
  async mount(state: InternalState): Promise<MountResponse> {
    let currentState = { ...state };

    // STEP 1: Process local datamodel nodes first (SCXML spec requirement)
    const dataModelNodes = this.getDataModelNodes();
    for (const dataModelNode of dataModelNodes) {
      currentState = await dataModelNode.run(currentState);
    }

    // STEP 2: Execute onentry nodes in document order (can now reference local data)
    const onEntryNodes = this.getOnEntryNodes();
    for (const onEntryNode of onEntryNodes) {
      currentState = await onEntryNode.run(currentState);
    }

    // STEP 3: Handle child state logic for compound states
    if (this.isAtomic) {
      return { state: currentState, node: this };
    }

    // Check for an initial state - this infers that the state is a compound state
    const initialState = this.initialState;

    // If this is a compound state with a valid initial child state, we should
    // communicate back to the state chart
    if (initialState) {
      return { state: currentState, node: this, childPath: initialState };
    }

    // If this is an atomic state, we are done
    return { state: currentState, node: this };
  }

  /**
   * Triggers the onexit behavior for the state.
   * Executes all OnExitNode instances in document order.
   * @param state The current state
   * @returns The new state
   */
  async unmount(state: InternalState): Promise<InternalState> {
    // Execute all onexit nodes in document order
    let currentState = { ...state };
    const onExitNodes = this.getOnExitNodes();

    for (const onExitNode of onExitNodes) {
      currentState = await onExitNode.run(currentState);
    }

    return currentState;
  }
}
