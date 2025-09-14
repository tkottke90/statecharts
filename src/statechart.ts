import { BaseNode } from "./models";
import SimpleXML from 'simple-xml-to-json';
import { mergeMaps, parse } from "./parser";
import { BaseStateNode } from "./models/base-state";
import { TransitionNode } from "./nodes";
import { findLCCA, computeExitSet, buildEntryPath, type ActiveStateEntry } from './utils/transition-utils';
import { InternalState, withEventContext, clearEventContext } from './models/internalState';
import z from "zod";

type Tuple<T> = Array<[string, T]>;

type Event = 
  | { type: 'timer', id: string, expiration: number }
  | { type: 'abort' }
  | { type: 'timeout' };

interface StateChartOptions {
  abort?: AbortController;
  timeout?: number;
}

const SCXMLSchema = z.object({
  initial: z.string().optional(),
  children: z.array(z.any()).optional()
});

export class StateChart {
  private states: Map<string, BaseStateNode> = new Map();
  private activeStateChain: Tuple<BaseStateNode> = [];
  private eventQueue: Event[] = [];
  
  constructor(
    private readonly initial: string,
    private readonly nodes: BaseNode[],
    stateMap: Map<string, BaseNode>
  ) {

    // Collect all state notes so we can access them later
    stateMap.forEach((node, id) => {
      if (node instanceof BaseStateNode) {
        this.states.set(id, node);
      }
    });
  }

  async macrostep(state: InternalState): Promise<InternalState> {
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

  async microstep(state: InternalState, transitions: TransitionNode[]): Promise<InternalState> {
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

  private exitStates(transitions: TransitionNode[], state: InternalState): InternalState {
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

  /**
   * Executes the executable content within transitions according to SCXML specification.
   * This includes processing elements like <assign>, <script>, <log>, <send>, etc.
   *
   * @param transitions - Array of transitions to execute content for
   * @param state - Current state of the state machine
   * @returns Promise resolving to the updated state after executing all transition content
   */
  private async executeTransitionContent(transitions: TransitionNode[], state: InternalState): Promise<InternalState> {
    let currentState = { ...state };

    // Execute transitions in document order
    for (const transition of transitions) {
      // Execute all executable content within this transition
      currentState = await this.executeTransitionExecutableContent(transition, currentState);
    }

    return currentState;
  }

  /**
   * Executes all executable content within a single transition.
   * Processes child elements that implement executable content semantics.
   *
   * @param transition - The transition containing executable content
   * @param state - Current state of the state machine
   * @returns Promise resolving to the updated state after executing transition content
   */
  private async executeTransitionExecutableContent(transition: TransitionNode, state: InternalState): Promise<InternalState> {
    let currentState = { ...state };

    // Execute all executable content children in document order
    for (const child of transition.children) {
      if (child.isExecutable) {
        try {
          // Execute the executable content and update state
          const result = await child.run(currentState);
          currentState = { ...currentState, ...result };
        } catch (error) {
          // Handle execution errors according to SCXML error handling

          // TODO: Log this elsewhere
          console.error(`Error executing transition content in ${transition.target}:`, error);
          // Continue execution - SCXML is resilient to individual content failures
        }
      }
    }

    return currentState;
  }

  /**
   * Computes the entry set for a collection of transitions.
   *
   * This method processes multiple transitions and computes the union of all
   * states that need to be entered, handling parallel transitions correctly.
   *
   * @param transitions - Array of transitions to process
   * @returns Array of state paths to enter, sorted shallowest-first
   */
  private computeEntrySetFromTransitions(transitions: TransitionNode[]): string[] {
    const allEntryStates = new Set<string>();

    // For each transition, compute its entry set and add to the union
    for (const transition of transitions) {
      if (transition.target) {
        // For entry, we need to build the path from root to target
        // and filter out states that are already active
        const targetParts = transition.target.split('.');

        // Build all ancestor paths that need to be entered
        for (let i = 1; i <= targetParts.length; i++) {
          const pathToEnter = targetParts.slice(0, i).join('.');
          if (!this.isActive(pathToEnter)) {
            allEntryStates.add(pathToEnter);
          }
        }
      }
    }

    // Convert to array and sort shallowest first (for proper entry order)
    const entryArray = Array.from(allEntryStates);
    return entryArray.sort((a, b) => a.split('.').length - b.split('.').length);
  }

  private enterStates(transitions: TransitionNode[], state: InternalState): InternalState {
    // Compute the complete entry set for all transitions
    const statesToEnter = this.computeEntrySetFromTransitions(transitions);

    let currentState = { ...state };

    // Sort states in entry order (shallowest first) - already handled by computeEntrySetFromTransitions
    // Execute onentry handlers and add to active configuration
    for (const statePath of statesToEnter) {
      // Find the state node in our states map
      const stateNode = this.states.get(statePath);

      if (stateNode) {
        // Execute onentry handler by calling mount method
        if (typeof stateNode.mount === 'function') {
          const mountResponse = stateNode.mount(currentState);
          currentState = { ...currentState, ...mountResponse.state };
        }

        // Add state to active configuration
        this.activeStateChain.push([statePath, stateNode]);
      }
    }

    return currentState;
  }

  async execute(input: InternalState, options?: StateChartOptions): Promise<InternalState> {
    // Allow the caller to provide an abort controller
    // but default to a new one otherwise so that we can
    // consistently use the signal logic for managing events
    const abort = options?.abort ?? new AbortController();
    
    // Configure an abort signal
    abort.signal.addEventListener('abort', () => {
      this.eventQueue.push({ type: 'abort' });
    });

    // If timeout is specified, abort after the specified time
    if (options?.timeout) {
      this.eventQueue.push({
        type: 'timeout'
      });
    }

    // Run the event loop
    return await this.macrostep(input);
  }

  static fromXML(xmlStr: string) {
    const { scxml } = SimpleXML.convertXML(xmlStr) as {
      scxml: z.infer<typeof SCXMLSchema>
    };

    if (!scxml) {
      throw new Error('Invalid Format: Root Element must be <scxml>');
    }

    if (!scxml.initial) {
      throw new Error('Invalid Input: Root element must have `initial` state');
    }

    const { success, error, data } = SCXMLSchema.safeParse(scxml);

    if (!success) {
      throw error;
    }

    // Grab the initial attribute if it is set
    const initial = data.initial ?? '';

    // Create containers for parsing results
    const nodes: BaseNode[] = [];
    const nodeMap = new Map<string, BaseNode>();
    const nodeErrors = [];

    // Loop over each child in the array and parse them into
    // Nodes.  This kicks of the recursive process of ingesting
    // the XML schema to the StateChart.  
    for (const child of data.children ?? []) {

      // Parse the child from JSON into a Node
      const { root, identifiableChildren, error } = parse(child);
      
      // If there was an error parsing the child we should record it
      if (error?.length > 0 || !root) {
        // TODO: record error
        
        nodeErrors.push(error);
        continue;
      }

      // If there was an error parsing any of the nested children
      // we should record them as well

      // Collect all of the children in the array
      nodes.push(root);
      
      // Add the child with their full paths to the node map
      // so that we can access them by their full path later
      mergeMaps(identifiableChildren, nodeMap);
    }

    return new StateChart(initial, nodes, nodeMap);
  }
}