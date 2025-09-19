
import { StateNode } from './state.node';
import SimpleXML from 'simple-xml-to-json';

describe('Node: <state>', () => {
  describe('#createFromJSON', () => {
    it('should create a StateNode instance from XML', () => {
      // Arrange

      // Accepts XML and converts it to JSON
      const stateXML = `
        <state id="test">test</state>
      `;

      const json = SimpleXML.convertXML(stateXML);

      // Act
      const { success, node, error } = StateNode.createFromJSON(json);

      // Assert
      expect(error).toBeUndefined();
      expect(success).toBe(true);
      expect(node).toBeInstanceOf(StateNode);
    });

    it('should create a StateNode instance from JSON', () => {
      // Arrange

      // Accepts already parsed JSON or custom json schema
      const stateJSON = {
        id: 'test',
        content: 'test',
        type: 'text',
        src: undefined,
      };

      // Act
      const { success, node, error } = StateNode.createFromJSON(stateJSON);

      // Assert
      expect(error).toBeUndefined();
      expect(success).toBe(true);
      expect(node).toBeInstanceOf(StateNode);
    });
  });
});
