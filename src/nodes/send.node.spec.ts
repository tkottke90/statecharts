import { SendNode } from './send.node';
import { ParamNode } from './param.node';
import { EventIOProcessorRegistry, EventIOProcessor } from '../models/event-io-processor';
import { InternalState } from '../models/internalState';
import SimpleXML from 'simple-xml-to-json';
import { StateNode } from '../../dist/nodes';
import { OnEntryNode } from '../nodes/onentry.node';

// Mock setTimeout for delay testing
jest.useFakeTimers();

describe('Node: <send>', () => {
  let testState: InternalState;
  let mockRegistry: EventIOProcessorRegistry;
  let mockProcessor: EventIOProcessor;

  beforeEach(() => {
    testState = {
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        apiUrl: 'http://api.example.com',
        eventName: 'userUpdate',
        targetUrl: 'http://target.example.com'
      },
      _datamodel: 'ecmascript'
    };

    // Create mock processor
    mockProcessor = {
      type: 'test',
      send: jest.fn().mockResolvedValue({ success: true, sendid: 'test-123' }),
      canHandle: jest.fn().mockReturnValue(true)
    };

    // Create mock registry
    mockRegistry = new EventIOProcessorRegistry();
    mockRegistry.register(mockProcessor);
  });

  afterEach(() => {
    jest.clearAllTimers();
    mockRegistry.clear();
  });

  describe('#createFromJSON', () => {
    it('should create a SendNode instance from XML with event and target', () => {
      const sendXML = `<send event="testEvent" target="http://example.com"/>`;
      const json = SimpleXML.convertXML(sendXML);

      const { success, node, error } = SendNode.createFromJSON(json);

      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(SendNode);
      expect(node!.event).toBe('testEvent');
      expect(node!.target).toBe('http://example.com');
    });

    it('should create a SendNode instance with expression attributes', () => {
      const sendXML = `<send eventexpr="eventName" targetexpr="targetUrl" typeexpr="'http'"/>`;
      const json = SimpleXML.convertXML(sendXML);

      const { success, node, error } = SendNode.createFromJSON(json);

      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(SendNode);
      expect(node!.eventexpr).toBe('eventName');
      expect(node!.targetexpr).toBe('targetUrl');
      expect(node!.typeexpr).toBe("'http'");
    });

    it('should create a SendNode instance with delay and id attributes', () => {
      const sendJSON = {
        event: 'delayedEvent',
        target: 'http://example.com',
        delay: '5s',
        id: 'send-123',
        namelist: 'user.name user.email'
      };

      const { success, node, error } = SendNode.createFromJSON(sendJSON);

      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(SendNode);
      expect(node!.delay).toBe('5s');
      expect(node!.id).toBe('send-123');
      expect(node!.namelist).toBe('user.name user.email');
    });

    it('should fail validation when both event and eventexpr are provided', () => {
      const sendJSON = {
        event: 'testEvent',
        eventexpr: 'eventName',
        target: 'http://example.com'
      };

      const { success, node, error } = SendNode.createFromJSON(sendJSON);

      expect(success).toBe(false);
      expect(node).toBeUndefined();
      expect(error).toBeDefined();
    });

    it('should fail validation when neither event nor eventexpr is provided', () => {
      const sendJSON = {
        target: 'http://example.com'
      };

      const { success, node, error } = SendNode.createFromJSON(sendJSON);

      expect(success).toBe(false);
      expect(node).toBeUndefined();
      expect(error).toBeDefined();
    });

    it('should fail validation when both target and targetexpr are provided', () => {
      const sendJSON = {
        event: 'testEvent',
        target: 'http://example.com',
        targetexpr: 'targetUrl'
      };

      const { success, node, error } = SendNode.createFromJSON(sendJSON);

      expect(success).toBe(false);
      expect(node).toBeUndefined();
      expect(error).toBeDefined();
    });

    it('should fail validation when both type and typeexpr are provided', () => {
      const sendJSON = {
        event: 'testEvent',
        target: 'http://example.com',
        type: 'http',
        typeexpr: "'http'"
      };

      const { success, node, error } = SendNode.createFromJSON(sendJSON);

      expect(success).toBe(false);
      expect(node).toBeUndefined();
      expect(error).toBeDefined();
    });
  });

  describe('#run', () => {
    it('should send event immediately when no delay is specified', async () => {
      // Arrange
      const currentState = { ...testState };
    
      const sendNode = new SendNode({
        send: {
          event: 'testEvent',
          target: 'http://example.com',
          type: 'test',
          content: '',
          children: []
        }
      }, mockRegistry);

      // Act
      const result = await sendNode.run(currentState);

      // Assert

      expect(result).toBe(currentState);
      expect(mockProcessor.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'testEvent',
          type: 'external'
        }),
        'http://example.com',
        expect.any(Object)
      );
    });

    it('should evaluate expressions for event name and target', async () => {
      const sendNode = new SendNode({
        send: {
          eventexpr: 'data.eventName',
          targetexpr: 'data.targetUrl',
          type: 'test',
          content: '',
          children: []
        }
      }, mockRegistry);

      await sendNode.run(testState);

      expect(mockProcessor.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'userUpdate'
        }),
        'http://target.example.com',
        expect.any(Object)
      );
    });

    it('should collect parameters from child param elements', async () => {
      const paramNode1 = new ParamNode({
        param: {
          name: 'userName',
          expr: 'data.user.name',
          content: '',
          children: []
        }
      });

      const paramNode2 = new ParamNode({
        param: {
          name: 'userEmail',
          expr: 'data.user.email',
          content: '',
          children: []
        }
      });

      const sendNode = new SendNode({
        send: {
          event: 'testEvent',
          target: 'http://example.com',
          type: 'test',
          content: '',
          children: [paramNode1, paramNode2]
        }
      }, mockRegistry);

      await sendNode.run(testState);

      expect(mockProcessor.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userName: 'John Doe',
            userEmail: 'john@example.com'
          })
        }),
        'http://example.com',
        expect.any(Object)
      );
    });

    it('should collect namelist data', async () => {
      const sendNode = new SendNode({
        send: {
          event: 'testEvent',
          target: 'http://example.com',
          type: 'test',
          namelist: 'data.user.name data.user.email',
          content: '',
          children: []
        }
      }, mockRegistry);

      await sendNode.run(testState);

      expect(mockProcessor.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            'data.user.name': 'John Doe',
            'data.user.email': 'john@example.com'
          })
        }),
        'http://example.com',
        expect.any(Object)
      );
    });

    it('should handle delay by using setTimeout', async () => {
      const sendNode = new SendNode({
        send: {
          event: 'delayedEvent',
          target: 'http://example.com',
          type: 'test',
          delay: '1000ms',
          content: '',
          children: []
        }
      }, mockRegistry);

      await sendNode.run(testState);

      // Event should not be sent immediately
      expect(mockProcessor.send).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Now the event should be sent
      expect(mockProcessor.send).toHaveBeenCalled();
    });

    it('should parse delay in seconds', async () => {
      const sendNode = new SendNode({
        send: {
          event: 'delayedEvent',
          target: 'http://example.com',
          type: 'test',
          delay: '2s',
          content: '',
          children: []
        }
      }, mockRegistry);

      await sendNode.run(testState);

      expect(mockProcessor.send).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2000);

      expect(mockProcessor.send).toHaveBeenCalled();
    });

    it('should evaluate delay expression', async () => {
      testState.data.delayValue = '500ms';

      const sendNode = new SendNode({
        send: {
          event: 'delayedEvent',
          target: 'http://example.com',
          type: 'test',
          delayexpr: 'data.delayValue',
          content: '',
          children: []
        }
      }, mockRegistry);

      await sendNode.run(testState);

      expect(mockProcessor.send).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);

      expect(mockProcessor.send).toHaveBeenCalled();
    });

    it('should generate unique send ID when not specified', async () => {
      const sendNode = new SendNode({
        send: {
          event: 'testEvent',
          target: 'http://example.com',
          type: 'test',
          content: '',
          children: []
        }
      }, mockRegistry);

      await sendNode.run(testState);

      expect(mockProcessor.send).toHaveBeenCalledWith(
        expect.objectContaining({
          sendid: expect.stringMatching(/^send_\d+_[a-z0-9]+$/)
        }),
        'http://example.com',
        expect.any(Object)
      );
    });

    it('should use specified send ID', async () => {
      const sendNode = new SendNode({
        send: {
          event: 'testEvent',
          target: 'http://example.com',
          type: 'test',
          id: 'custom-send-id',
          content: '',
          children: []
        }
      }, mockRegistry);

      await sendNode.run(testState);

      expect(mockProcessor.send).toHaveBeenCalledWith(
        expect.objectContaining({
          sendid: 'custom-send-id'
        }),
        'http://example.com',
        expect.any(Object)
      );
    });

    it('should store send ID in idlocation', async () => {
      const sendNode = new SendNode({
        send: {
          event: 'testEvent',
          target: 'http://example.com',
          type: 'test',
          idlocation: 'lastSendId',
          content: '',
          children: []
        }
      }, mockRegistry);

      const result = await sendNode.run(testState);

      expect(result.data.lastSendId).toMatch(/^send_\d+_[a-z0-9]+$/);
    });

    it('should handle processor send failure', async () => {
      mockProcessor.send = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('Network error')
      });

      const sendNode = new SendNode({
        send: {
          event: 'testEvent',
          target: 'http://example.com',
          type: 'test',
          content: '',
          children: []
        }
      }, mockRegistry);

      const result = await sendNode.run(testState);

      // Should add error event to pending events
      expect(result._pendingInternalEvents).toBeDefined();
      expect(result._pendingInternalEvents!.length).toBeGreaterThan(0);
      expect(result._pendingInternalEvents![0].name).toBe('error.communication');
    });

    it('should handle missing target error', async () => {
      const sendNode = new SendNode({
        send: {
          event: 'testEvent',
          type: 'test',
          content: '',
          children: []
        }
      }, mockRegistry);

      const result = await sendNode.run(testState);

      expect(result._pendingInternalEvents).toBeDefined();
      expect(result._pendingInternalEvents!.length).toBeGreaterThan(0);
      expect(result._pendingInternalEvents![0].name).toBe('error.communication');
    });

    it('should handle expression evaluation errors', async () => {
      const sendNode = new SendNode({
        send: {
          eventexpr: 'nonexistent.property',
          target: 'http://example.com',
          type: 'test',
          content: '',
          children: []
        }
      }, mockRegistry);

      const result = await sendNode.run(testState);

      expect(result._pendingInternalEvents).toBeDefined();
      expect(result._pendingInternalEvents!.length).toBeGreaterThan(0);
      expect(result._pendingInternalEvents![0].name).toBe('error.communication');
    });

    it('should handle invalid delay format', async () => {
      const sendNode = new SendNode({
        send: {
          event: 'testEvent',
          target: 'http://example.com',
          type: 'test',
          delay: 'invalid-delay',
          content: '',
          children: []
        }
      }, mockRegistry);

      const result = await sendNode.run(testState);

      expect(result._pendingInternalEvents).toBeDefined();
      expect(result._pendingInternalEvents!.length).toBeGreaterThan(0);
      expect(result._pendingInternalEvents![0].name).toBe('error.communication');
    });
  });

  describe('Integration with Default Processors', () => {
    it('[HTTP] should trigger an http request', async () => {
      // Arrange
      const currentState = { ...testState }

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'Okay'
      } as Response);

      const sendNode = new SendNode({
        send: {
          content: '',
          children: [],
          event: 'test-api',
          type: 'http',
          target: 'http://example.com',
          id: 'test-sendId'
        }
      })

      // Act
      const result = await sendNode.run(currentState);

      // Assert
      expect(fetchSpy).toHaveBeenCalled();
      expect(result._pendingInternalEvents).toContainEqual(
        expect.objectContaining({
          name: 'http.response'
        })
      )
    });

    it('[HTTP] should trigger an http request onentry', async () => {
      // Arrange
      const currentState = { ...testState }

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'Okay'
      } as Response);

      const sendNode = new SendNode({
        send: {
          content: '',
          children: [],
          event: 'test-api',
          type: 'http',
          target: 'http://example.com',
          id: 'test-sendId'
        }
      })

      const apiOnEntry = new OnEntryNode({
        onentry: {
          children: [sendNode],
          content: ''
        }
      })

      const apiCallState = new StateNode({
        state: {
          children: [apiOnEntry],
          content: '',
          id: 'callAPI'
        }
      })

      
      // Act
      const result = await apiCallState.mount(currentState);
      
      // Assert
      expect(fetchSpy).toHaveBeenCalled();
      expect(result.state._pendingInternalEvents?.length).toBe(1)
    });
  });

  describe('Integration with BaseExecutableNode', () => {
    it('should have correct static properties', () => {
      expect(SendNode.label).toBe('send');
      expect(SendNode.schema).toBeDefined();
    });

    it('should be marked as executable', () => {
      const { node } = SendNode.createFromJSON({
        event: 'testEvent',
        target: 'http://example.com'
      });

      expect(node!.isExecutable).toBe(true);
    });

    it('should inherit from BaseExecutableNode', () => {
      const { node } = SendNode.createFromJSON({
        event: 'testEvent',
        target: 'http://example.com'
      });

      expect(node!.label).toBe('send');
    });
  });
});
