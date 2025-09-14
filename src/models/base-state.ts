import z from "zod";
import { TransitionNode } from "../nodes/transition.node";
import { BaseNode, BaseNodeAttr } from "./base";
import { InitialNode } from "../nodes/initial.node";
import { InternalState } from "./internalState";

export const BaseStateNodeAttr = BaseNodeAttr.extend({
  id: z.string().min(1),
  initial: z.string().optional()
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

  protected onentry: (state: InternalState) => InternalState = (state) => state;
  protected onexit: (state: InternalState) => InternalState = (state) => state;


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

    const [ initialChild ] = this.getChildrenOfType(InitialNode);

    if (initialChild) {
      return initialChild.content;
    }

    const [ firstChild ] = this.getChildrenOfType<BaseStateNode>(BaseStateNode);

    if (firstChild) {
      return firstChild.id;
    }

    return '';
  }

  /**
   * Utility function for getting all the eventless transitions for the state.
   * Both atomic and compound states can have outgoing transitions.
   * @returns A list of all the eventless child transitions
   */
  getEventlessTransitions() {
    return this.getChildrenOfType(TransitionNode).filter(
      transition => transition.isEventLess
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
   * Triggers the onentry behavior for the state.
   * @param state The current state
   * @returns The new state
   */
  mount(state: InternalState): MountResponse {
    // If we found an Atomic state, we do not not need to look deeper
    if (this.isAtomic) {
      return { state: this.onentry(state), node: this };
    }

    // Check for an initial state - this infers that the state is a compound state
    const initialState = this.initialState;

    // If this is a compound state with a valid initial child state, we should
    // communicate back to the state chart
    if (initialState) {
      return { state, node: this, childPath: initialState };
    }

    return { state, node: this };
  }

  /**
   * Triggers the onexit behavior for the state.
   * @param state The current state
   * @returns The new state
   */
  unmount(state: InternalState): InternalState {
    return this.onexit(state);
  }
}