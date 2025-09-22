import z from 'zod';
import { BaseNode, BaseNodeAttr } from '../models/base';
import { CreateFromJsonResponse } from '../models/methods';
import { addPendingEvent, InternalState } from '../models/internalState';
import { evaluateExpression } from '../parser/expressions.nodejs';

const TransitionNodeAttr = BaseNodeAttr.extend({
  event: z.string().default('').optional(),
  target: z.string().min(1),
  cond: z.string().optional(),
});

export type TransitionNodeType = {
  transition: z.infer<typeof TransitionNodeAttr>;
};

/**
 * Class implementation of the SCXML <transition> node.
 *
 * @see https://www.w3.org/TR/scxml/#transition
 */
export class TransitionNode
  extends BaseNode
  implements z.infer<typeof TransitionNodeAttr>
{
  readonly event: string | undefined;
  readonly target: string;
  readonly cond: string | undefined;

  allowChildren = true;

  static label = 'transition';
  static schema = TransitionNodeAttr;

  constructor({ transition }: TransitionNodeType) {
    super(transition);
    this.event = transition.event;
    this.target = transition.target;
    this.cond = transition.cond;
  }

  get isEventLess() {
    return this.event === '';
  }

  get isTargetLess() {
    return this.target === '';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTarget(state: InternalState) {
    return this.target;

    // TODO: Figure out how to determine if target is an expression or a literal
    // return evaluateExpression(this.target, state);
  }

  checkCondition(state: InternalState): boolean {
    if (!this.cond) return true;

    try {
      return evaluateExpression(this.cond, state) === true;
    } catch (err) {
      state = addPendingEvent(state, {
        name: 'error.transition.condition-failed',
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: (err as Error).message,
          source: 'transition',
        },
      });

      return false;
    }
  }

  async run(state: InternalState): Promise<InternalState> {
    let currentState = { ...state };

    // Execute all executable content children in document order
    for (const child of this.children) {
      if (child.isExecutable) {
        try {
          // Execute the executable content and update state
          const result = await child.run(currentState);
          currentState = { ...currentState, ...result };
        } catch (error) {
          currentState = addPendingEvent(currentState, {
            name: 'error.transaction.execution-failed',
            type: 'platform',
            sendid: '',
            origin: '',
            origintype: '',
            invokeid: '',
            data: {
              error: (error as Error).message,
              source: 'transition',
            },
          });
        }
      }
    }

    return currentState;
  }

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<TransitionNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new TransitionNode({ transition: data }),
      error: undefined,
    };
  }
}
