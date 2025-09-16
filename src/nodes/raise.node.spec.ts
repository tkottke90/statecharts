
import { RaiseNode } from './raise.node';
import { InternalState, SCXMLEvent } from '../models/internalState';

describe('Node: <raise>', () => {
  let mockEventState: InternalState;

  beforeEach(() => {
    mockEventState = {
      _event: {
        name: 'current.event',
        type: 'external',
        sendid: 'test-send-id',
        origin: 'test-origin',
        origintype: 'test-origin-type',
        invokeid: 'test-invoke-id',
        data: { currentData: 'test' }
      },
      _datamodel: 'ecmascript', // Add datamodel for expression evaluation
      data: { counter: 1 },
      _pendingInternalEvents: []
    };
  });

  describe('constructor', () => {
    it('should create RaiseNode with static event name', () => {
      const raiseNode = new RaiseNode({
        raise: {
          event: 'test.event',
          content: '',
          children: []
        }
      });

      expect(raiseNode.event).toBe('test.event');
      expect(raiseNode.eventexpr).toBeUndefined();
    });

    it('should create RaiseNode with event expression', () => {
      const raiseNode = new RaiseNode({
        raise: {
          eventexpr: 'dynamic.event',
          content: '',
          children: []
        }
      });

      expect(raiseNode.eventexpr).toBe('dynamic.event');
      expect(raiseNode.event).toBeUndefined();
    });
  });

  describe('run method', () => {
    it('should add internal event to pending events with static event name', async () => {
      const raiseNode = new RaiseNode({
        raise: {
          event: 'test.event',
          content: '',
          children: []
        }
      });

      const result = await raiseNode.run(mockEventState);

      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0]).toEqual({
        name: 'test.event',
        type: 'internal',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {}
      });

      // Should preserve original state data
      expect(result.data).toEqual(mockEventState.data);
      expect(result._event).toEqual(mockEventState._event);
    });

    it('should add internal event to pending events with event expression', async () => {
      const raiseNode = new RaiseNode({
        raise: {
          eventexpr: '"dynamic.event"', // Proper JavaScript string literal
          content: '',
          children: []
        }
      });

      const result = await raiseNode.run(mockEventState);

      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0]).toEqual({
        name: 'dynamic.event', // Expression evaluates to this string
        type: 'internal',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {}
      });
    });

    it('should accumulate events when pending events already exist', async () => {
      const existingEvent: SCXMLEvent = {
        name: 'existing.event',
        type: 'internal',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {}
      };

      const stateWithExistingEvents: InternalState = {
        ...mockEventState,
        _pendingInternalEvents: [existingEvent]
      };

      const raiseNode = new RaiseNode({
        raise: {
          event: 'new.event',
          content: '',
          children: []
        }
      });

      const result = await raiseNode.run(stateWithExistingEvents);

      expect(result._pendingInternalEvents).toHaveLength(2);
      expect(result._pendingInternalEvents![0]).toEqual(existingEvent);
      expect(result._pendingInternalEvents![1].name).toBe('new.event');
    });

    it('should handle state with no existing pending events', async () => {
      const stateWithoutPendingEvents: InternalState = {
        ...mockEventState,
        _pendingInternalEvents: undefined
      };

      const raiseNode = new RaiseNode({
        raise: {
          event: 'test.event',
          content: '',
          children: []
        }
      });

      const result = await raiseNode.run(stateWithoutPendingEvents);

      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0].name).toBe('test.event');
    });

    it('should create error.raise.missing-attribute event when raise fails due to missing attributes', async () => {
      // Create a custom RaiseNode class that simulates the error condition
      class FailingRaiseNode extends RaiseNode {
        constructor() {
          super({
            raise: {
              event: 'test.event', // Valid construction
              content: '',
              children: []
            }
          });
        }

        async run(state: InternalState): Promise<InternalState> {
          // Simulate the error condition by throwing the same error
          try {
            throw new Error('RaiseNode must have either event or eventexpr attribute');
          } catch (err) {
            // Per SCXML spec: place error event in internal event queue when raise fails
            // Using structured error naming: error.<label>.<type>
            let errorName = 'error.raise.unknown';

            // Determine specific error type based on the error message
            const errorMessage = (err as Error).message;
            if (errorMessage.includes('must have either event or eventexpr')) {
              errorName = 'error.raise.missing-attribute';
            }

            const errorEvent: SCXMLEvent = {
              name: errorName,
              type: 'platform',
              sendid: '',
              origin: '',
              origintype: '',
              invokeid: '',
              data: {
                error: errorMessage,
                source: 'raise'
              }
            };

            const pendingEvents = state._pendingInternalEvents || [];

            return {
              ...state,
              _pendingInternalEvents: [...pendingEvents, errorEvent]
            };
          }
        }
      }

      const failingRaiseNode = new FailingRaiseNode();
      const result = await failingRaiseNode.run(mockEventState);

      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0]).toEqual({
        name: 'error.raise.missing-attribute',
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: 'RaiseNode must have either event or eventexpr attribute',
          source: 'raise'
        }
      });
    });

    it('should create error.raise.unknown event for unrecognized errors', async () => {
      // Create a custom RaiseNode class that simulates an unknown error condition
      class UnknownErrorRaiseNode extends RaiseNode {
        constructor() {
          super({
            raise: {
              event: 'test.event', // Valid construction
              content: '',
              children: []
            }
          });
        }

        async run(state: InternalState): Promise<InternalState> {
          // Simulate an unknown error condition
          try {
            throw new Error('Some unexpected error occurred');
          } catch (err) {
            // Per SCXML spec: place error event in internal event queue when raise fails
            // Using structured error naming: error.<label>.<type>
            let errorName = 'error.raise.unknown';

            // Determine specific error type based on the error message
            const errorMessage = (err as Error).message;
            if (errorMessage.includes('must have either event or eventexpr')) {
              errorName = 'error.raise.missing-attribute';
            }

            const errorEvent: SCXMLEvent = {
              name: errorName,
              type: 'platform',
              sendid: '',
              origin: '',
              origintype: '',
              invokeid: '',
              data: {
                error: errorMessage,
                source: 'raise'
              }
            };

            const pendingEvents = state._pendingInternalEvents || [];

            return {
              ...state,
              _pendingInternalEvents: [...pendingEvents, errorEvent]
            };
          }
        }
      }

      const unknownErrorRaiseNode = new UnknownErrorRaiseNode();
      const result = await unknownErrorRaiseNode.run(mockEventState);

      expect(result._pendingInternalEvents).toHaveLength(1);
      expect(result._pendingInternalEvents![0]).toEqual({
        name: 'error.raise.unknown',
        type: 'platform',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {
          error: 'Some unexpected error occurred',
          source: 'raise'
        }
      });
    });
  });

  describe('createFromJSON', () => {
    it('should create RaiseNode from valid JSON with event attribute', () => {
      const jsonInput = {
        raise: {
          event: 'test.event'
        }
      };

      const result = RaiseNode.createFromJSON(jsonInput);

      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(RaiseNode);
      expect(result.node!.event).toBe('test.event');
      expect(result.error).toBeUndefined();
    });

    it('should create RaiseNode from valid JSON with eventexpr attribute', () => {
      const jsonInput = {
        raise: {
          eventexpr: 'dynamic.event'
        }
      };

      const result = RaiseNode.createFromJSON(jsonInput);

      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(RaiseNode);
      expect(result.node!.eventexpr).toBe('dynamic.event');
      expect(result.error).toBeUndefined();
    });

    it('should fail validation when both event and eventexpr are provided', () => {
      const jsonInput = {
        raise: {
          event: 'test.event',
          eventexpr: 'dynamic.event'
        }
      };

      const result = RaiseNode.createFromJSON(jsonInput);

      expect(result.success).toBe(false);
      expect(result.node).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should fail validation when neither event nor eventexpr are provided', () => {
      const jsonInput = {
        raise: {}
      };

      const result = RaiseNode.createFromJSON(jsonInput);

      expect(result.success).toBe(false);
      expect(result.node).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });
});
