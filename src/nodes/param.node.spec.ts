import { ParamNode, collectParamValues } from './param.node';
import { InternalState } from '../models/internalState';
import SimpleXML from 'simple-xml-to-json';

describe('Node: <param>', () => {
  let testState: InternalState;

  beforeEach(() => {
    testState = {
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        },
        message: 'Hello World',
        count: 42,
      },
      _datamodel: 'ecmascript',
      _event: {
        name: 'test',
        type: 'external',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {},
      },
      _name: 'testStateMachine',
      _sessionId: 'test-session',
    };
  });

  describe('#createFromJSON', () => {
    it('should create a ParamNode instance from XML with expr attribute', () => {
      const paramXML = `<param name="userName" expr="user.name"/>`;
      const json = SimpleXML.convertXML(paramXML);

      const { success, node, error } = ParamNode.createFromJSON(json);

      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(ParamNode);
      expect(node!.name).toBe('userName');
      expect(node!.expr).toBe('user.name');
    });

    it('should create a ParamNode instance from XML with location attribute', () => {
      const paramXML = `<param name="userEmail" location="user.email"/>`;
      const json = SimpleXML.convertXML(paramXML);

      const { success, node, error } = ParamNode.createFromJSON(json);

      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(ParamNode);
      expect(node!.name).toBe('userEmail');
      expect(node!.location).toBe('user.email');
    });

    it('should create a ParamNode instance from XML with content', () => {
      const paramXML = `<param name="greeting">Hello World</param>`;
      const json = SimpleXML.convertXML(paramXML);

      const { success, node, error } = ParamNode.createFromJSON(json);

      if (!success) {
        console.log('Validation error:', error);
        console.log('JSON:', JSON.stringify(json, null, 2));
      }

      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(ParamNode);
      expect(node!.name).toBe('greeting');
      expect(node!.content).toBe('Hello World');
    });

    it('should create a ParamNode instance from JSON object', () => {
      const paramJSON = {
        name: 'testParam',
        expr: 'count * 2',
        content: '',
        children: [],
      };

      const { success, node, error } = ParamNode.createFromJSON(paramJSON);

      expect(success).toBe(true);
      expect(error).toBeUndefined();
      expect(node).toBeInstanceOf(ParamNode);
      expect(node!.name).toBe('testParam');
      expect(node!.expr).toBe('count * 2');
    });

    it('should fail validation when name is missing', () => {
      const paramJSON = {
        expr: 'user.name',
        content: '',
        children: [],
      };

      const { success, node, error } = ParamNode.createFromJSON(paramJSON);

      expect(success).toBe(false);
      expect(node).toBeUndefined();
      expect(error).toBeDefined();
    });

    it('should fail validation when multiple value sources are provided', () => {
      const paramJSON = {
        name: 'testParam',
        expr: 'user.name',
        location: 'user.email',
        content: '',
        children: [],
      };

      const { success, node, error } = ParamNode.createFromJSON(paramJSON);

      expect(success).toBe(false);
      expect(node).toBeUndefined();
      expect(error).toBeDefined();
    });

    it('should fail validation when no value source is provided', () => {
      const paramJSON = {
        name: 'testParam',
        content: '',
        children: [],
      };

      const { success, node, error } = ParamNode.createFromJSON(paramJSON);

      expect(success).toBe(false);
      expect(node).toBeUndefined();
      expect(error).toBeDefined();
    });
  });

  describe('#run', () => {
    it('should return state unchanged (ParamNode execution is handled by parent)', async () => {
      const { node } = ParamNode.createFromJSON({
        name: 'testParam',
        expr: 'user.name',
        content: '',
        children: [],
      });

      const result = await node!.run(testState);

      expect(result).toBe(testState);
    });
  });

  describe('#evaluateValue', () => {
    it('should evaluate expression and return value', async () => {
      const { node } = ParamNode.createFromJSON({
        name: 'userName',
        expr: 'data.user.name',
        content: '',
        children: [],
      });

      const value = await node!.evaluateValue(testState);

      expect(value).toBe('John Doe');
    });

    it('should evaluate location expression and return value', async () => {
      const { node } = ParamNode.createFromJSON({
        name: 'userAge',
        location: 'data.user.age',
        content: '',
        children: [],
      });

      const value = await node!.evaluateValue(testState);

      expect(value).toBe(30);
    });

    it('should return content when no expression is provided', async () => {
      const result = ParamNode.createFromJSON({
        name: 'greeting',
        content: 'Hello World',
        children: [],
      });

      expect(result.success).toBe(true);
      expect(result.node).toBeDefined();

      const value = await result.node!.evaluateValue(testState);

      expect(value).toBe('Hello World');
    });

    it('should return child content when children are present', async () => {
      const paramNode = new ParamNode({
        param: {
          name: 'message',
          content: '',
          children: [
            { content: 'Hello ', children: [] },
            { content: 'World!', children: [] },
          ],
        },
      });

      const value = await paramNode.evaluateValue(testState);

      expect(value).toBe('Hello World!');
    });

    it('should throw error when expression evaluation fails', async () => {
      const { node } = ParamNode.createFromJSON({
        name: 'invalidParam',
        expr: 'nonexistent.property',
        content: '',
        children: [],
      });

      await expect(node!.evaluateValue(testState)).rejects.toThrow(
        "Failed to evaluate param 'invalidParam'",
      );
    });

    it('should evaluate complex expressions', async () => {
      const { node } = ParamNode.createFromJSON({
        name: 'calculation',
        expr: 'data.user.age * 2 + data.count',
        content: '',
        children: [],
      });

      const value = await node!.evaluateValue(testState);

      expect(value).toBe(102); // 30 * 2 + 42
    });
  });

  describe('#getNameValuePair', () => {
    it('should return name-value pair tuple', async () => {
      const { node } = ParamNode.createFromJSON({
        name: 'userEmail',
        expr: 'data.user.email',
        content: '',
        children: [],
      });

      const [name, value] = await node!.getNameValuePair(testState);

      expect(name).toBe('userEmail');
      expect(value).toBe('john@example.com');
    });

    it('should handle evaluation errors in name-value pair', async () => {
      const { node } = ParamNode.createFromJSON({
        name: 'invalidParam',
        expr: 'nonexistent.property',
        content: '',
        children: [],
      });

      await expect(node!.getNameValuePair(testState)).rejects.toThrow(
        "Failed to evaluate param 'invalidParam'",
      );
    });
  });

  describe('collectParamValues utility function', () => {
    let paramNodes: ParamNode[];

    beforeEach(() => {
      const param1 = ParamNode.createFromJSON({
        name: 'userName',
        expr: 'data.user.name',
        content: '',
        children: [],
      }).node!;

      const param2 = ParamNode.createFromJSON({
        name: 'userAge',
        expr: 'data.user.age',
        content: '',
        children: [],
      }).node!;

      const param3 = ParamNode.createFromJSON({
        name: 'greeting',
        content: 'Hello World',
        children: [],
      }).node!;

      paramNodes = [param1, param2, param3];
    });

    it('should collect all parameter values into an object', async () => {
      const params = await collectParamValues(paramNodes, testState);

      expect(params).toEqual({
        userName: 'John Doe',
        userAge: 30,
        greeting: 'Hello World',
      });
    });

    it('should handle empty parameter array', async () => {
      const params = await collectParamValues([], testState);

      expect(params).toEqual({});
    });

    it('should throw error when parameter evaluation fails', async () => {
      const invalidParam = ParamNode.createFromJSON({
        name: 'invalidParam',
        expr: 'nonexistent.property',
        content: '',
        children: [],
      }).node!;

      const paramsWithError = [...paramNodes, invalidParam];

      await expect(
        collectParamValues(paramsWithError, testState),
      ).rejects.toThrow("Failed to collect parameter 'invalidParam'");
    });

    it('should handle parameters with different value sources', async () => {
      const mixedParams = [
        ParamNode.createFromJSON({
          name: 'fromExpr',
          expr: 'data.count',
          content: '',
          children: [],
        }).node!,
        ParamNode.createFromJSON({
          name: 'fromLocation',
          location: 'data.message',
          content: '',
          children: [],
        }).node!,
        ParamNode.createFromJSON({
          name: 'fromContent',
          content: 'Static Value',
          children: [],
        }).node!,
      ];

      const params = await collectParamValues(mixedParams, testState);

      expect(params).toEqual({
        fromExpr: 42,
        fromLocation: 'Hello World',
        fromContent: 'Static Value',
      });
    });
  });

  describe('Integration with BaseExecutableNode', () => {
    it('should have correct static properties', () => {
      expect(ParamNode.label).toBe('param');
      expect(ParamNode.schema).toBeDefined();
    });

    it('should inherit from BaseExecutableNode', () => {
      const { node } = ParamNode.createFromJSON({
        name: 'testParam',
        expr: 'user.name',
        content: '',
        children: [],
      });

      expect(node!.label).toBe('param');
    });
  });
});
