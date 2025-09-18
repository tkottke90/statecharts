import z from 'zod';
import { InternalState } from './internalState';

export const BaseNodeAttr = z.object({
  content: z.string().optional().default(''),
  children: z.array(z.any()).default([]),
});

export type Node = {
  [key: string]: z.infer<typeof BaseNodeAttr>;
};

export const BaseStateAttr = BaseNodeAttr.extend({
  id: z.string().min(1),
});

export const BaseTransitionAttr = BaseNodeAttr.extend({
  event: z.string().optional().default(''),
  target: z.string().min(1),
});

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
  async *executeAllChildren(state: InternalState) {
    if (!this.allowChildren) {
      return state;
    }

    // Clone state for internal use
    let internalState = { ...state };

    for (const child of this.children.filter(child => child.isExecutable)) {
      internalState = await child.run(internalState);

      yield {
        node: Object.getPrototypeOf(child).constructor.name ?? 'Node',
        state: internalState,
      };
    }

    return internalState;
  }

   
  getChildrenOfType<T extends BaseNode>(
    typeCtor: new (...args: any[]) => T,
  ): T[] {
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

  /**
   * Get a string representation of this node for debugging
   * Subclasses can override this method to provide more specific information
   */
  toString(): string {
    const className = (this.constructor as typeof BaseNode).label ?? 'node';
    const parts = [className];

    // We use destructuring here to extract all of the node class properties
    // that would not show up in the XML.  These are either inferred (such as allowChildren)
    // or show up inside of the XML tags (aka content)

    const { content, ...attr } = this;

    // We combine the attribute syntax with the tag/label
    const attributes = parts.concat(
      Object.entries(attr)
        .filter(([key]) => ![ 'isExecutable', 'allowChildren', 'children' ].includes(key))
        .filter(([,value]) => value !== undefined)
        .map(([key, value]) => `${key}="${value}"`)
    );

    // We create an XML string from the attributes and content
    return `<${attributes.join(' ')}${content ? `>${content}</${className}>` : '/>'}`;
  }
}
