import { DataNode } from "../nodes/data.node";
import { BaseNode } from "./base";


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
      const node = new BaseNode({ content: 'test', children: [
        DataNode.createFromJSON({ data: { content: 'test', children: [], id: 'test' } }).node
      ] });

      // Act
      const generator = node.executeAllChildren({});

      // Assert
      expect(generator).toHaveProperty('next');
    });

    it('should not modify the state if there are no children', async () => {
      // Arrange
      const node = new BaseNode({ content: 'test', children: [] });

      // Act
      const state = await node.run({});

      // Assert
      expect(state).toEqual({});
    });

    it('should yield the child node and state after each step', async () => {
      // Arrange
      const baseNode = new BaseNode({ content: 'test', children: [
        DataNode.createFromJSON({ data: { content: 'test', children: [], id: 'test' } }).node
      ] });

      // Allow children
      baseNode.allowChildren = true;

      // Act
      const generator = baseNode.executeAllChildren({});
      const { value, done } = await generator.next();

      // Assert
      expect(done).toBe(false);
      expect(value?.node).toBe('DataNode');
      expect(value?.state).toEqual({
        test: 'test'
      });
    });
  });


  describe('#getChildrenOfType', () => {
    it('should return an array of children of the specified type', () => {
      // Arrange
      const baseNode = new BaseNode({ content: 'test', children: [
        DataNode.createFromJSON({ data: { content: 'test', children: [], id: 'test' } }).node
      ] });

      // Act
      const children = baseNode.getChildrenOfType(DataNode);

      // Assert
      expect(children).toEqual([DataNode.createFromJSON({ data: { content: 'test', children: [], id: 'test' } }).node]);
    });
  });
});