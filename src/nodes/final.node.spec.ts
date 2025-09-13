import { FinalNode } from './final.node';
import SimpleXML from 'simple-xml-to-json';

describe('Node: <final>', () => {
  describe('#createFromJSON', () => {
    it('should create a FinalNode instance from XML', () => {
      // Arrange
      
      // Accepts XML and converts it to JSON
      const finalXML = `
        <final id="test"></final>
      `;

      const json = SimpleXML.convertXML(finalXML);

      // Act
      const { success, node, error } = FinalNode.createFromJSON(json);

      // Assert
      expect(error).toBeUndefined();
      expect(success).toBe(true);
      expect(node).toBeInstanceOf(FinalNode);
    });

    it('should create a FinalNode instance from JSON', () => {
      // Arrange
      
      // Accepts already parsed JSON or custom json schema
      const finalJSON = {
        id: 'test'
      };

      // Act
      const { success, node, error } = FinalNode.createFromJSON(finalJSON);

      // Assert
      expect(error).toBeUndefined();
      expect(success).toBe(true);
      expect(node).toBeInstanceOf(FinalNode);
    });
  });

  describe.skip('#run', () => {
    it('should return the current state', async () => {
      // Arrange
      const { node } = FinalNode.createFromJSON({
        final: {
          id: 'test'
        }
      });

      // Act
      const state = await node!.run({ data: {} });

      // Assert
      expect(state).toEqual({});
    });
  });
});