import { BaseNode } from './models';
import SimpleXML from 'simple-xml-to-json';
import { parse } from './parser';
import { BaseStateNode } from './models/base-state';
import { SCXMLNode, TransitionNode } from './nodes';
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
import { Queue, QueueMode } from './models/event-queue';
import { StateExecutionHistory } from './models/state-execution-history';
import { HistoryTrackingOptions, HistoryEventType, SerializableHistoryEntry } from './models/history';
import z from 'zod';
import { XMLParsingError } from './errors';
import { InitializeDataModelMixin } from './models/mixins/initializeDataModel';

type Tuple<T> = Array<[string, T]>;

interface StateChartJSON {
  state: InternalState;
  activeStateChain: string[];
  externalEvents: SCXMLEvent[];
  internalEvents: SCXMLEvent[];
  macroStepCount: number;
  microStepCount: number;
  history: SerializableHistoryEntry[];
}

interface StateChartOptions {
  abort?: AbortController;
  timeout?: number;
  history?: Partial<HistoryTrackingOptions>;
  persistence?: string;
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
  private lastState: InternalState;
  private states: Map<string, BaseStateNode> = new Map();
  private macroStepDone: boolean = false;

  private timeoutInterval: number = -1;
  private timeoutId: NodeJS.Timeout | undefined;

  private macroStepCount = 0;
  private microStepCount = 0;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(
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

    if (options?.persistence) {
      const persistedState = this.deserialize(options.persistence);
      this.lastState = persistedState.state;
      this.activeStateChain = persistedState.activeStateChain.map(path => [path, this.states.get(path)!]);
      this.macroStepCount = persistedState.macroStepCount;
      this.microStepCount = persistedState.microStepCount;
      this.history.import(persistedState.history);
      
      this.externalEventQueue = new Queue<SCXMLEvent>(QueueMode.LastInFirstOut);
      persistedState.externalEvents.forEach(event => this.externalEventQueue.enqueue(event));
      
      this.internalEventQueue = new Queue<SCXMLEvent>(QueueMode.LastInFirstOut);
      persistedState.internalEvents.forEach(event => this.internalEventQueue.enqueue(event));

    } else {
      this.lastState = {
        data: {}
      };
    }

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

    if (this.macroStepDone) {
      this.macrostep(this.lastState);
    }
  }

  computeEntrySet(sourcePath: string, targetPath: string): string[] {
    const lccaPath = findLCCA(sourcePath, targetPath);

    // Build entry path using utility function, then filter out already active states
    const candidateEntryPaths = buildEntryPath(lccaPath, targetPath);
    return candidateEntryPaths.filter((path: string) => !this.isActive(path));
  }

  deserialize(jsonData: string) {
    try {
      return JSON.parse(jsonData) as StateChartJSON;
    } catch (error) {
      console.error('Unable to Deserialize', error);

      throw error;
    }
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
      this.addEvent({
        name: 'abort',
        data: {},
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: ''
      });
    });

    // If timeout is specified, abort after the specified time
    if (options?.timeout) {
      this.timeoutInterval = options.timeout
    }

    // SCXML Specification: Initialize the data model before entering initial states
    this.lastState = await this.initializeDataModel(this.root, input);

    // SCXML Specification: Enter the initial state configuration with onentry handlers
    this.lastState = await this.enterInitialStates(this.lastState);

    // Run the event loop
    return await this.macrostep(
      // Clone the state so that it is not manipulated during processing
      structuredClone(this.lastState)
    );
  }

  async macrostep(state: InternalState): Promise<InternalState> {
    const macrostepStartTime = Date.now();
    const macrostepId = this.history.addEntry(
      HistoryEventType.MACROSTEP_START,
      this.getActiveStateConfiguration(),
      state,
      {
        metadata: { startTime: macrostepStartTime, index: this.macroStepCount },
      },
    );

    this.history.startContext(macrostepId);
    this.macroStepDone = false;

    // Process pending events from state into internal queue
    processPendingEvents(state, this.internalEventQueue);

    // If a timeout is set, we should set a timeout to trigger an abort event
    if (this.timeoutInterval !== -1) {
      this.timeoutId = setTimeout(() => {
        this.addEvent({
          name: 'abort.timeout',
          data: {
            duration: this.timeoutInterval
          },
          type: 'platform',
          sendid: '',
          origin: '',
          origintype: '',
          invokeid: ''
        });
      }, this.timeoutInterval);
    }

    while (!this.macroStepDone) {
      this.macroStepCount++;
      
      // 1. Process eventless transitions first (highest priority)
      const eventlessTransitions = this.activeStateChain
        .map(([, node]) => node.getEventlessTransitions())
        .flat();

      if (eventlessTransitions.length > 0) {
        state = await this.microstep(state, eventlessTransitions);
        // Process any new pending events generated by the microstep
        processPendingEvents(state, this.internalEventQueue);
        continue;
      }

      // 2. Process internal events (second priority)
      const internalEvent = this.internalEventQueue.dequeue();
      if (internalEvent) {
        // Record error events to the data object
        if (internalEvent.name.startsWith('error')) {
          state.data.error = internalEvent.data;
        }

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
                transitionCount: eventTransitions.length,
              },
            },
          );

          // Set event context for transition processing
          state._event = internalEvent;
          state = await this.microstep(state, eventTransitions);
          // Clear event context and process any new pending events
          delete state._event;
          processPendingEvents(state, this.internalEventQueue);
          continue;
        } else {
          this.history.addEntry(
            HistoryEventType.EVENT_SKIPPED,
            this.getActiveStateConfiguration(),
            state,
            {
              event: internalEvent,
              metadata: {
                eventType: 'internal',
                message: 'No matching transitions found',
              },
            },
          );

          continue;
        }
      }

      // 3. Process external events (lowest priority, only when internal queue empty)
      const externalEvent = this.externalEventQueue.dequeue();
      if (externalEvent) {

        // Aborting happens at the external level to ensure that we are always leaving
        // the StateChart in a stable state.  Other events queued after this one will not
        // trigger if the current execution has been aborted.  They will be processed next
        // time the StateChart triggers.
        if (externalEvent.name.startsWith('abort')) {
          this.macroStepDone = true;
          continue;
        }


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
                transitionCount: eventTransitions.length,
              },
            },
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
      this.macroStepDone = true;
    }

    // When a timeout is set, we should clear it at the end of a macrostep
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
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
          endTime: Date.now(),
        },
      },
    );

    // State Snapshot
    this.lastState = structuredClone(state);
    return state;
  }

  async microstep(
    state: InternalState,
    transitions: TransitionNode[],
  ): Promise<InternalState> {
    // Create a new microstep entry in the history
    // and start a new context for this microstep
    this.microStepCount++;

    const microstepStartTime = Date.now();
    const microstepId = this.history.addEntry(
      HistoryEventType.MICROSTEP_START,
      this.getActiveStateConfiguration(),
      state,
      {
        metadata: {
          startTime: microstepStartTime,
          transitionCount: transitions.length,
          index: this.microStepCount,
          transitions: transitions.map(t => ({
            target: t.target,
            event: t.event,
          })),
        },
      },
    );

    this.history.startContext(microstepId);

    // Clone the state before any changes
    let currentState = { ...state };

    // Exit out active states based on the current list of transactions
    currentState = await this.exitStates(transitions, currentState);

    // Trigger any transitions
    for (const transition of transitions) {
      // Execute all executable content within this transition
      currentState = await transition.run(currentState);
    }

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
          transitionCount: transitions.length,
        },
      },
    );

    return currentState;
  }

  serialize() {
    return JSON.stringify(this);
  }

  toJSON(): StateChartJSON {
    return {
      state: this.lastState,
      activeStateChain: this.activeStateChain.map(([path]) => path),
      externalEvents: this.externalEventQueue.toArray(),
      internalEvents: this.internalEventQueue.toArray(),
      macroStepCount: this.macroStepCount,
      microStepCount: this.microStepCount,
      history: this.history.export(),
    };
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
        ...mountResponse.state,
      };
    }

    // Add state to active configuration
    this.activeStateChain.push([statePath, stateNode]);

    return updatedState;
  }

  private async enterStates(
    transitions: TransitionNode[],
    state: InternalState,
  ): Promise<InternalState> {
    const allEntryStates = new Set<string>();
    let currentState = { ...state };

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
              currentState = addPendingEvent(currentState, {
                name: 'error.statechart.path-not-found',
                type: 'platform',
                sendid: '',
                origin: '',
                origintype: '',
                invokeid: '',
                data: {
                  message: 'Unable to load state for path',
                  path: pathToEnter,
                },
              });

              break;
            }

            // Check to see if the path has already been activated,
            // we can skip already active states
            const pathIsActive = this.isActive(pathToEnter);

            if (!pathIsActive) {
              // Add the path itself to the entry set if not already active
              allEntryStates.add(pathToEnter);

              // Activating/Mounting a node also actives any initial
              // or inner states as well
              node?.getInitialStateList().forEach(statePath => {
                if (!this.isActive(statePath)) {
                  allEntryStates.add(statePath);
                }
              });
            }
          }
        }
      }
    }

    // Convert to array and sort shallowest first (for proper entry order)
    const statesToEnter = Array.from(allEntryStates).sort((a, b) =>
      this.sortByPathDepth(a, b),
    );

    return await this.updateStates(currentState, statesToEnter);
  }

  /**
   * Enters the initial state configuration with onentry handlers.
   * This method executes the mount handlers for all initially active states
   * according to the SCXML specification.
   *
   * @param state - Current state data
   * @returns Updated state after executing all initial state onentry handlers
   */
  private async enterInitialStates(
    state: InternalState,
  ): Promise<InternalState> {
    // 1. Clear the active state chain
    this.activeStateChain = [];

    // 2. Determine the initial state path
    const initialStatePath = this.root.determineInititalState();

    this.history.addEntry(
      HistoryEventType.INITIAL_STATE,
      this.getActiveStateConfiguration(),
      {
        data: {},
      },
      {
        metadata: {},
      },
    );

    // 3. Create a fake transition node which instructs
    // the system to transition to the initial state.  This unifies
    // the state management logic
    return await this.enterStates(
      [
        new TransitionNode({
          transition: {
            content: '',
            children: [],
            target: initialStatePath,
          },
        }),
      ],
      state,
    );
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

  private async exitStates(
    transitions: TransitionNode[],
    state: InternalState,
  ): Promise<InternalState> {
    // Compute the complete exit set for all transitions
    const allExitStates = new Set<string>();

    // For each transition, compute its exit set and add to the union
    for (const transition of transitions) {
      // Look through active state chain to find the first state which contains this transition
      const [sourceState] = this.activeStateChain.find(
        ([,node]) => node.containsTransaction(transition)
      ) ?? []

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

        // Add the states we need to exit to the set
        exitStates.forEach(state => allExitStates.add(state));
      }
    }

    // Convert to array and sort deepest first (already handled by computeExitSet)
    const statesToExit = Array.from(allExitStates)
      .sort((a, b) => this.sortByPathDepth(a, b))
      .toReversed();

    return await this.updateStates(state, statesToExit, 'remove');
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

  private sortByPathDepth(pathA: string, pathB: string) {
    return pathA.split('.').length - pathB.split('.').length;
  }

  // Helper method to select transitions that match an event
  private selectTransitions(
    event: SCXMLEvent,
    state: InternalState,
  ): TransitionNode[] {
    // Create an empty array to hold the enabled transitions
    const enabledTransitions: TransitionNode[] = [];

    // For each state node we need to get all the transactions
    for (const [, stateNode] of this.activeStateChain) {
      // Get all the transactions for the state node
      const transitions = stateNode.getTransitions();

      // Loop over all the transaction nodes in the state node
      // and collect the ones which match the event (and optionally condition)
      for (const transition of transitions) {
        if (
          this.eventMatches(event, transition.event) &&
          transition.checkCondition({ ...state, _event: event })
        ) {
          enabledTransitions.push(transition);
        }
      }
    }

    // TODO: Implement SCXML conflict resolution algorithm

    // For now, just return all transitions
    return enabledTransitions;
  }

  private async updateStates(
    state: InternalState,
    statesToUpdate: string[],
    updateMethod: 'add' | 'initialize' | 'remove' = 'add',
  ) {
    let currentState = { ...state };

    let historyEvent: HistoryEventType =
      updateMethod === 'add'
        ? HistoryEventType.STATE_ENTRY
        : HistoryEventType.STATE_EXIT;
    const descriptionProperty =
      updateMethod === 'add' ? 'enteredState' : 'exitedState';

    for (const statePath of statesToUpdate) {
      const startTime = Date.now();

      switch (updateMethod) {
        case 'initialize':
          historyEvent = HistoryEventType.INITIAL_STATE;

        // Fall through to add step
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
            endTime: Date.now(),
          },
        },
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
        errors: error,
      });
    }

    return new StateChart( root, identifiableChildren, options);
  }
}
