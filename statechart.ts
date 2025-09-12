import { BaseNode } from "./models";
import SimpleXML from 'simple-xml-to-json';
import { parse } from "./parser";
import { BaseStateNode, MountResponse } from "./models/base-state";
import { TransitionNode } from "./nodes";
import { findLCCA, computeExitSet, buildEntryPath, type ActiveStateEntry } from './utils/transition-utils';

type Tuple<T> = Array<[string, T]>;

interface StateChartOptions {
  abort?: AbortController;
  timeout?: number;
}

export class StateChart {
  private states: Map<string, BaseStateNode> = new Map();
  private activeStateChain: Tuple<BaseStateNode> = [];

  constructor(
    private readonly initial: string,
    private readonly nodes: Map<string, BaseNode>
  ) {}

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

  async macrostep(state: Record<string, never>) {
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

  async microstep(state: Record<string, unknown>, transitions: TransitionNode[]): Promise<Record<string, unknown>> {
    let currentState = { ...state };

    // Exit states
    currentState = this.exitStates(transitions, currentState);

    // Execute transition content
    currentState = await this.executeTransitionContent(transitions, currentState);

    // Enter states
    currentState = this.enterStates(transitions, currentState);

    return currentState;
  }

  computeEntrySet(sourcePath: string, targetPath: string): string[] {
    const lccaPath = findLCCA(sourcePath, targetPath);

    // Build entry path using utility function, then filter out already active states
    const candidateEntryPaths = buildEntryPath(lccaPath, targetPath);
    return candidateEntryPaths.filter((path: string) => !this.isActive(path));
  }

  private isActive(path: string): boolean {
    return this.activeStateChain.some(([activePath]) => activePath === path);
  }

  /**
   * Computes the exit set for a collection of transitions.
   *
   * This method processes multiple transitions and computes the union of all
   * states that need to be exited, handling parallel transitions correctly.
   *
   * @param transitions - Array of transitions to process
   * @returns Array of state paths to exit, sorted deepest-first
   */
  private computeExitSetFromTransitions(transitions: TransitionNode[]): string[] {
    const allExitStates = new Set<string>();

    // For each transition, compute its exit set and add to the union
    for (const transition of transitions) {
      // Extract source path from transition - we need to find the source state
      const sourceState = this.findSourceStateForTransition(transition);
      if (sourceState && transition.target) {
        // Convert activeStateChain to the format expected by the utility function
        const activeStateEntries: ActiveStateEntry[] = this.activeStateChain.map(([path, node]) => [path, node]);
        
        // Compute exit set for this transition
        const exitStates = computeExitSet(sourceState, transition.target, activeStateEntries);
        exitStates.forEach(state => allExitStates.add(state));
      }
    }

    // Convert to array and sort deepest first (already handled by computeExitSet)
    const exitArray = Array.from(allExitStates);
    return exitArray.sort((a, b) => b.split('.').length - a.split('.').length);
  }

  /**
   * Finds the source state path for a given transition by looking through
   * the active state chain to find which state contains this transition.
   *
   * @param transition - The transition to find the source for
   * @returns The path of the source state, or null if not found
   */
  private findSourceStateForTransition(transition: TransitionNode): string | null {
    // Look through active state chain to find which state contains this transition
    for (const [statePath, stateNode] of this.activeStateChain) {
      // Check if this state node contains the transition
      if (stateNode.getEventlessTransitions &&
          stateNode.getEventlessTransitions().includes(transition)) {
        return statePath;
      }
    }
    return null;
  }

  private exitStates(transitions: TransitionNode[], state: Record<string, unknown>): Record<string, unknown> {
    // Compute the complete exit set for all transitions
    const statesToExit = this.computeExitSetFromTransitions(transitions);

    let currentState = { ...state };

    // Sort states in exit order (deepest first) - already handled by computeExitSet
    // Execute onexit handlers and remove from active configuration
    for (const statePath of statesToExit) {
      // Find the state node in our active state chain
      const stateEntry = this.activeStateChain.find(([path]) => path === statePath);

      if (stateEntry) {
        const [, stateNode] = stateEntry;

        // Execute onexit handler by calling unmount method
        if (typeof stateNode.unmount === 'function') {
          currentState = { ...currentState, ...stateNode.unmount(currentState) };
        }

        // Remove state from active configuration
        this.activeStateChain = this.activeStateChain.filter(([path]) => path !== statePath);
      }
    }

    return currentState;
  }

  private async executeTransitionContent(transitions: TransitionNode[], state: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Implementation for executing transition content
    // For now, just return the state unchanged
    return state;
  }

  private enterStates(transitions: TransitionNode[], state: Record<string, unknown>): Record<string, unknown> {
    // Implementation for entering states
    // For now, just return the state unchanged
    return state;
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