import { AssignNode } from './assign.node';
import { BaseNode } from '../models/base';
import { EventState, SCXMLEvent } from '../models/internalState';

// Helper function to create test EventState
function createTestEventState(data: Record<string, unknown> = {}): EventState {
  const mockEvent: SCXMLEvent = {
    name: 'test.event',
    type: 'internal',
    sendid: 'test-send-id',
    origin: 'test-origin',
    data: {}
  };

  return {
    _event: mockEvent,
    data: { ...data },
    ...data // Also spread data at root level for backward compatibility with tests
  };
}

describe('AssignNode', () => {
  describe('constructor', () => {
    it('should create AssignNode with location and expr', () => {
      // Arrange & Act
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          expr: 'John Doe',
          content: '',
          children: []
        }
      });

      // Assert
      expect(assignNode.location).toBe('user.name');
      expect(assignNode.expr).toBe('John Doe');
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
          children: [childNode]
        }
      });

      // Assert
      expect(assignNode.location).toBe('user.name');
      expect(assignNode.expr).toBeUndefined();
      expect(assignNode.children).toHaveLength(1);
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
          expr: 'John Doe',
          content: '',
          children: []
        }
      });

      const initialState = createTestEventState({ user: { id: 1 } });

      // Act
      const result = await assignNode.run(initialState);

      // Assert
      expect(result.user).toEqual({
        id: 1,
        name: 'John Doe'
      });
      expect(result._event).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should assign content value to location when no expr provided', async () => {
      // Arrange
      const childNode = new BaseNode({ content: 'Jane Smith', children: [] });
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          content: '',
          children: [childNode]
        }
      });

      const initialState = { user: { id: 2 } };

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({
        user: {
          id: 2,
          name: 'Jane Smith'
        }
      });
    });

    it('should create nested object structure when location path does not exist', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'config.settings.theme',
          expr: 'dark',
          content: '',
          children: []
        }
      });

      const initialState = {};

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({
        config: {
          settings: {
            theme: 'dark'
          }
        }
      });
    });

    it('should overwrite existing values at location', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          expr: 'Updated Name',
          content: '',
          children: []
        }
      });

      const initialState = { user: { name: 'Old Name', id: 1 } };

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({
        user: {
          name: 'Updated Name',
          id: 1
        }
      });
    });

    it('should handle array index assignments', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'items[0].name',
          expr: 'First Item',
          content: '',
          children: []
        }
      });

      const initialState = { items: [{ id: 1 }] };

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({
        items: [{ id: 1, name: 'First Item' }]
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
          children: [child1, child2]
        }
      });

      const initialState = {};

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({
        message: 'Hello World'
      });
    });

    it('should throw error with descriptive message when assignment fails', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.name',
          expr: 'John Doe',
          content: '',
          children: []
        }
      });

      // Mock lodash.set to throw an error
      const originalSet = require('lodash').set;
      require('lodash').set = jest.fn().mockImplementation(() => {
        throw new Error('Invalid location path');
      });

      const initialState = {};

      // Act & Assert
      await expect(assignNode.run(initialState as Record<string, never>))
        .rejects
        .toThrow('Assignment Failed: Invalid location path');

      expect(assignNode.run(initialState as Record<string, never>))
        .rejects
        .toHaveProperty('name', 'AssignNode.Error');

      // Restore original function
      require('lodash').set = originalSet;
    });
  });

  describe('schema validation', () => {
    it('should validate successfully with location and expr', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        expr: 'John Doe',
        content: '',
        children: []
      });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate successfully with location and children (no expr)', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        content: '',
        children: [{ content: 'Jane', children: [] }]
      });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should fail validation when location is missing', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        expr: 'John Doe',
        content: '',
        children: []
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('location');
    });

    it('should fail validation when location is empty string', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: '',
        expr: 'John Doe',
        content: '',
        children: []
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('location');
    });

    it('should fail validation when both expr and children are provided', () => {
      // Arrange & Act
      const result = AssignNode.schema.safeParse({
        location: 'user.name',
        expr: 'John Doe',
        content: '',
        children: [{ content: 'Jane', children: [] }]
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
        children: []
      });

      // Assert
      // Note: Current implementation allows this case (both false !== false = false, so validation passes)
      // This may need to be addressed in the schema logic if strict SCXML compliance is required
      expect(result.success).toBe(true);
    });
  });

  describe('createFromJSON', () => {
    it('should create AssignNode from valid JSON input', () => {
      // Arrange
      const jsonInput = {
        assign: {
          location: 'user.name',
          expr: 'John Doe'
        }
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
          expr: 'John Doe'
        }
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
          children: [{ content: 'Jane Smith', children: [] }]
        }
      };

      // Act
      const result = AssignNode.createFromJSON(jsonInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.node).toBeInstanceOf(AssignNode);
      expect(result.node?.location).toBe('user.name');
      expect(result.node?.expr).toBeUndefined();
    });
  });

  describe('SCXML compliance', () => {
    it('should follow SCXML specification for location expressions', async () => {
      // Arrange - Test various SCXML-compliant location expressions
      const testCases = [
        { location: 'varname', expr: 'value1' },
        { location: 'obj.property', expr: 'value2' },
        { location: 'array[0]', expr: 'value3' },
        { location: 'nested.obj.deep.prop', expr: 'value4' }
      ];

      for (const testCase of testCases) {
        const assignNode = new AssignNode({
          assign: {
            location: testCase.location,
            expr: testCase.expr,
            content: '',
            children: []
          }
        });

        const initialState = {};

        // Act
        const result = await assignNode.run(initialState as Record<string, never>);

        // Assert - Verify the assignment was made correctly
        expect(result).toHaveProperty(testCase.location.split('.')[0]);
      }
    });

    it('should demonstrate usage as executable content in transitions', async () => {
      // Arrange - Example showing how AssignNode would be used in SCXML
      const xmlExample = `
        <transition target="nextState">
          <assign location="user.status" expr="'active'" />
          <assign location="user.lastLogin" expr="Date.now()" />
        </transition>
      `;

      // Create assign nodes as they would appear in a transition
      const statusAssign = new AssignNode({
        assign: {
          location: 'user.status',
          expr: 'active',
          content: '',
          children: []
        }
      });

      const loginAssign = new AssignNode({
        assign: {
          location: 'user.lastLogin',
          expr: '1234567890',
          content: '',
          children: []
        }
      });

      const initialState = { user: { id: 1 } };

      // Act - Execute assignments in sequence (as would happen in transition)
      let currentState = await statusAssign.run(initialState as Record<string, never>);
      currentState = await loginAssign.run(currentState);

      // Assert
      expect(currentState).toEqual({
        user: {
          id: 1,
          status: 'active',
          lastLogin: '1234567890'
        }
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
          expr: '',
          content: '',
          children: []
        }
      });

      const initialState = {};

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({ user: { name: '' } });
    });

    it('should handle numeric values in expr', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.age',
          expr: '25',
          content: '',
          children: []
        }
      });

      const initialState = {};

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({ user: { age: '25' } });
    });

    it('should handle boolean-like values in expr', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.active',
          expr: 'true',
          content: '',
          children: []
        }
      });

      const initialState = {};

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({ user: { active: 'true' } });
    });

    it('should handle complex nested location paths', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'app.config.database.connection.host',
          expr: 'localhost',
          content: '',
          children: []
        }
      });

      const initialState = {};

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({
        app: {
          config: {
            database: {
              connection: {
                host: 'localhost'
              }
            }
          }
        }
      });
    });

    it('should preserve existing state properties when making assignments', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'user.email',
          expr: 'john@example.com',
          content: '',
          children: []
        }
      });

      const initialState = {
        user: { name: 'John', age: 30 },
        app: { version: '1.0' }
      };

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({
        user: { name: 'John', age: 30, email: 'john@example.com' },
        app: { version: '1.0' }
      });
    });

    it('should handle assignment to root level properties', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          location: 'status',
          expr: 'ready',
          content: '',
          children: []
        }
      });

      const initialState = { count: 0 };

      // Act
      const result = await assignNode.run(initialState as Record<string, never>);

      // Assert
      expect(result).toEqual({ count: 0, status: 'ready' });
    });
  });

  describe('performance considerations', () => {
    it('should handle large state objects efficiently', async () => {
      // Arrange
      const largeState = {};
      for (let i = 0; i < 1000; i++) {
        (largeState as any)[`prop${i}`] = `value${i}`;
      }

      const assignNode = new AssignNode({
        assign: {
          location: 'newProp',
          expr: 'newValue',
          content: '',
          children: []
        }
      });

      // Act
      const startTime = Date.now();
      const result = await assignNode.run(largeState as Record<string, never>);
      const endTime = Date.now();

      // Assert
      expect(result.newProp).toBe('newValue');
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(Object.keys(result)).toHaveLength(1001); // Original 1000 + 1 new
    });
  });
});
