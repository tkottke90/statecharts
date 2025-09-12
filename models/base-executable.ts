import { BaseNode, BaseNodeAttr } from './base';

export const BaseExecutableNodeAttr = BaseNodeAttr;

export class BaseExecutableNode extends BaseNode {
  isExecutable = true;

  async run(state: Record<string, never>) {
    return state;
  }
}