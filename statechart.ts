import { BaseNode } from "./models";
import SimpleXML from 'simple-xml-to-json';
import { parse } from "./parser";
import { BaseStateNode, MountResponse } from "./models/base-state";
import { TransitionNode } from "./nodes";

type Tuple<T> = Array<[string, T]>;

interface StateChartOptions {
  abort?: AbortController;
  timeout?: number;
}

export class StateChart {
  private states: Map<string, BaseStateNode> = new Map();
  private activeStateChain: Tuple<BaseStateNode> = [];
  private activeStates: Set<string> = new Set();

  constructor(
    private readonly initial: string,
    private readonly nodes: Map<string, BaseNode>
  ) {}

  calculateExitStatues(transitions: TransitionNode[]) {
    // Create a set representing the active state
    const states = new Set<string>();

    // Individual nodes are kept track of by their full path
    //   Ex:
    //     - scxml.healthSystem.healthy
    //     - scxml.agent.toolCall
    //
    // We look 
    this.activeStateChain.forEach(([id]) => {
      id.split('.').forEach(states.add);
    });

    const statesToExit = new Set<string>();

    for (const transition of transitions) {
      if (transition.isTargetLess) {
        continue;
      }

      // Find Least Common Ancestor (LCCA)

      
    }


  }

  * loadState(state: BaseStateNode, data: Record<string, unknown>): Generator<MountResponse, Record<string, unknown>, MountResponse> {
    let nextState = { ...data };
    let activeNode = this.states.get(state.id);

    while (activeNode) {
      // Trigger the nodes mount logic
      const mountResponse = yield activeNode.mount(nextState);

      // Add the node to the active state chain
      this.activeStateChain.push([mountResponse.node.id, mountResponse.node]);

      // Update the state and active node
      nextState = { ...mountResponse.state };
      activeNode = mountResponse.childPath ? this.states.get(mountResponse.childPath) : undefined;
    }

    return nextState;
  }

  async * macrostep(state: Record<string, never>) {
    // Initialize transaction list
    const transitions: TransitionNode[] = this.activeStateChain
      .map(([, node]) => node.getEventlessTransitions())
      .flat();

    let macrostepDone = false;
    while (!macrostepDone) {
      
      
      // When we reach this line the macrostep is done and we can return
      macrostepDone = true;
    }


    // State Snapshot
    return state;
  }

  async microstep(state: Record<string, never>, transitions: TransitionNode[]) {
    // Exit states
    this.exitStates(transitions);

    // Execute transition content
    this.executeTransitionContent(transitions);

    // Enter states
    this.enterStates(transitions);
  }

  private findLCCA(source: BaseStateNode, target: BaseStateNode): BaseStateNode {
    // Get all ancestors of source (including source itself)
    const sourceAncestors = this.getAncestors(source);

    // Walk up from target until we find a common ancestor
    let current: BaseStateNode | undefined = target;
    while (current) {
      if (sourceAncestors.includes(current)) {
        return current; // First common ancestor found
      }
      current = current.parent as BaseStateNode | undefined;
    }

    // Should never reach here in a valid state machine
    throw new Error('No common ancestor found');
  }

  private getAncestors(state: BaseStateNode): BaseStateNode[] {
    const ancestors: BaseStateNode[] = [];
    let current: BaseStateNode | undefined = state;

    while (current) {
      ancestors.push(current);
      current = current.parent as BaseStateNode | undefined;
    }

    return ancestors;
  }

  private computeExitSet(transitions: any[]): Set<BaseStateNode> {
    const exitSet = new Set<BaseStateNode>();

    for (const transition of transitions) {
      if (transition.target) {
        // Find Least Common Compound Ancestor (LCCA)
        const lcca = this.findLCCA(transition.source, transition.target);

        // Add all active descendants of LCCA to exit set
        for (const stateId of this.activeStates) {
          const state = this.states.get(stateId);
          if (state && this.isDescendant(state, lcca) && state !== lcca) {
            exitSet.add(state);
          }
        }
      }
    }

    return exitSet;
  }

  private computeEntrySet(transitions: any[]): Set<BaseStateNode> {
    const entrySet = new Set<BaseStateNode>();

    for (const transition of transitions) {
      if (transition.target) {
        // Add target and all ancestors up to LCCA
        let current = transition.target;
        const lcca = this.findLCCA(transition.source, transition.target);

        while (current && current !== lcca) {
          if (!this.activeStates.has(current.id)) {
            entrySet.add(current);
          }
          current = current.parent as BaseStateNode | undefined;
        }
      }
    }

    return entrySet;
  }

  private isDescendant(state: BaseStateNode, ancestor: BaseStateNode): boolean {
    let current = state.parent as BaseStateNode | undefined;
    while (current) {
      if (current === ancestor) {
        return true;
      }
      current = current.parent as BaseStateNode | undefined;
    }
    return false;
  }

  private exitStates(transitions: any[]) {
    // Implementation for exiting states
  }

  private executeTransitionContent(transitions: any[]) {
    // Implementation for executing transition content
  }

  private enterStates(transitions: any[]) {
    // Implementation for entering states
  }

  async run(input: Record<string, never>, options?: StateChartOptions) {
    const abort = options?.abort ?? new AbortController()
    let running = true;
    
    // Configure an abort signal
    abort.signal.addEventListener('abort', () => {
      running = false;
    });

    // If timeout is specified, abort after the specified time
    if (options?.timeout) {
      setTimeout(() => {
        abort.abort();
      }, options.timeout);
    }


  }

  static fromXML(xmlStr: string) {
    const { scxml } = SimpleXML.convertXML(xmlStr);

    if (!scxml) {
      throw new Error('Invalid Format: Root Element must be <scxml>');
    }

    if (!scxml.initial) {
      throw new Error('Invalid Input: Root element must have `initial` state');
    }

    const { identifiableChildren } = parse(scxml);

    return new StateChart(scxml.initial, identifiableChildren);
  }
}