import { InitialNode } from './initial.node';

describe('Node: <initial>', () => {
  describe('#createFromJSON', () => {
    it('should create a InitialNode instance from JSON', () => {
      // Arrange
      
      // Accepts already parsed JSON or custom json schema
      const initialJSON = {
        content: 'test',
        children: []
      };

      // Act
      const { success, node, error } = InitialNode.createFromJSON(initialJSON);

      // Assert
      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(InitialNode);
    });
  });
});