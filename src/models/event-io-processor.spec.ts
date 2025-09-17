import { EventEmitter } from 'events';
import {
  defaultProcessorRegistry,
  EventIOProcessor,
  EventIOProcessorRegistry,
  HTTPProcessor,
  SCXMLProcessor
} from './event-io-processor';
import { SCXMLEvent } from './internalState';

// Declare global fetch for testing
declare const global: {
  fetch: jest.Mock;
};

// Mock fetch for HTTP processor tests
global.fetch = jest.fn();

describe('EventIOProcessor System', () => {
  let registry: EventIOProcessorRegistry;
  let mockProcessor: EventIOProcessor;
  let testEvent: SCXMLEvent;

  beforeEach(() => {
    registry = new EventIOProcessorRegistry();
    
    // Create mock processor
    mockProcessor = {
      type: 'test',
      send: jest.fn().mockResolvedValue({ success: true, sendid: 'test-123' }),
      canHandle: jest.fn().mockReturnValue(true),
      initialize: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined)
    };

    // Create test event
    testEvent = {
      name: 'testEvent',
      type: 'external',
      sendid: 'test-send-id',
      origin: '',
      origintype: '',
      invokeid: '',
      data: { message: 'Hello World' }
    };

    // Clear fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    // Only clear if not already cleared by the test
    if (registry.size > 0) {
      registry.clear();
    }
  });

  describe('EventIOProcessorRegistry', () => {
    describe('#register', () => {
      it('should register a processor successfully', () => {
        registry.register(mockProcessor);
        
        expect(registry.has('test')).toBe(true);
        expect(registry.get('test')).toBe(mockProcessor);
        expect(registry.size).toBe(1);
      });

      it('should emit processorRegistered event', (done) => {
        registry.on('processorRegistered', (type, processor) => {
          expect(type).toBe('test');
          expect(processor).toBe(mockProcessor);
          done();
        });

        registry.register(mockProcessor);
      });

      it('should throw error when registering duplicate type', () => {
        registry.register(mockProcessor);
        
        expect(() => {
          registry.register(mockProcessor);
        }).toThrow("Event I/O Processor with type 'test' is already registered");
      });
    });

    describe('#unregister', () => {
      beforeEach(() => {
        registry.register(mockProcessor);
      });

      it('should unregister a processor successfully', () => {
        const result = registry.unregister('test');
        
        expect(result).toBe(true);
        expect(registry.has('test')).toBe(false);
        expect(registry.size).toBe(0);
      });

      it('should emit processorUnregistered event', (done) => {
        registry.on('processorUnregistered', (type, processor) => {
          expect(type).toBe('test');
          expect(processor).toBe(mockProcessor);
          done();
        });

        registry.unregister('test');
      });

      it('should call cleanup on processor if available', async () => {
        registry.unregister('test');

        // Wait for next tick to allow async cleanup
        await Promise.resolve();

        expect(mockProcessor.cleanup).toHaveBeenCalled();
      });

      it('should return false when unregistering non-existent processor', () => {
        const result = registry.unregister('nonexistent');
        expect(result).toBe(false);
      });
    });

    describe('#setDefault and #getDefault', () => {
      it('should set and get default processor', () => {
        registry.setDefault(mockProcessor);
        
        expect(registry.getDefault()).toBe(mockProcessor);
      });

      it('should emit defaultProcessorSet event', (done) => {
        registry.on('defaultProcessorSet', (type, processor) => {
          expect(type).toBe('test');
          expect(processor).toBe(mockProcessor);
          done();
        });

        registry.setDefault(mockProcessor);
      });
    });

    describe('#send', () => {
      beforeEach(() => {
        registry.register(mockProcessor);
      });

      it('should send using specified processor type', async () => {
        const result = await registry.send(testEvent, 'test://target', 'test');
        
        expect(result.success).toBe(true);
        expect(mockProcessor.send).toHaveBeenCalledWith(testEvent, 'test://target', undefined);
      });

      it('should return error for unregistered processor type', async () => {
        const result = await registry.send(testEvent, 'test://target', 'nonexistent');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("No Event I/O Processor registered for type 'nonexistent'");
      });

      it('should auto-detect processor using canHandle', async () => {
        const result = await registry.send(testEvent, 'test://target');
        
        expect(result.success).toBe(true);
        expect(mockProcessor.canHandle).toHaveBeenCalledWith('test://target');
        expect(mockProcessor.send).toHaveBeenCalled();
      });

      it('should use default processor when no specific handler found', async () => {
        mockProcessor.canHandle = jest.fn().mockReturnValue(false);
        registry.setDefault(mockProcessor);
        
        const result = await registry.send(testEvent, 'unknown://target');
        
        expect(result.success).toBe(true);
        expect(mockProcessor.send).toHaveBeenCalled();
      });

      it('should return error when no suitable processor found', async () => {
        mockProcessor.canHandle = jest.fn().mockReturnValue(false);
        
        const result = await registry.send(testEvent, 'unknown://target');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("No suitable Event I/O Processor found");
      });

      it('should emit eventSent event on success', (done) => {
        registry.on('eventSent', (event, target, type, result) => {
          expect(event).toBe(testEvent);
          expect(target).toBe('test://target');
          expect(type).toBe('test');
          expect(result.success).toBe(true);
          done();
        });

        registry.send(testEvent, 'test://target', 'test');
      });

      it('should emit sendError event on failure', (done) => {
        const error = new Error('Send failed');
        mockProcessor.send = jest.fn().mockRejectedValue(error);

        registry.on('sendError', (event, target, type, sendError) => {
          expect(event).toBe(testEvent);
          expect(target).toBe('test://target');
          expect(type).toBe('test');
          expect(sendError).toBe(error);
          done();
        });

        registry.send(testEvent, 'test://target', 'test');
      });
    });

    describe('#clear', () => {
      it('should clear all processors and default', () => {
        registry.register(mockProcessor);
        registry.setDefault(mockProcessor);

        registry.clear();

        expect(registry.size).toBe(0);
        expect(registry.getDefault()).toBeUndefined();
      });

      it('should emit registryCleared event', (done) => {
        registry.register(mockProcessor);
        registry.setDefault(mockProcessor);

        registry.on('registryCleared', (types) => {
          expect(types).toEqual(['test']);
          done();
        });

        registry.clear();
      });

      it('should call cleanup on all processors', async () => {
        registry.register(mockProcessor);
        registry.setDefault(mockProcessor);

        registry.clear();

        // Wait for next tick to allow async cleanup
        await Promise.resolve();

        expect(mockProcessor.cleanup).toHaveBeenCalled();
      });
    });
  });

  describe('HTTPProcessor', () => {
    let httpProcessor: HTTPProcessor;

    beforeEach(() => {
      httpProcessor = new HTTPProcessor();
    });

    describe('#canHandle', () => {
      it('should handle HTTP URLs', () => {
        expect(httpProcessor.canHandle('http://example.com')).toBe(true);
        expect(httpProcessor.canHandle('https://example.com')).toBe(true);
      });

      it('should not handle non-HTTP URLs', () => {
        expect(httpProcessor.canHandle('ws://example.com')).toBe(false);
        expect(httpProcessor.canHandle('scxml:target')).toBe(false);
      });
    });

    describe('#send', () => {
      it('should make HTTP GET request by default', async () => {
        const mockResponse = { ok: true, status: 200, statusText: 'OK' };
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

        const result = await httpProcessor.send(testEvent, 'http://example.com/api');

        expect(result.success).toBe(true);
        expect(fetchSpy).toHaveBeenCalledWith(
          'http://example.com/api',
          expect.objectContaining({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });

      it('should use custom HTTP method from config', async () => {
        const mockResponse = { ok: true, status: 200, statusText: 'OK' };
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

        await httpProcessor.send(testEvent, 'http://example.com/api', { method: 'PUT' });

        expect(fetchSpy).toHaveBeenCalledWith(
          'http://example.com/api',
          expect.objectContaining({ method: 'PUT' })
        );
      });

      it('should handle HTTP error responses', async () => {
        const mockResponse = { ok: false, status: 404, statusText: 'Not Found' };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const result = await httpProcessor.send(testEvent, 'http://example.com/api');

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('HTTP 404: Not Found');
      });

      it('should handle network errors', async () => {
        const networkError = new Error('Network error');
        (global.fetch as jest.Mock).mockRejectedValue(networkError);

        const result = await httpProcessor.send(testEvent, 'http://example.com/api');

        expect(result.success).toBe(false);
        expect(result.error).toBe(networkError);
      });
    });
  });

  describe('SCXMLProcessor', () => {
    let scxmlProcessor: SCXMLProcessor;
    let targetEmitter: EventEmitter;

    beforeEach(() => {
      scxmlProcessor = new SCXMLProcessor();
      targetEmitter = new EventEmitter();
      scxmlProcessor.registerTarget('testTarget', targetEmitter);
    });

    describe('#canHandle', () => {
      it('should handle SCXML targets', () => {
        expect(scxmlProcessor.canHandle('scxml:testTarget')).toBe(true);
        expect(scxmlProcessor.canHandle('#_internal')).toBe(true);
      });

      it('should not handle non-SCXML targets', () => {
        expect(scxmlProcessor.canHandle('http://example.com')).toBe(false);
        expect(scxmlProcessor.canHandle('ws://example.com')).toBe(false);
      });
    });

    describe('#send', () => {
      it('should send to registered SCXML target', async () => {
        const eventSpy = jest.fn();
        targetEmitter.on('scxmlEvent', eventSpy);

        const result = await scxmlProcessor.send(testEvent, 'scxml:testTarget');

        expect(result.success).toBe(true);
        expect(eventSpy).toHaveBeenCalledWith(testEvent);
      });

      it('should send to internal target', async () => {
        scxmlProcessor.registerTarget('_internal', targetEmitter);
        const eventSpy = jest.fn();
        targetEmitter.on('scxmlEvent', eventSpy);

        const result = await scxmlProcessor.send(testEvent, '#_internal');

        expect(result.success).toBe(true);
        expect(eventSpy).toHaveBeenCalledWith(testEvent);
      });

      it('should return error for unregistered target', async () => {
        const result = await scxmlProcessor.send(testEvent, 'scxml:unknownTarget');

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("SCXML target 'unknownTarget' not found");
      });

      it('should return error for invalid target format', async () => {
        const result = await scxmlProcessor.send(testEvent, 'invalid:target');

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Invalid SCXML target format');
      });
    });

    describe('#registerTarget and #unregisterTarget', () => {
      it('should register and unregister targets', () => {
        const newEmitter = new EventEmitter();
        
        scxmlProcessor.registerTarget('newTarget', newEmitter);
        // Test by trying to send to it
        expect(scxmlProcessor.send(testEvent, 'scxml:newTarget')).resolves.toEqual(
          expect.objectContaining({ success: true })
        );

        scxmlProcessor.unregisterTarget('newTarget');
        // Test that it's no longer available
        expect(scxmlProcessor.send(testEvent, 'scxml:newTarget')).resolves.toEqual(
          expect.objectContaining({ success: false })
        );
      });
    });
  });

  describe('defaultProcessorRegistry', () => {
    it('should have HTTP and SCXML processors registered by default', () => {
      expect(defaultProcessorRegistry.has('http')).toBe(true);
      expect(defaultProcessorRegistry.has('scxml')).toBe(true);
      expect(defaultProcessorRegistry.getDefault()?.type).toBe('http');
    });
  });
});
