import z from 'zod';
import { BaseStateNode, MountResponse } from '../models/base-state';
import {
  InternalState,
  SCXMLEvent,
  addPendingEvent,
  fromJsError,
} from '../models/internalState';
import { CreateFromJsonResponse } from '../models/methods';
import { StateNodeAttr } from './state.node';

const FinalNodeAttr = StateNodeAttr;

export type FinalNodeType = {
  final: z.infer<typeof FinalNodeAttr>;
};

/**
 * Class implementation of the SCXML <final> node.
 *
 * @see https://www.w3.org/TR/scxml/#final
 */
export class FinalNode
  extends BaseStateNode
  implements z.infer<typeof FinalNodeAttr>
{
  readonly id: string;

  static label = 'final';
  static schema = FinalNodeAttr;

  constructor({ final }: FinalNodeType) {
    super(final);
    this.id = final.id;
  }

  async mount(state: InternalState): Promise<MountResponse> {
    try {
      // Call parent mount first
      const { node, state: nextState } = await super.mount(state);

      // Generate done.state.{parent_id} event when entering final state
      const parentId = this.getParentStateId();
      if (parentId) {
        const doneEvent: SCXMLEvent = {
          name: `done.state.${parentId}`,
          type: 'internal',
          sendid: '',
          origin: '',
          origintype: '',
          invokeid: '',
          data: {},
        };

        // Add the done event to pending internal events
        const stateWithEvent = addPendingEvent(nextState, doneEvent);
        return { state: stateWithEvent, node };
      }

      return { state: nextState, node };
    } catch (err) {
      // Handle errors according to SCXML error naming convention
      const errorEvent = fromJsError(err);
      errorEvent.name = 'error.final.mount-failed';
      errorEvent.data.source = 'final';

      const stateWithError = addPendingEvent(state, errorEvent);
      return { state: stateWithError, node: this };
    }
  }

  /**
   * Determines the parent state ID from the current final state's ID.
   * This is used to generate the appropriate done.state.{parent_id} event.
   *
   * @returns The parent state ID, or null if this is a top-level final state
   */
  private getParentStateId(): string | null {
    if (!this.id) {
      return null;
    }

    // Split the state path and remove the last segment to get parent
    const pathSegments = this.id.split('.');
    if (pathSegments.length <= 1) {
      // This is a top-level final state (child of <scxml>)
      // According to SCXML spec, reaching a top-level final state terminates the state machine
      return null;
    }

    // Return the parent state ID
    return pathSegments.slice(0, -1).join('.');
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<FinalNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new FinalNode({ final: data }),
      error: undefined,
    };
  }
}
