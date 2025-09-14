import { BaseNode, BaseNodeAttr } from './base';
import { InternalState } from './internalState';

export const BaseExecutableNodeAttr = BaseNodeAttr;

export class BaseExecutableNode extends BaseNode {
  isExecutable = true;

  async run(state: InternalState): Promise<InternalState> {
    return state;
  }
}