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

  findLCCA(sourcePath: string, targetPath: string): string {
    // Handle root level transitions
    if (!sourcePath.includes('.') && !targetPath.includes('.')) {
      return ""; // Both are top-level, LCCA is root
    }

    const sourceParts = sourcePath.split('.');
    const targetParts = targetPath.split('.');

    // Find common prefix
    let commonDepth = 0;
    const minLength = Math.min(sourceParts.length, targetParts.length);

    for (let i = 0; i < minLength; i++) {
      if (sourceParts[i] === targetParts[i]) {
        commonDepth = i + 1;
      } else {
        break;
      }
    }

    // Return the LCCA path
    return sourceParts.slice(0, commonDepth).join('.');
  }

  /**
   * Computes the set of states that need to be exited during a transition.
   *
   * According to SCXML specification, states are exited in document order (deepest first)
   * and only states within the scope of the Least Common Compound Ancestor (LCCA) are
   * considered for exit. States that are ancestors of the target are preserved.
   *
   * @param sourcePath - The path of the source state (e.g., "playing.healthSystem.healthy")
   * @param targetPath - The path of the target state (e.g., "playing.scoreSystem.scoring")
   * @returns Array of state paths to exit, sorted deepest-first for proper exit order
   *
   * @example
   * ```typescript
   * // Same-parent transition: healthy → critical
   * computeExitSet("playing.healthSystem.healthy", "playing.healthSystem.critical")
   * // Returns: ["playing.healthSystem.healthy"]
   *
   * // Cross-subsystem transition: health → score
   * computeExitSet("playing.healthSystem.healthy", "playing.scoreSystem.scoring")
   * // Returns: ["playing.healthSystem.healthy", "playing.scoreSystem.scoring", "playing.healthSystem"]
   *
   * // To top-level: playing → gameOver
   * computeExitSet("playing.healthSystem.healthy", "gameOver")
   * // Returns: ["playing.healthSystem.healthy", "playing.scoreSystem.scoring",
   * //           "playing.healthSystem", "playing.scoreSystem", "playing"]
   * ```
   *
   * @remarks
   * - Uses path-based LCCA calculation for efficiency
   * - Preserves parallel state regions that don't conflict with the transition
   * - Excludes the LCCA itself from the exit set
   * - Returns empty array for self-transitions or when no exits are needed
   * - Maintains SCXML-compliant exit ordering (deepest states first)
   */
  computeExitSet(sourcePath: string, targetPath: string): string[] {
    const lccaPath = this.findLCCA(sourcePath, targetPath);
    const exitSet: string[] = [];

    // Find all active states that are descendants of LCCA but not ancestors of target
    for (const [activePath] of this.activeStateChain) {
      if (activePath.startsWith(lccaPath) &&
          activePath !== lccaPath &&
          !targetPath.startsWith(activePath)) {
        exitSet.push(activePath);
      }
    }

    // Sort deepest first (for proper exit order)
    return exitSet.sort((a, b) => b.split('.').length - a.split('.').length);
  }

  computeEntrySet(sourcePath: string, targetPath: string): string[] {
    const lccaPath = this.findLCCA(sourcePath, targetPath);
    const entrySet: string[] = [];

    // Build path from LCCA to target
    const targetParts = targetPath.split('.');
    const lccaParts = lccaPath ? lccaPath.split('.') : [];

    for (let i = lccaParts.length; i <= targetParts.length; i++) {
      const pathToEnter = targetParts.slice(0, i).join('.');
      if (pathToEnter && !this.isActive(pathToEnter)) {
        entrySet.push(pathToEnter);
      }
    }

    return entrySet; // Already in entry order (shallowest first)
  }

  private isActive(path: string): boolean {
    return this.activeStateChain.some(([activePath]) => activePath === path);
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