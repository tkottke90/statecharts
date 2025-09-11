import { DataNode } from './data.node';
import { DataModelNode } from './datamodel.node';
import SimpleXML from 'simple-xml-to-json';

describe('Node: <datamodel>', () => {

  describe('#createFromJSON', () => {
    it('should create a DataModelNode instance from XML', () => {
      // Arrange
      
      // Accepts XML and converts it to JSON
      const dataXML = `
        <datamodel>
        <data id="test">test</data>
        </datamodel>
      `;

      const json = SimpleXML.convertXML(dataXML);

      // Act
      const { success, node, error } = DataModelNode.createFromJSON(json);

      // Assert
      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(DataModelNode);
    });

    it('should create a DataModelNode instance from JSON', () => {
      // Arrange
      
      const { node: dataNode } = DataNode.createFromJSON({
        data: {
          id: 'test',
          content: 'test',
          type: 'text',
          src: undefined
        }
      });

      // Accepts already parsed JSON or custom json schema
      const dataJSON = {
        children: [dataNode]
      };

      // Act
      const { success, node, error } = DataModelNode.createFromJSON(dataJSON);

      // Assert
      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(DataModelNode);
    });
  });


  describe('#run', () => {
    it('should add the data to the state', async () => {
      const { node: dataNode } = DataNode.createFromJSON({
        data: {
          id: 'test',
          content: 'test',
          type: 'text',
          src: undefined
        }
      });

      const { node } = DataModelNode.createFromJSON({
        children: [dataNode]
      });

      const state = await node!.run({});

      expect(state).toEqual({
        test: 'test'
      });
    });
  });


});