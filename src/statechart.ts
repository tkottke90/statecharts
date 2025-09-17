import { BaseNode } from './models';
import SimpleXML from 'simple-xml-to-json';
import { parse } from './parser';
import { BaseStateNode } from './models/base-state';
import { InitialNode, SCXMLNode, TransitionNode } from './nodes';
import { DataModelNode } from './nodes/datamodel.node';
import { ParallelNode } from './nodes/parallel.node';
import {
  findLCCA,
  computeExitSet,
  buildEntryPath,
  type ActiveStateEntry,
} from './utils/transition-utils';
import {
  InternalState,
  processPendingEvents,
  SCXMLEvent,
} from './models/internalState';
import { Queue } from './models/event-queue';
import z from 'zod';

type Tuple<T> = Array<[string, T]>;

interface StateChartOptions {
  abort?: AbortController;
  timeout?: number;
}

export class StateChart {
  private states: Map<string, BaseStateNode> = new Map();
  private activeStateChain: Tuple<BaseStateNode> = [];

  // SCXML-compliant dual event queue system
  private internalEventQueue = new Queue<SCXMLEvent>();
  private externalEventQueue = new Queue<SCXMLEvent>();

  constructor(
    private initial: string,
    private readonly root: SCXMLNode,
    stateMap: Map<string, BaseNode>,
  ) {
    // Collect all state notes so we can access them later
    stateMap.forEach((node, id) => {
      if (node instanceof BaseStateNode) {
        this.states.set(id, node);
      }
    });

    // Initialize the state machine by entering the initial state configuration
    // Note: This is synchronous initialization - no mount handlers are executed
    this.initializeActiveStateChain();
  }

  /**
   * Initializes the activeStateChain by entering the initial state configuration.
   * This method handles the initial state entry according to SCXML specification,
   * including entering parallel states and their child states.
   */
  private initializeActiveStateChain(): void {
    if (!this.initial) {
      // Check for <initial> node
      const [initialNode] = this.root.getChildrenOfType(InitialNode);

      if (initialNode) {
        this.initial = initialNode.content;
      }
    }

    // We do not have an initial attribute OR an <initial> node
    // then grab the first state element
    if (!this.initial) {
      const [firstStateNode] = this.root.getChildrenOfType(BaseStateNode);

      if (firstStateNode) {
        this.initial = firstStateNode.id;
      }
    }

    if (!this.initial) {
      const err = new Error(
        'Could not identify an initial state from the provided configuration',
      );
      err.name = 'StateChart.InitializationError';

      throw err;
    }

    // Build the path to the initial state and all its ancestors
    const initialStateParts = this.initial.split('.');
    const statesToEnter: string[] = [];

    // Build all ancestor paths that need to be entered (shallowest first)
    for (let i = 1; i <= initialStateParts.length; i++) {
      const pathToEnter = initialStateParts.slice(0, i).join('.');
      statesToEnter.push(pathToEnter);
    }

    // Enter each state in the path without executing mount handlers (initialization only)
    for (const statePath of statesToEnter) {
      this.addStateToActiveChainSync(statePath);
    }
  }

  /**
   * Synchronous version of addStateToActiveChain for initialization.
   * Does not execute mount handlers, only adds states to activeStateChain.
   */
  private addStateToActiveChainSync(statePath: string): void {
    const stateNode = this.states.get(statePath);

    if (!stateNode) {
      return;
    }

    // Add state to active configuration first
    this.activeStateChain.push([statePath, stateNode]);

    // Handle parallel state initialization - enter all child states simultaneously
    if (stateNode instanceof ParallelNode) {
      const childStates = stateNode.activeChildStates;

      for (const childState of childStates) {
        if (childState.id) {
          const childPath = `${statePath}.${childState.id}`;
          this.addStateToActiveChainSync(childPath);
        }
      }
    }
    // Handle compound state initialization - enter the initial child state
    else if (!stateNode.isAtomic) {
      const initialChildState = stateNode.initialState;
      if (initialChildState) {
        const childPath = `${statePath}.${initialChildState}`;
        this.addStateToActiveChainSync(childPath);
      }
    }
  }

  /**
   * Shared method for adding a state and its required child states to the activeStateChain.
   * Handles parallel states, compound states, and proper state hierarchy.
   *
   * @param statePath - The path of the state to add
   * @param executeMountHandlers - Whether to execute mount handlers (onentry actions)
   * @param currentState - Current state data (required if executeMountHandlers is true)
   * @returns Updated state data if mount handlers were executed
   */
  private async addStateToActiveChain(
    statePath: string,
    executeMountHandlers: boolean,
    currentState?: InternalState,
  ): Promise<InternalState | void> {
    const stateNode = this.states.get(statePath);
    let updatedState = currentState;

    if (!stateNode) {
      return updatedState;
    }

    // Execute mount handler if requested
    if (executeMountHandlers && updatedState) {
      if (typeof stateNode.mount === 'function') {
        const mountResponse = await stateNode.mount(updatedState);
        updatedState = { ...updatedState, ...mountResponse.state };

        // Handle parallel state entry using mount response
        if (stateNode instanceof ParallelNode && mountResponse.childPath) {
          const childStateIds = mountResponse.childPath
            .split(',')
            .filter(id => id.trim());

          for (const childId of childStateIds) {
            const childPath = `${statePath}.${childId.trim()}`;
            const childResult = await this.addStateToActiveChain(
              childPath,
              true,
              updatedState,
            );
            if (childResult) {
              updatedState = childResult;
            }

            // Handle compound states within parallel regions
            const childStateNode = this.states.get(childPath);
            if (childStateNode && childResult) {
              const grandChildMountResponse =
                await childStateNode.mount(childResult);
              updatedState = {
                ...updatedState,
                ...grandChildMountResponse.state,
              };

              if (grandChildMountResponse.childPath) {
                const grandChildPath = `${childPath}.${grandChildMountResponse.childPath}`;
                const grandChildResult = await this.addStateToActiveChain(
                  grandChildPath,
                  true,
                  updatedState,
                );
                if (grandChildResult) {
                  updatedState = grandChildResult;
                }
              }
            }
          }
        }
      }
    } else {
      // Handle parallel state entry without mount handlers (initialization)
      if (stateNode instanceof ParallelNode) {
        const childStates = stateNode.activeChildStates;

        for (const childState of childStates) {
          if (childState.id) {
            const childPath = `${statePath}.${childState.id}`;
            await this.addStateToActiveChain(childPath, false);
          }
        }
      }
      // Handle compound state entry without mount handlers
      else if (!stateNode.isAtomic) {
        const initialChildState = stateNode.initialState;
        if (initialChildState) {
          const childPath = `${statePath}.${initialChildState}`;
          await this.addStateToActiveChain(childPath, false);
        }
      }
    }

    // Add state to active configuration
    this.activeStateChain.push([statePath, stateNode]);

    return updatedState;
  }

  // Public API for external event injection
  public addEvent(event: SCXMLEvent): void {
    this.externalEventQueue.enqueue(event);
  }

  public sendEventByName(
    eventName: string,
    data?: Record<string, unknown>,
  ): void {
    const event: SCXMLEvent = {
      name: eventName,
      type: 'external',
      sendid: '',
      origin: '',
      origintype: '',
      invokeid: '',
      data: data || {},
    };
    this.addEvent(event);
  }

  // Helper method to select eventless transitions
  private selectEventlessTransitions(): TransitionNode[] {
    return this.activeStateChain
      .map(([, node]) => node.getEventlessTransitions())
      .flat();
  }

  // Helper method to select transitions that match an event
  private selectTransitions(
    event: SCXMLEvent,
    state: InternalState,
  ): TransitionNode[] {
    const enabledTransitions: TransitionNode[] = [];

    for (const [, stateNode] of this.activeStateChain) {
      const transitions = stateNode.getTransitions();

      for (const transition of transitions) {
        if (
          this.eventMatches(event, transition.event) &&
          transition.checkCondition(state)
        ) {
          enabledTransitions.push(transition);
        }
      }
    }

    return this.removeConflictingTransitions(enabledTransitions);
  }

  // Helper method for event matching (supports wildcards)
  private eventMatches(event: SCXMLEvent, eventDescriptor?: string): boolean {
    if (!eventDescriptor) return false;

    // Handle wildcards: "error.*" matches "error.raise.invalid-event"
    if (eventDescriptor.endsWith('*')) {
      const prefix = eventDescriptor.slice(0, -1);
      return event.name.startsWith(prefix);
    }

    // Exact match
    return event.name === eventDescriptor;
  }

  // Helper method to remove conflicting transitions (placeholder for now)
  private removeConflictingTransitions(
    transitions: TransitionNode[],
  ): TransitionNode[] {
    // TODO: Implement SCXML conflict resolution algorithm
    // For now, just return all transitions
    return transitions;
  }

  async macrostep(state: InternalState): Promise<InternalState> {
    // Process pending events from state into internal queue
    processPendingEvents(state, this.internalEventQueue);

    let macrostepDone = false;
    while (!macrostepDone) {
      // 1. Process eventless transitions first (highest priority)
      const eventlessTransitions = this.selectEventlessTransitions();
      if (eventlessTransitions.length > 0) {
        state = await this.microstep(state, eventlessTransitions);
        // Process any new pending events generated by the microstep
        processPendingEvents(state, this.internalEventQueue);
        continue;
      }

      // 2. Process internal events (second priority)
      const internalEvent = this.internalEventQueue.dequeue();
      if (internalEvent) {
        const eventTransitions = this.selectTransitions(internalEvent, state);
        if (eventTransitions.length > 0) {
          // Set event context for transition processing
          state._event = internalEvent;
          state = await this.microstep(state, eventTransitions);
          // Clear event context and process any new pending events
          delete state._event;
          processPendingEvents(state, this.internalEventQueue);
          continue;
        }
      }

      // 3. Process external events (lowest priority, only when internal queue empty)
      const externalEvent = this.externalEventQueue.dequeue();
      if (externalEvent) {
        const eventTransitions = this.selectTransitions(externalEvent, state);
        if (eventTransitions.length > 0) {
          // Set event context for transition processing
          state._event = externalEvent;
          state = await this.microstep(state, eventTransitions);
          // Clear event context and process any new pending events
          delete state._event;
          processPendingEvents(state, this.internalEventQueue);
          continue;
        }
      }
      // 4. No more events or transitions - macrostep complete
      macrostepDone = true;
    }

    // State Snapshot
    return state;
  }

  async microstep(
    state: InternalState,
    transitions: TransitionNode[],
  ): Promise<InternalState> {
    let currentState = { ...state };

    // Exit states
    currentState = await this.exitStates(transitions, currentState);

    // Execute transition content
    currentState = await this.executeTransitionContent(
      transitions,
      currentState,
    );

    // Enter states
    currentState = await this.enterStates(transitions, currentState);

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
  private computeExitSetFromTransitions(
    transitions: TransitionNode[],
  ): string[] {
    const allExitStates = new Set<string>();

    // For each transition, compute its exit set and add to the union
    for (const transition of transitions) {
      // Extract source path from transition - we need to find the source state
      const sourceState = this.findSourceStateForTransition(transition);
      if (sourceState && transition.target) {
        // Convert activeStateChain to the format expected by the utility function
        const activeStateEntries: ActiveStateEntry[] =
          this.activeStateChain.map(([path, node]) => [path, node]);

        // Compute exit set for this transition
        const exitStates = computeExitSet(
          sourceState,
          transition.target,
          activeStateEntries,
        );
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
  private findSourceStateForTransition(
    transition: TransitionNode,
  ): string | null {
    // Look through active state chain to find which state contains this transition
    for (const [statePath, stateNode] of this.activeStateChain) {
      // Check if this state node contains the transition
      if (
        stateNode.getEventlessTransitions &&
        stateNode.getEventlessTransitions().includes(transition)
      ) {
        return statePath;
      }
    }
    return null;
  }

  private async exitStates(
    transitions: TransitionNode[],
    state: InternalState,
  ): Promise<InternalState> {
    // Compute the complete exit set for all transitions
    const statesToExit = this.computeExitSetFromTransitions(transitions);

    let currentState = { ...state };

    // Sort states in exit order (deepest first) - already handled by computeExitSet
    // Execute onexit handlers and remove from active configuration
    for (const statePath of statesToExit) {
      // Find the state node in our active state chain
      const stateEntry = this.activeStateChain.find(
        ([path]) => path === statePath,
      );

      if (stateEntry) {
        const [, stateNode] = stateEntry;

        // Execute onexit handler by calling unmount method
        if (typeof stateNode.unmount === 'function') {
          currentState = {
            ...currentState,
            ...(await stateNode.unmount(currentState)),
          };
        }

        // Remove state from active configuration
        this.activeStateChain = this.activeStateChain.filter(
          ([path]) => path !== statePath,
        );
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
  private async executeTransitionContent(
    transitions: TransitionNode[],
    state: InternalState,
  ): Promise<InternalState> {
    let currentState = { ...state };

    // Execute transitions in document order
    for (const transition of transitions) {
      // Execute all executable content within this transition
      currentState = await transition.run(currentState); // Fixed: use currentState instead of state
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
  private computeEntrySetFromTransitions(
    transitions: TransitionNode[],
  ): string[] {
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

  private async enterStates(
    transitions: TransitionNode[],
    state: InternalState,
  ): Promise<InternalState> {
    // Compute the complete entry set for all transitions
    const statesToEnter = this.computeEntrySetFromTransitions(transitions);

    let currentState = { ...state };

    // Enter each state with mount handlers (execute onentry actions)
    for (const statePath of statesToEnter) {
      const result = await this.addStateToActiveChain(
        statePath,
        true,
        currentState,
      );
      if (result) {
        currentState = result;
      }
    }

    return currentState;
  }

  /**
   * Initialize the data model according to SCXML specification.
   * This should be called before entering the initial state configuration.
   *
   * @param state - The initial state to populate with data model values
   * @returns Updated state with initialized data model
   */
  private async initializeDataModel(
    state: InternalState,
  ): Promise<InternalState> {
    // Find all datamodel nodes in the root SCXML node
    const dataModelNodes = this.root.getChildrenOfType(DataModelNode);

    let currentState = { ...state };

    // Execute each datamodel node to initialize the data
    for (const dataModelNode of dataModelNodes) {
      currentState = await dataModelNode.run(currentState);
    }

    return currentState;
  }

  async execute(
    input: InternalState,
    options?: StateChartOptions,
  ): Promise<InternalState> {
    // Allow the caller to provide an abort controller
    // but default to a new one otherwise so that we can
    // consistently use the signal logic for managing events
    const abort = options?.abort ?? new AbortController();

    // Configure an abort signal
    abort.signal.addEventListener('abort', () => {
      this.sendEventByName('abort');
    });

    // If timeout is specified, abort after the specified time
    if (options?.timeout) {
      this.sendEventByName('timeout');
    }

    // SCXML Specification: Initialize the data model before entering initial states
    const currentState = await this.initializeDataModel(input);

    // Run the event loop
    return await this.macrostep(currentState);
  }

  static fromXML(xmlStr: string) {
    const parsedXML = SimpleXML.convertXML(xmlStr) as {
      scxml: z.infer<typeof SCXMLNode.schema>;
    };

    // If the root node is not an scxml node, then we should not even try parsing
    if (!parsedXML.scxml) {
      throw new Error('Invalid Format: Root Element must be <scxml>');
    }

    const { root, identifiableChildren, error } = parse<SCXMLNode>(parsedXML);

    // We should fail if we do not get a root node back
    if (!root) {
      throw new Error(
        'Could not parse the provided XML into a valid StateChart',
      );
    }

    // We should fail if there were any node errors
    if (error.length > 0) {
      throw error[0];
    }

    return new StateChart(root.initial, root, identifiableChildren);
  }
}
