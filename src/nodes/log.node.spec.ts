import { LogNode } from './log.node';
import { InternalState } from '../models/internalState';

// Helper function to create LogNode instances for testing
function createLogNode(attributes: Partial<{ expr?: string; label?: string; content?: string }>): LogNode {
  return new LogNode({
    log: {
      expr: attributes.expr,
      label: attributes.label,
      content: attributes.content || '',
      children: []
    }
  });
}

describe('LogNode', () => {
  let mockConsoleLog: jest.SpyInstance;
  let testState: InternalState;

  beforeEach(() => {
    // Mock console.log to capture output
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create test state
    testState = {
      configuration: ['test'],
      data: {
        counter: 42,
        message: 'Hello World',
        items: ['a', 'b', 'c'],
        user: { name: 'John', age: 30 }
      },
      _event: {
        name: 'test.event',
        type: 'internal',
        data: { value: 123 }
      },
      _name: 'testState',
      _datamodel: 'ecmascript'
    };
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe('Schema Validation', () => {
    it('should accept valid log node with expr attribute', () => {
      const result = LogNode.createFromJSON({
        log: {
          expr: "'Hello World'",
          content: '',
          children: []
        }
      });

      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(LogNode);
      expect(result.node?.expr).toBe("'Hello World'");
    });

    it('should accept valid log node with label and expr', () => {
      const result = LogNode.createFromJSON({
        log: {
          label: 'Debug',
          expr: 'data.counter',
          content: '',
          children: []
        }
      });

      expect(result.success).toBe(true);
      expect(result.node?.logLabel).toBe('Debug');
      expect(result.node?.expr).toBe('data.counter');
    });

    it('should accept valid log node with text content', () => {
      const result = LogNode.createFromJSON({
        log: {
          content: 'Static log message',
          children: []
        }
      });

      expect(result.success).toBe(true);
      expect(result.node?.content).toBe('Static log message');
    });

    it('should accept log node with both label and content', () => {
      const result = LogNode.createFromJSON({
        log: {
          label: 'Info',
          content: 'Application started',
          children: []
        }
      });

      expect(result.success).toBe(true);
      expect(result.node?.logLabel).toBe('Info');
      expect(result.node?.content).toBe('Application started');
    });

    it('should reject log node without expr or content', () => {
      const result = LogNode.createFromJSON({
        log: {
          label: 'Empty',
          children: []
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept empty string as valid content', () => {
      const result = LogNode.createFromJSON({
        log: {
          content: '',
          children: []
        }
      });

      expect(result.success).toBe(true);
      expect(result.node?.content).toBe('');
    });
  });

  describe('Expression Logging', () => {
    it('should log simple string expression', async () => {
      const node = createLogNode({ expr: "'Hello World'" });

      await node.run(testState);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Hello World/)
      );
    });

    it('should log data model variable', async () => {
      const node = createLogNode({ expr: 'data.counter' });

      await node.run(testState);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] 42/)
      );
    });

    it('should log complex expression', async () => {
      const node = createLogNode({ expr: "'Counter value: ' + data.counter + ', Message: ' + data.message" });

      await node.run(testState);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/Counter value: 42, Message: Hello World/)
      );
    });

    it('should log object as JSON', async () => {
      const node = createLogNode({ expr: 'data.user' });

      await node.run(testState);

      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toContain('"name": "John"');
      expect(logCall).toContain('"age": 30');
    });

    it('should log array as JSON', async () => {
      const node = createLogNode({ expr: 'data.items' });

      await node.run(testState);

      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toContain('"a"');
      expect(logCall).toContain('"b"');
      expect(logCall).toContain('"c"');
    });

    it('should handle null values', async () => {
      const node = createLogNode({ expr: 'null' });

      await node.run(testState);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/null/)
      );
    });

    it('should handle undefined values', async () => {
      const node = createLogNode({ expr: 'data.nonexistent' });

      await node.run(testState);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/undefined/)
      );
    });
  });

  describe('Content Logging', () => {
    it('should log literal text content', async () => {
      const node = createLogNode({ content: 'Static log message' });

      await node.run(testState);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/Static log message/)
      );
    });

    it('should trim whitespace from content', async () => {
      const node = createLogNode({ content: '  \n  Trimmed message  \n  ' });

      await node.run(testState);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/Trimmed message/)
      );
    });

    it('should handle empty content', async () => {
      const node = createLogNode({ content: '' });

      await node.run(testState);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] $/)
      );
    });
  });

  describe('Label Formatting', () => {
    it('should include label in log output', async () => {
      const node = createLogNode({ label: 'DEBUG', expr: "'Test message'" });

      await node.run(testState);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[DEBUG\] Test message/)
      );
    });

    it('should format timestamp and label correctly', async () => {
      const node = createLogNode({ label: 'INFO', content: 'Application started' });

      await node.run(testState);

      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Application started$/);
    });

    it('should work without label', async () => {
      const node = createLogNode({ expr: "'No label message'" });

      await node.run(testState);

      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] No label message$/);
      expect(logCall).not.toContain('][');
    });
  });

  describe('Error Handling', () => {
    it('should handle expression evaluation errors gracefully', async () => {
      const node = createLogNode({ expr: 'invalid.expression.that.throws' });

      const result = await node.run(testState);

      // Should return state unchanged
      expect(result).toBe(testState);

      // Should log error message
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[LOG ERROR]')
      );
    });

    it('should handle circular reference objects', async () => {
      // Create circular reference
      const circular: any = { name: 'test' };
      circular.self = circular;

      const stateWithCircular = {
        ...testState,
        data: { ...testState.data, circular }
      };

      const node = createLogNode({ expr: 'data.circular' });

      await node.run(stateWithCircular);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Object - cannot stringify]')
      );
    });

    it('should not throw errors on logging failures', async () => {
      const node = createLogNode({ expr: 'throw new Error("Test error")' });

      // Should not throw
      await expect(node.run(testState)).resolves.toBe(testState);
    });
  });

  describe('State Immutability', () => {
    it('should return the same state object unchanged', async () => {
      const node = createLogNode({ expr: "'Test message'" });

      const result = await node.run(testState);

      expect(result).toBe(testState);
      expect(result).toEqual(testState);
    });

    it('should not modify state data', async () => {
      const originalData = { ...testState.data };

      const node = createLogNode({ expr: 'data.counter' });

      await node.run(testState);

      expect(testState.data).toEqual(originalData);
    });
  });

  describe('toString Method', () => {
    it('should provide meaningful string representation with expr', () => {
      const node = createLogNode({ label: 'DEBUG', expr: 'data.counter' });

      const str = node.toString();
      expect(str).toBe('<log expr="data.counter" label="DEBUG"/>');
    });

    it('should provide meaningful string representation with content', () => {
      const node = createLogNode({ label: 'INFO', content: 'Short message' });

      const str = node.toString();
      expect(str).toBe('<log label="INFO">Short message</log>');
    });

    it('should display long content without truncation', () => {
      const longContent = 'A'.repeat(100);
      const node = createLogNode({ content: longContent });

      const str = node.toString();
      expect(str).toBe(`<log>${longContent}</log>`);
      expect(str).toContain(longContent);
    });

    it('should work without label', () => {
      const node = createLogNode({ expr: "'test'" });

      const str = node.toString();
      expect(str).toBe('<log expr="\'test\'"/>');
    });
  });
});
