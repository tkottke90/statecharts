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