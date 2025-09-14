import z from 'zod';
import { InternalState } from './internalState';

export const BaseNodeAttr = z.object({
  content: z.string().optional().default(''),
  children: z.array(z.any()).default([])
})

export type Node = {
  [key: string]: z.infer<typeof BaseNodeAttr>
}

export const BaseStateAttr = BaseNodeAttr.extend({
  id: z.string().min(1)
})

export const BaseTransitionAttr = BaseNodeAttr.extend({
  event: z.string().optional().default(''),
  target: z.string().min(1)
})

export class BaseNode implements z.infer<typeof BaseNodeAttr> {
  isExecutable = false;
  allowChildren: boolean = false;

  children: BaseNode[] = [];
  content: string;

  static label = 'base';
  static schema = BaseNodeAttr;

  constructor({ content, children }: z.infer<typeof BaseNodeAttr>) {
    this.content = content;
    this.children = children;
  }

  get label() {
    return Object.getPrototypeOf(this).constructor.label;
  }

  /**
   * Helper function for nodes that execute all the children
   * sequentially.
   * @param state
   * @returns
   */
  async * executeAllChildren(state: InternalState) {
    if (!this.allowChildren) {
      return state;
    }

    // Clone state for internal use
    let internalState = { ...state };

    for (const child of this.children) {
      internalState = await child.run(internalState);

      yield {
        node: Object.getPrototypeOf(child).constructor.name ?? 'Node',
        state: internalState
      };
    }

    return internalState;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getChildrenOfType<T extends BaseNode>(typeCtor: new (...args: any[]) => T): T[] {
    return this.children.filter(child => child instanceof typeCtor) as T[];
  }
  
  /**
   * Trigger the node's behavior and return the new state
   * @param state The current state
   * @returns The new state
   */
  async run(state: InternalState): Promise<InternalState> {
    return state;
  }

  static get name() {
    return Object.getPrototypeOf(this).constructor.label;
  }

  static getAttributes(key: string, jsonInput: Record<string, unknown>) {
    if (key in jsonInput) {
      return jsonInput[key];
    }

    return jsonInput;
  }
}