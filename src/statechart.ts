import { BaseNode } from './models';
import SimpleXML from 'simple-xml-to-json';
import { parse } from './parser';
import { BaseStateNode } from './models/base-state';
import { InitialNode, SCXMLNode, TransitionNode } from './nodes';
import {
  findLCCA,
  computeExitSet,
  buildEntryPath,
  type ActiveStateEntry,
} from './utils/transition-utils';
import {
  addPendingEvent,
  InternalState,
  processPendingEvents,
  SCXMLEvent,
} from './models/internalState';
import { Queue } from './models/event-queue';
import { StateExecutionHistory } from './models/state-execution-history';
import {
  HistoryTrackingOptions,
  HistoryEventType,
} from './models/history';
import z from 'zod';
import { XMLParsingError } from './errors';
import { InitializeDataModelMixin } from './models/mixins/initializeDataModel';

type Tuple<T> = Array<[string, T]>;

interface StateChartOptions {
  abort?: AbortController;
  timeout?: number;
  history?: Partial<HistoryTrackingOptions>;
}

// This base class is used to add mixins
const StateChartBase = InitializeDataModelMixin(class BaseClass {});

export class StateChart extends StateChartBase {
  // ============================================================================
  // PROPERTIES
  // ============================================================================

  private activeStateChain: Tuple<BaseStateNode> = [];
  private externalEventQueue = new Queue<SCXMLEvent>();
  private history: StateExecutionHistory;
  private internalEventQueue = new Queue<SCXMLEvent>();
  private states: Map<string, BaseStateNode> = new Map();

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(
    private initial: string,
    private readonly root: SCXMLNode,
    stateMap: Map<string, BaseNode>,
    options: StateChartOptions = {},
  ) {
    super();

    // Initialize history tracking
    this.history = new StateExecutionHistory(options.history);

    // Collect all state notes so we can access them later
    stateMap.forEach((node, id) => {
      if (node instanceof BaseStateNode) {
        this.states.set(id, node);
      }
    });
  }

  // ============================================================================
  // GETTERS/SETTERS
  // ============================================================================

  /**
   * Get the history tracking instance for external access
   */
  getHistory(): StateExecutionHistory {
    return this.history;
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  // Public API for external event injection
  public addEvent(event: SCXMLEvent): void {
    this.externalEventQueue.enqueue(event);
  }

  computeEntrySet(sourcePath: string, targetPath: string): string[] {
    const lccaPath = findLCCA(sourcePath, targetPath);

    // Build entry path using utility function, then filter out already active states
    const candidateEntryPaths = buildEntryPath(lccaPath, targetPath);
    return candidateEntryPaths.filter((path: string) => !this.isActive(path));
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
    let currentState = await this.initializeDataModel(this.root, input);

    // SCXML Specification: Enter the initial state configuration with onentry handlers
    currentState = await this.enterInitialStates(currentState);

    // Run the event loop
    return await this.macrostep(currentState);
  }

  async macrostep(state: InternalState): Promise<InternalState> {
    const macrostepStartTime = Date.now();
    const macrostepId = this.history.addEntry(
      HistoryEventType.MACROSTEP_START,
      this.getActiveStateConfiguration(),
      state,
      { metadata: { startTime: macrostepStartTime } }
    );

    this.history.startContext(macrostepId);

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
          // Record event processing
          this.history.addEntry(
            HistoryEventType.EVENT_PROCESSED,
            this.getActiveStateConfiguration(),
            state,
            {
              event: internalEvent,
              metadata: {
                eventType: 'internal',
                transitionCount: eventTransitions.length
              }
            }
          );

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
          // Record event processing
          this.history.addEntry(
            HistoryEventType.EVENT_PROCESSED,
            this.getActiveStateConfiguration(),
            state,
            {
              event: externalEvent,
              metadata: {
                eventType: 'external',
                transitionCount: eventTransitions.length
              }
            }
          );

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

    this.history.endContext();

    // Record macrostep completion
    const macrostepDuration = Date.now() - macrostepStartTime;
    this.history.addEntry(
      HistoryEventType.MACROSTEP_END,
      this.getActiveStateConfiguration(),
      state,
      {
        duration: macrostepDuration,
        metadata: {
          startTime: macrostepStartTime,
          endTime: Date.now()
        }
      }
    );

    // State Snapshot
    return state;
  }

  async microstep(
    state: InternalState,
    transitions: TransitionNode[],
  ): Promise<InternalState> {
    // Create a new microstep entry in the history
    // and start a new context for this microstep
    const microstepStartTime = Date.now();
    const microstepId = this.history.addEntry(
      HistoryEventType.MICROSTEP_START,
      this.getActiveStateConfiguration(),
      state,
      {
        metadata: {
          startTime: microstepStartTime,
          transitionCount: transitions.length,
          transitions: transitions.map(t => ({ target: t.target, event: t.event }))
        }
      }
    );

    this.history.startContext(microstepId);

    // Clone the state before any changes
    let currentState = { ...state };

    // Exit out active states based on the current list of transactions
    currentState = await this.exitStates(transitions, currentState);

    // Trigger any transitions
    currentState = await this.executeTransitionContent(
      transitions,
      currentState,
    );

    // Enter states based on the current list of transactions
    currentState = await this.enterStates(transitions, currentState);

    // Close the micro step history context window
    this.history.endContext();

    // Record microstep completion
    const microstepDuration = Date.now() - microstepStartTime;
    this.history.addEntry(
      HistoryEventType.MICROSTEP_END,
      this.getActiveStateConfiguration(),
      currentState,
      {
        duration: microstepDuration,
        metadata: {
          startTime: microstepStartTime,
          endTime: Date.now(),
          transitionCount: transitions.length
        }
      }
    );

    return currentState;
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

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

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
    currentState?: InternalState,
  ): Promise<InternalState | void> {
    // Get state node
    const stateNode = this.states.get(statePath);

    if (!stateNode) {
      return currentState;
    }

    // Clone the current state without modifying its structure
    let updatedState = { data: {}, ...currentState };

    // Execute mount handler if requested
    if (typeof stateNode.mount === 'function') {
      const mountResponse = await stateNode.mount(updatedState);
      // Merge the mount response state with the current state
      // Later states override earlier ones (child overrides parent)
      updatedState = {
        ...updatedState,
        ...mountResponse.state
      };
    }

    // Add state to active configuration
    this.activeStateChain.push([statePath, stateNode]);

    return updatedState;
  }

  /**
   * Determine the initial state path according to SCXML specification
   */
  private determineInitialStatePath(): string {
    if (this.initial) {
      return this.initial;
    }

    // Check for <initial> node
    const [initialNode] = this.root.getChildrenOfType(InitialNode);
    if (initialNode) {
      return initialNode.content;
    }

    // Grab the first state element
    const [firstStateNode] = this.root.getChildrenOfType(BaseStateNode);
    if (firstStateNode) {
      return firstStateNode.id;
    }

    throw new Error('Could not identify an initial state from the provided configuration');
  }

  private async enterStates(
    transitions: TransitionNode[],
    state: InternalState,
  ): Promise<InternalState> {
    const allEntryStates = new Set<string>();
    let currentState = { ...state }

    // For each transition, compute its entry set and add to the union
    for (const transition of transitions) {
      if (transition.target) {
        // For entry, we need to build the path from root to target
        // and filter out states that are already active
        const targetParts = transition.target.split('.');

        // Loops over each of the parts of the path and make sure
        // that the active state contains each part
        //
        // Example:
        //   transition.target = 'gameRunning.gameSystems.healthSystem'
        //   targetParts = [ 'gameRunning', 'gameSystems', 'healthSystem' ]
        //
        //   // Creates entries in state chain
        //   'gameRunning'
        //   'gameRunning.gameSystems'
        //   'gameRunning.gameSystems.healthSystem'
        for (let i = 1; i <= targetParts.length; i++) {
          const pathToEnter = targetParts.slice(0, i).join('.');

          // Load the node info from the state map
          if (this.states.has(pathToEnter)) {
            const node = this.states.get(pathToEnter);

            // Capture if the node is missing, this is a problem
            if (!node) {
              currentState = addPendingEvent(
                currentState,
                {
                  name: 'error.statechart.path-not-found',
                  type: 'platform',
                  sendid: '',
                  origin: '',
                  origintype: '',
                  invokeid: '',
                  data: {
                    message: 'Unable to load state for path',
                    path: pathToEnter
                  }
                }
              )

              break;
            }

            // Add the path itself to the entry set if not already active
            if (!this.isActive(pathToEnter)) {
              allEntryStates.add(pathToEnter);
            }

            // Add the initial states to the entry set. Each
            // node that inherits from the BaseStateNode has a
            // method for getting the list of child states that
            // would be initialized
            node?.getInitialStateList('').forEach(
              statePath => {
                if (!this.isActive(statePath)) {
                  allEntryStates.add(statePath);
                }
              }
            );
          }
        }
      }
    }

    // Convert to array and sort shallowest first (for proper entry order)
    const statesToEnter = Array.from(allEntryStates).sort((a, b) => this.sortByPathDepth(a, b));

    return await this.updateStates(
      currentState,
      statesToEnter
    )
  }

  /**
   * Enters the initial state configuration with onentry handlers.
   * This method executes the mount handlers for all initially active states
   * according to the SCXML specification.
   *
   * @param state - Current state data
   * @returns Updated state after executing all initial state onentry handlers
   */
  private async enterInitialStates(state: InternalState): Promise<InternalState> {
    // 1. Clear the active state chain
    this.activeStateChain = [];

    // 2. Determine the initial state path
    const initialStatePath = this.determineInitialStatePath();

    // 3. Create a fake transition node which instructs
    // the system to transition to the initial state.  This unifies
    // the state management logic 
    return await this.enterStates(
      [
        new TransitionNode({ transition: {
          content: '',
          children: [],
          target: initialStatePath
        }})
      ],
      state
    )
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

  private async exitStates(
    transitions: TransitionNode[],
    state: InternalState,
  ): Promise<InternalState> {
    // Compute the complete exit set for all transitions
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
    const statesToExit = Array.from(allExitStates).sort((a, b) => this.sortByPathDepth(a, b));

    return await this.updateStates(
      state,
      statesToExit,
      'remove'
    )
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

  /**
   * Get current active state configuration as string array
   */
  private getActiveStateConfiguration(): string[] {
    return this.activeStateChain.map(([path]) => path);
  }

  private isActive(path: string): boolean {
    return this.activeStateChain.some(([activePath]) => activePath === path);
  }

  // Helper method to remove conflicting transitions (placeholder for now)
  private removeConflictingTransitions(
    transitions: TransitionNode[],
  ): TransitionNode[] {
    // TODO: Implement SCXML conflict resolution algorithm
    // For now, just return all transitions
    return transitions;
  }

  // Helper method to select eventless transitions
  private selectEventlessTransitions(): TransitionNode[] {
    return this.activeStateChain
      .map(([, node]) => node.getEventlessTransitions())
      .flat();
  }

  private sortByPathDepth(pathA: string, pathB: string) {
    return pathA.split('.').length - pathB.split('.').length;
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

  private async updateStates(state: InternalState, statesToUpdate: string[], updateMethod: 'add' | 'remove' = 'add') {
    let currentState = { ...state };

    const historyEvent: HistoryEventType = updateMethod === 'add' ? HistoryEventType.STATE_ENTRY : HistoryEventType.STATE_EXIT;
    const descriptionProperty = updateMethod === 'add' ? 'enteredState' : 'exitedState'

    for (const statePath of statesToUpdate) {
      const startTime = Date.now();

      switch(updateMethod) {
        case 'add': {
          const result = await this.addStateToActiveChain(
            statePath,
            currentState,
          );

          if (result) {
            currentState = result;
          }
          break;
        }
        case 'remove': {
          // Find the state node in our active state chain
          const stateEntry = this.activeStateChain.find(
            ([path]) => path === statePath,
          );

          if (!stateEntry) {
            // Skip the state if path is not in the active chain
            // to avoid creating a new history entry
            continue;
          }

          // Extract the node so we can call it's methods
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

          break;
        }
      }

      const duration = Date.now() - startTime;
      this.history.addEntry(
        historyEvent,
        this.getActiveStateConfiguration(),
        currentState,
        {
          duration: duration,
          metadata: {
            [descriptionProperty]: statePath,
            startTime: startTime,
            endTime: Date.now()
          }
        }
      );
    }

    return currentState;
  }

  // ============================================================================
  // STATIC METHODS
  // ============================================================================

  static fromXML(xmlStr: string, options: StateChartOptions = {}) {
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
      throw new XMLParsingError({
        errors: error
      })
    }

    return new StateChart(root.initial, root, identifiableChildren, options);
  }
}
