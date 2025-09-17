import { DataNode } from './data.node';
import SimpleXML from 'simple-xml-to-json';

describe('Node: <data>', () => {
  describe('#createFromJSON', () => {
    it('should create a DataNode instance from XML', () => {
      // Arrange

      // Accepts XML and converts it to JSON
      const dataXML = `
        <data id="test">test</data>
      `;

      const json = SimpleXML.convertXML(dataXML);

      // Act
      const { success, node, error } = DataNode.createFromJSON(json);

      // Assert
      expect(error).toBeUndefined();
      expect(success).toBe(true);
      expect(node).toBeInstanceOf(DataNode);
    });

    it('should create a DataNode instance from JSON', () => {
      // Arrange

      // Accepts already parsed JSON or custom json schema
      const dataJSON = {
        id: 'test',
        content: 'test',
        type: 'text',
        src: undefined,
      };

      // Act
      const { success, node, error } = DataNode.createFromJSON(dataJSON);

      // Assert
      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(DataNode);
    });
  });

  describe('#run', () => {
    it('should add the data to the state', async () => {
      const { node } = DataNode.createFromJSON({
        data: {
          id: 'test',
          content: 'test',
          type: 'text',
          src: undefined,
        },
      });

      const state = await node!.run({ data: {} });

      expect(state).toEqual({
        data: {
          test: 'test',
        },
      });
    });
  });
});
