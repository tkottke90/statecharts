import { AssignNode } from './assign.node';
import { BaseNode } from '../models/base';
import { InternalState, SCXMLEvent } from '../models/internalState';
import { parse } from '../parser';
import SimpleXML from 'simple-xml-to-json';
import { TransitionNode } from './transition.node';

// Helper function to create test InternalState
function createTestEventState(
  data: Record<string, unknown> = {},
): InternalState {
  const mockEvent: SCXMLEvent = {
    name: 'test.event',
    type: 'internal',
    sendid: 'test-send-id',
    origin: 'test-origin',
    origintype: '',
    invokeid: '',
    data: {},
  };

  return {
    _event: mockEvent,
    _datamodel: 'ecmascript', // Add datamodel for expression evaluation
    data: { ...data },
    ...data, // Also spread data at root level for backward compatibility with tests
  };
}

describe('AssignNode', () => {
  describe('constructor', () => {
    it('should create AssignNode with location and expr', () => {
      // Arrange & Act
      const assignNode = new AssignNode({
        assign: {
          location: 'user.isAdmin',
          expr: 'user?.permission?.admin === true', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      // Assert
      expect(assignNode.location).toBe('user.isAdmin');
      expect(assignNode.expr).toBe('user?.permission?.admin === true');
      expect(assignNode.isExecutable).toBe(true);
    });

    it('should create AssignNode with location and content (no expr)', () => {
      // Arrange
      const childNode = new BaseNode({ content: 'Jane Smith', children: [] });

      // Act
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          content: '',
          children: [childNode],
        },
      });

      // Assert
      expect(assignNode.location).toBe('user.name');
      expect(assignNode.expr).toBeUndefined();
      expect(assignNode.clear).toBeUndefined();
      expect(assignNode.children).toHaveLength(1);
    });

    it('should create AssignNode with clear property set to true', () => {
      // Arrange & Act
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          clear: true,
          content: '',
          children: [],
        },
      });

      // Assert
      expect(assignNode.location).toBe('user.name');
      expect(assignNode.clear).toBe(true);
      expect(assignNode.expr).toBeUndefined();
    });

    it('should create AssignNode with clear property set to null', () => {
      // Arrange & Act
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          clear: null,
          content: '',
          children: [],
        },
      });

      // Assert
      expect(assignNode.location).toBe('user.name');
      expect(assignNode.clear).toBe(null);
      expect(assignNode.expr).toBeUndefined();
    });

    it('should create AssignNode with clear property set to undefined', () => {
      // Arrange & Act
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          clear: undefined,
          content: '',
          children: [],
        },
      });

      // Assert
      expect(assignNode.location).toBe('user.name');
      expect(assignNode.clear).toBe(undefined);
      expect(assignNode.expr).toBeUndefined();
    });

    it('should create AssignNode without clear property (defaults to undefined)', () => {
      // Arrange & Act
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          expr: '"test"',
          content: '',
          children: [],
        },
      });

      // Assert
      expect(assignNode.location).toBe('user.name');
      expect(assignNode.clear).toBeUndefined();
      expect(assignNode.expr).toBe('"test"');
    });

    it('should have correct static properties', () => {
      // Assert
      expect(AssignNode.label).toBe('assign');
      expect(AssignNode.schema).toBeDefined();
    });
  });

  describe('run method', () => {
    it('should assign expr value to location in state', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          expr: '"John Doe"', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({ user: { id: 1 } });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data.user).toEqual({
        id: 1,
        name: 'John Doe',
      });
      expect(result._event).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should assign content value to location when no expr provided', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          content: 'Jane Smith',
          children: [],
        },
      });

      const initialState = createTestEventState({ user: { id: 2 } });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        user: {
          id: 2,
          name: 'Jane Smith',
        },
      });
    });

    it('should create nested object structure when location path does not exist', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'config.settings.theme',
          expr: '"dark"', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState();

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        config: {
          settings: {
            theme: 'dark',
          },
        },
      });
    });

    it('should overwrite existing values at location', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          expr: '"Updated Name"', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({
        user: { name: 'Old Name', id: 1 },
      });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        user: {
          name: 'Updated Name',
          id: 1,
        },
      });
    });

    it('should handle array index assignments', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'items[0].name',
          expr: '"First Item"', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({ items: [{ id: 1 }] });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        items: [{ id: 1, name: 'First Item' }],
      });
    });

    it('should concatenate multiple child content nodes', async () => {
      // Arrange
      const child1 = new BaseNode({ content: 'Hello ', children: [] });
      const child2 = new BaseNode({ content: 'World', children: [] });

      const assignNode = new AssignNode({
        assign: {
          location: 'message',
          content: '',
          children: [child1, child2],
        },
      });

      const initialState = createTestEventState();

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        message: 'Hello World',
      });
    });

    it('should delete property when clear is set to true', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          clear: true,
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({
        user: { name: 'John Doe', id: 1 },
      });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        user: { id: 1 },
      });
      expect(result.data.user).not.toHaveProperty('name');
    });

    it('should set property to null when clear is set to null', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          clear: null,
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({
        user: { name: 'John Doe', id: 1 },
      });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        user: { name: null, id: 1 },
      });
      expect((result.data as any).user.name).toBe(null);
    });

    it('should not clear when clear property is not provided', async () => {
      // Arrange - Note: when clear is not provided, it should behave normally
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          expr: '"Updated Name"',
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({
        user: { name: 'John Doe', id: 1 },
      });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        user: { name: 'Updated Name', id: 1 },
      });
    });

    it('should handle clear on nested property paths', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'app.config.database.host',
          clear: true,
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({
        app: {
          config: {
            database: { host: 'localhost', port: 5432 },
            logging: true,
          },
        },
      });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        app: {
          config: {
            database: { port: 5432 },
            logging: true,
          },
        },
      });
      expect((result.data as any).app.config.database).not.toHaveProperty('host');
    });

    it('should handle clear on array elements', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'items[1].name',
          clear: true,
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({
        items: [
          { id: 1, name: 'First' },
          { id: 2, name: 'Second' },
          { id: 3, name: 'Third' },
        ],
      });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        items: [
          { id: 1, name: 'First' },
          { id: 2 },
          { id: 3, name: 'Third' },
        ],
      });
      expect((result.data as any).items[1]).not.toHaveProperty('name');
    });
  });

  describe('schema validation', () => {
    it('should validate successfully with location and expr', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        expr: '"John Doe"', // Proper JavaScript string literal
        content: '',
        children: [],
      });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate successfully with location and children (no expr)', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        content: '',
        children: [{ content: 'Jane', children: [] }],
      });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should fail validation when location is missing', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        expr: '"John Doe"', // Proper JavaScript string literal
        content: '',
        children: [],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('location');
    });

    it('should fail validation when location is empty string', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: '',
        expr: '"John Doe"', // Proper JavaScript string literal
        content: '',
        children: [],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('location');
    });

    it('should fail validation when both expr and children are provided', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        expr: '"John Doe"', // Proper JavaScript string literal
        content: '',
        children: [{ content: 'Jane', children: [] }],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Must specify either');
    });

    it('should pass validation when neither expr nor children are provided (current implementation)', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        content: '',
        children: [],
      });

      // Assert
      // Note: Current implementation allows this case (both false !== false = false, so validation passes)
      // This may need to be addressed in the schema logic if strict SCXML compliance is required
      expect(result.success).toBe(true);
    });

    it('should validate successfully with clear property set to true', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        clear: true,
        content: '',
        children: [],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.clear).toBe(true);
    });

    it('should validate successfully with clear property set to null', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        clear: null,
        content: '',
        children: [],
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.clear).toBe(null);
      }
    });

    it('should validate successfully with clear property set to undefined', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        clear: undefined,
        content: '',
        children: [],
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.clear).toBe(undefined);
      }
    });

    it('should validate successfully with clear property as string "null"', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        clear: 'null',
        content: '',
        children: [],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.clear).toBe(null);
    });

    it('should validate successfully with clear property as string "undefined"', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        clear: 'undefined',
        content: '',
        children: [],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.clear).toBe(undefined);
    });

    it('should fail validation with invalid clear property value', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        clear: 'invalid',
        content: '',
        children: [],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('clear');
    });
  });

  describe('createFromJSON', () => {
    it('should create AssignNode from valid JSON input', () => {
      // Arrange
      const jsonInput = {
        assign: {
          location: 'user.name',
          expr: 'John Doe',
        },
      };

      // Act
      const result = AssignNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(AssignNode);
      expect(result.node?.location).toBe('user.name');
      expect(result.node?.expr).toBe('John Doe');
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid JSON input', () => {
      // Arrange
      const jsonInput = {
        assign: {
          // Missing required location
          expr: 'John Doe',
        },
      };

      // Act
      const result = AssignNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.node).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should handle JSON input with children content', () => {
      // Arrange
      const jsonInput = {
        assign: {
          location: 'user.name',
          children: [{ content: 'Jane Smith', children: [] }],
        },
      };

      // Act
      const result = AssignNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(AssignNode);
      expect(result.node?.location).toBe('user.name');
      expect(result.node?.expr).toBeUndefined();
    });

    it('should create AssignNode from JSON with clear property set to true', () => {
      // Arrange
      const jsonInput = {
        assign: {
          location: 'user.name',
          clear: true,
        },
      };

      // Act
      const result = AssignNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(AssignNode);
      expect(result.node?.location).toBe('user.name');
      expect(result.node?.clear).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should create AssignNode from JSON with clear property set to null', () => {
      // Arrange
      const jsonInput = {
        assign: {
          location: 'user.name',
          clear: null,
        },
      };

      // Act
      const result = AssignNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.node).toBeInstanceOf(AssignNode);
        expect(result.node.location).toBe('user.name');
        expect(result.node.clear).toBe(null);
      }
      expect(result.error).toBeUndefined();
    });

    it('should create AssignNode from JSON with clear property as string "null"', () => {
      // Arrange
      const jsonInput = {
        assign: {
          location: 'user.name',
          clear: 'null',
        },
      };

      // Act
      const result = AssignNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(AssignNode);
      expect(result.node?.location).toBe('user.name');
      expect(result.node?.clear).toBe(null);
      expect(result.error).toBeUndefined();
    });

    it('should create AssignNode from JSON with clear property as string "undefined"', () => {
      // Arrange
      const jsonInput = {
        assign: {
          location: 'user.name',
          clear: 'undefined',
        },
      };

      // Act
      const result = AssignNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(AssignNode);
      expect(result.node?.location).toBe('user.name');
      expect(result.node?.clear).toBe(undefined);
      expect(result.error).toBeUndefined();
    });
  });

  describe('SCXML compliance', () => {
    it('should follow SCXML specification for location expressions', async () => {
      // Arrange - Test various SCXML-compliant location expressions
      const testCases = [
        { location: 'varname', expr: '"value1"' }, // Proper JavaScript string literal
        { location: 'obj.property', expr: '"value2"' }, // Proper JavaScript string literal
        { location: 'array[0]', expr: '"value3"' }, // Proper JavaScript string literal
        { location: 'nested.obj.deep.prop', expr: '"value4"' }, // Proper JavaScript string literal
      ];

      for (const testCase of testCases) {
        const assignNode = new AssignNode({
          assign: {
            location: testCase.location,
            expr: testCase.expr, // Proper JavaScript string literal
            content: '',
            children: [],
          },
        });

        const initialState = createTestEventState();

        // Act
        const result = await assignNode.run(initialState);

        // Assert - Verify the assignment was made correctly
        expect(result.data).toHaveProperty(testCase.location.split('.')[0]);
      }
    });

    it('should demonstrate usage as executable content in transitions', async () => {
      // Arrange - Example showing how AssignNode would be used in SCXML
      const xmlExample = `
        <transition target="nextState">
          <assign location="user.status">active</assign>
          <assign location="user.lastLogin" expr="Date.now()" />
        </transition>
      `;

      const { root } = parse<TransitionNode>(SimpleXML.convertXML(xmlExample));

      const initialState = createTestEventState({ user: { id: 1 } });

      // Act - Execute assignments in sequence (as would happen in transition)
      const result = await root!.run(initialState);

      // Assert
      expect(result.data).toEqual({
        user: {
          id: 1,
          status: 'active',
          lastLogin: expect.any(Number),
        },
      });

      // Verify XML example is included for documentation
      expect(xmlExample).toContain('<assign');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string expr assignment', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          expr: '""', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState();

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({ user: { name: '' } });
    });

    it('should handle numeric values in expr', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.age',
          expr: 'Number.parseInt("25")', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState();

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({ user: { age: 25 } });
    });

    it('should handle boolean-like values in expr', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.active',
          expr: 'true', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState();

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({ user: { active: true } });
    });

    it('should handle complex nested location paths', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'app.config.database.connection.host',
          expr: '"localhost"', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState();

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        app: {
          config: {
            database: {
              connection: {
                host: 'localhost',
              },
            },
          },
        },
      });
    });

    it('should preserve existing state properties when making assignments', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.email',
          expr: '"john@example.com"', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({
        user: { name: 'John', age: 30 },
        app: { version: '1.0' },
      });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        user: { name: 'John', age: 30, email: 'john@example.com' },
        app: { version: '1.0' },
      });
    });

    it('should handle assignment to root level properties', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'status',
          expr: '"ready"', // Proper JavaScript string literal
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({ count: 0 });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({ count: 0, status: 'ready' });
    });

    it('should handle clear on non-existent property gracefully', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'nonExistent.property',
          clear: true,
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({ existing: 'value' });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({ existing: 'value' });
    });

    it('should handle clear on root level property', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'status',
          clear: true,
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({ status: 'active', count: 5 });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({ count: 5 });
      expect(result.data).not.toHaveProperty('status');
    });

    it('should prioritize clear over expr when both are provided', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          clear: true,
          expr: '"Should not be used"',
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({
        user: { name: 'John Doe', id: 1 },
      });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        user: { id: 1 },
      });
      expect(result.data.user).not.toHaveProperty('name');
    });

    it('should handle clear with null value on deeply nested path', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'app.config.database.connection.timeout',
          clear: null,
          content: '',
          children: [],
        },
      });

      const initialState = createTestEventState({
        app: {
          config: {
            database: {
              connection: { host: 'localhost', timeout: 5000 },
            },
          },
        },
      });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.data).toEqual({
        app: {
          config: {
            database: {
              connection: { host: 'localhost', timeout: null },
            },
          },
        },
      });
      expect((result.data as any).app.config.database.connection.timeout).toBe(null);
    });
  });
});
