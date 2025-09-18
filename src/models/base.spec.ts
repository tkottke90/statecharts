import { DataNode } from '../nodes/data.node';
import { LogNode } from '../nodes/log.node';
import { AssignNode } from '../nodes/assign.node';
import { RaiseNode } from '../nodes/raise.node';
import { BaseNode } from './base';

describe('BaseNode', () => {
  it('should create a BaseNode instance', () => {
    // Arrange + Act
    const node = new BaseNode({ content: 'test', children: [] });

    // Assert
    expect(node).toBeInstanceOf(BaseNode);
  });

  describe('#executeAllChildren', () => {
    it('should return an async generator', () => {
      // Arrange
      const node = new BaseNode({
        content: 'test',
        children: [
          DataNode.createFromJSON({
            data: { content: 'test', children: [], id: 'test' },
          }).node,
        ],
      });

      // Act
      const generator = node.executeAllChildren({ data: {} });

      // Assert
      expect(generator).toHaveProperty('next');
    });

    it('should not modify the state if there are no children', async () => {
      // Arrange
      const node = new BaseNode({ content: 'test', children: [] });

      // Act
      const state = await node.run({ data: {} });

      // Assert
      expect(state).toEqual({ data: {} });
    });
  });

  describe('#getChildrenOfType', () => {
    it('should return an array of children of the specified type', () => {
      // Arrange
      const baseNode = new BaseNode({
        content: 'test',
        children: [
          DataNode.createFromJSON({
            data: { content: 'test', children: [], id: 'test' },
          }).node,
        ],
      });

      // Act
      const children = baseNode.getChildrenOfType(DataNode);

      // Assert
      expect(children).toEqual([
        DataNode.createFromJSON({
          data: { content: 'test', children: [], id: 'test' },
        }).node,
      ]);
    });
  });

  describe('toString Method', () => {
    describe('Basic functionality', () => {
      it('should return class name for basic node', () => {
        const node = new BaseNode({ content: '', children: [] });
        const result = node.toString();
        expect(result).toBe('<base/>');
      });

      it('should include content when present', () => {
        const node = new BaseNode({ content: 'Hello World', children: [] });
        const result = node.toString();
        expect(result).toBe('<base>Hello World</base>');
      });

      it('should handle empty content', () => {
        const node = new BaseNode({ content: '', children: [] });
        const result = node.toString();
        expect(result).toBe('<base/>');
      });

      it('should handle whitespace-only content', () => {
        const node = new BaseNode({ content: '   ', children: [] });
        const result = node.toString();
        expect(result).toBe('<base>   </base>');
      });
    });

    describe('LogNode integration', () => {
      it('should display LogNode with expr and label', () => {
        const result = LogNode.createFromJSON({
          log: {
            label: 'DEBUG',
            expr: 'data.counter'
          }
        });

        expect(result.success).toBe(true);
        const str = result.node!.toString();
        expect(str).toBe('<log logLabel="DEBUG" expr="data.counter"/>');
      });

      it('should display LogNode with content', () => {
        const result = LogNode.createFromJSON({
          log: {
            content: 'Static message'
          }
        });

        expect(result.success).toBe(true);
        const str = result.node!.toString();
        expect(str).toBe('<log>Static message</log>');
      });

      it('should display LogNode with label and content', () => {
        const result = LogNode.createFromJSON({
          log: {
            label: 'INFO',
            content: 'Application started'
          }
        });

        expect(result.success).toBe(true);
        const str = result.node!.toString();
        expect(str).toBe('<log logLabel="INFO">Application started</log>');
      });

      it('should handle LogNode with empty content', () => {
        const result = LogNode.createFromJSON({
          log: {
            content: ''
          }
        });

        expect(result.success).toBe(true);
        const str = result.node!.toString();
        expect(result.node!.content).toBe('');
        expect(str).toBe('<log/>');
      });
    });

    describe('AssignNode integration', () => {
      it('should display AssignNode with location and expr', () => {
        const result = AssignNode.createFromJSON({
          assign: {
            location: 'data.counter',
            expr: 'data.counter + 1'
          }
        });

        expect(result.success).toBe(true);
        const str = result.node!.toString();
        expect(str).toBe('<assign location="data.counter" expr="data.counter + 1"/>');
      });

      it('should display AssignNode with location and content', () => {
        const result = AssignNode.createFromJSON({
          assign: {
            location: 'data.message',
            content: 'Hello World',
            children: []
          }
        });

        expect(result.success).toBe(true);
        const str = result.node!.toString();
        expect(str).toBe('<assign location="data.message">Hello World</assign>');
      });
    });

    describe('RaiseNode integration', () => {
      it('should display RaiseNode with event', () => {
        const result = RaiseNode.createFromJSON({
          raise: {
            event: 'test.event'
          }
        });

        expect(result.success).toBe(true);
        const str = result.node!.toString();
        expect(str).toBe('<raise event="test.event"/>');
      });

      it('should display RaiseNode with eventexpr', () => {
        const result = RaiseNode.createFromJSON({
          raise: {
            eventexpr: "'dynamic.' + data.type"
          }
        });

        expect(result.success).toBe(true);
        const str = result.node!.toString();
        expect(str).toBe('<raise eventexpr="\'dynamic.\' + data.type"/>');
      });
    });

    describe('Edge cases', () => {
      it('should handle nodes with multiple attributes', () => {
        // Create a mock node with multiple attributes
        class MockNode extends BaseNode {
          static label = 'mock';
          id = 'test-id';
          target = 'target-state';
          event = 'test-event';
          expr = 'data.value';
          location = 'data.result';
          logLabel = 'DEBUG';

          constructor() {
            super({ content: '', children: [] });
          }
        }

        const node = new MockNode();
        const str = node.toString();
        expect(str).toContain('<mock');
        expect(str).toContain('id="test-id"');
        expect(str).toContain('target="target-state"');
        expect(str).toContain('event="test-event"');
        expect(str).toContain('expr="data.value"');
        expect(str).toContain('location="data.result"');
        expect(str).toContain('logLabel="DEBUG"');
        expect(str).toContain('/>');
      });

      it('should handle nodes with no special attributes', () => {
        class SimpleNode extends BaseNode {
          static label = 'simple';

          constructor() {
            super({ content: '', children: [] });
          }
        }

        const node = new SimpleNode();
        const str = node.toString();
        expect(str).toBe('<simple/>');
      });

      it('should handle nodes with content and attributes', () => {
        class ContentNode extends BaseNode {
          static label = 'content';
          id = 'content-id';

          constructor() {
            super({ content: 'Node content', children: [] });
          }
        }

        const node = new ContentNode();
        const str = node.toString();
        expect(str).toBe('<content id="content-id">Node content</content>');
      });

      it('should show both expr and content when both are present', () => {
        class ExprContentNode extends BaseNode {
          static label = 'exprContent';
          expr = 'data.value';

          constructor() {
            super({ content: 'This should be shown', children: [] });
          }
        }

        const node = new ExprContentNode();
        const str = node.toString();
        expect(str).toBe('<exprContent expr="data.value">This should be shown</exprContent>');
        expect(str).toContain('This should be shown');
      });

      it('should handle nodes inheriting base label', () => {
        class CustomNode extends BaseNode {
          constructor() {
            super({ content: '', children: [] });
          }
        }

        const node = new CustomNode();
        const str = node.toString();
        // Since CustomNode extends BaseNode, it inherits the 'base' label
        expect(str).toBe('<base/>');
      });

      it('should handle undefined attributes gracefully', () => {
        class UndefinedAttrsNode extends BaseNode {
          static label = 'undefined';
          id = undefined;
          target = undefined;
          event = undefined;

          constructor() {
            super({ content: '', children: [] });
          }
        }

        const node = new UndefinedAttrsNode();
        const str = node.toString();
        expect(str).toBe('<undefined/>');
      });
    });
  });
});
