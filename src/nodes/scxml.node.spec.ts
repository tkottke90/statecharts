import { SCXMLNode } from './scxml.node';

describe('Node: <scxml>', () => {
  describe('constructor', () => {
    it('should create SCXMLNode with minimal attributes', () => {
      const node = new SCXMLNode({
        scxml: {
          content: '',
          children: [],
          version: '1.0',
          datamodel: 'ecmascript'
        }
      });

      expect(node.version).toBe('1.0');
      expect(node.initial).toBe('');
      expect(node.name).toBe('');
      expect(node.datamodel).toBe('ecmascript');
    });

    it('should create SCXMLNode with all attributes', () => {
      const node = new SCXMLNode({
        scxml: {
          content: '',
          children: [],
          version: '1.1',
          initial: 'start',
          name: 'MyStateMachine',
          datamodel: 'ecmascript'
        }
      });

      expect(node.version).toBe('1.1');
      expect(node.initial).toBe('start');
      expect(node.name).toBe('MyStateMachine');
      expect(node.datamodel).toBe('ecmascript');
    });

    it('should use default version when not specified in constructor', () => {
      const node = new SCXMLNode({
        scxml: {
          content: '',
          children: [],
          version: '1.0', // Constructor requires explicit version
          datamodel: 'ecmascript'
        }
      });

      expect(node.version).toBe('1.0');
    });
  });

  describe('createFromJSON', () => {
    it('should create SCXMLNode from valid JSON with minimal attributes', () => {
      const result = SCXMLNode.createFromJSON({
        scxml: {
          version: '1.0'
        }
      });

      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(SCXMLNode);
      expect(result.node?.version).toBe('1.0');
      expect(result.error).toBeUndefined();
    });

    it('should create SCXMLNode from valid JSON with all attributes', () => {
      const result = SCXMLNode.createFromJSON({
        scxml: {
          version: '1.1',
          initial: 'idle',
          name: 'TestMachine',
          datamodel: 'xpath'
        }
      });

      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(SCXMLNode);
      expect(result.node?.version).toBe('1.1');
      expect(result.node?.initial).toBe('idle');
      expect(result.node?.name).toBe('TestMachine');
      expect(result.node?.datamodel).toBe('xpath');
      expect(result.error).toBeUndefined();
    });

    it('should use default version when not specified', () => {
      const result = SCXMLNode.createFromJSON({
        scxml: {}
      });

      expect(result.success).toBe(true);
      expect(result.node?.version).toBe('1.0');
    });

    it('should fail validation with invalid version', () => {
      const result = SCXMLNode.createFromJSON({
        scxml: {
          version: '2.0'
        }
      });

      expect(result.success).toBe(false);
      expect(result.node).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should fail validation with invalid datamodel', () => {
      const result = SCXMLNode.createFromJSON({
        scxml: {
          version: '1.0',
          datamodel: 'invalid'
        }
      });

      expect(result.success).toBe(false);
      expect(result.node).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('datamodel attribute', () => {
    it('should accept null datamodel', () => {
      const result = SCXMLNode.createFromJSON({
        scxml: {
          version: '1.0',
          datamodel: 'null'
        }
      });

      expect(result.success).toBe(true);
      expect(result.node?.datamodel).toBe('null');
    });

    it('should accept ecmascript datamodel', () => {
      const result = SCXMLNode.createFromJSON({
        scxml: {
          version: '1.0',
          datamodel: 'ecmascript'
        }
      });

      expect(result.success).toBe(true);
      expect(result.node?.datamodel).toBe('ecmascript');
    });

    it('should accept xpath datamodel', () => {
      const result = SCXMLNode.createFromJSON({
        scxml: {
          version: '1.0',
          datamodel: 'xpath'
        }
      });

      expect(result.success).toBe(true);
      expect(result.node?.datamodel).toBe('xpath');
    });

    it('should reject invalid datamodel values', () => {
      const result = SCXMLNode.createFromJSON({
        scxml: {
          version: '1.0',
          datamodel: 'python'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});