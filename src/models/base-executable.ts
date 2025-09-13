import { BaseNode, BaseNodeAttr } from './base';
import { EventState } from './internalState';

export const BaseExecutableNodeAttr = BaseNodeAttr;

export class BaseExecutableNode extends BaseNode {
  isExecutable = true;

  async run(state: EventState): Promise<EventState> {
    return state;
  }
}