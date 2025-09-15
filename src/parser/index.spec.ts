import SimpleXML from 'simple-xml-to-json';
import { BaseNode, Node } from "../models";
import { parse, parseType, mergeMaps } from "./index";
import { BaseStateNode } from '../models/base-state';
import { DataNode, DataModelNode, FinalNode, StateNode, TransitionNode } from "../nodes";
import { InitialNode } from "../nodes/initial.node";
import { SCXMLNode } from "../nodes/scxml.node";

const xml = `
<state id="healthSystem">
  <initial>
    <transition target="substate"></transition>
  </initial>

  <state id="healthy"></state>
  <state id="looking-hurt"></state>
  <state id="unconscious"></state>
  <state id="dead"></state>

   
  <final id="game-over"></final>
</state>
`.trimStart();

describe('Parser', () => {
  describe('Node Creation & Error Handling', () => {
    it('should return error array when parseType fails', () => {
      // Arrange
      const input = { unknown: { content: '', children: [] } } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBeUndefined();
      expect(result.error).toHaveLength(1);
      expect(result.error[0]).toBeInstanceOf(Error);
      expect(result.error[0].message).toContain('Unknown Node: unknown');
      expect(result.identifiableChildren.size).toBe(0);
    });

    it('should return error array when parseType returns createFromJSON failure', () => {
      // Arrange
      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn().mockReturnValue({
        success: false,
        error: new Error('Creation failed'),
        node: undefined
      });

      const input = { state: { content: '', children: [] } } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBeUndefined();
      expect(result.error).toHaveLength(1);
      expect(result.error[0]).toBeInstanceOf(Error);
      expect(result.error[0].message).toBe('Creation failed');
      expect(result.identifiableChildren.size).toBe(0);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });

    it('should return error array when parseType returns no node despite success', () => {
      // Arrange
      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn().mockReturnValue({
        success: true,
        error: undefined,
        node: undefined
      });

      const input = { state: { content: '', children: [] } } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBeUndefined();
      expect(result.error).toHaveLength(1);
      expect(result.error[0]).toBeInstanceOf(Error);
      expect(result.error[0].message).toContain('Node could not be loaded');
      expect(result.identifiableChildren.size).toBe(0);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });
  });

  describe('Node Without Children', () => {
    it('should parse node with allowChildren=false', () => {
      // Arrange
      const mockNode = new FinalNode({ final: { id: 'end', content: '', children: [] } });
      const originalCreateFromJSON = FinalNode.createFromJSON;
      FinalNode.createFromJSON = jest.fn().mockReturnValue({
        success: true,
        error: undefined,
        node: mockNode
      });

      const input = { final: { id: 'end', content: '', children: [] } } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockNode);
      expect(result.error).toHaveLength(0);
      expect(result.identifiableChildren.size).toBe(0);
      expect(result.root?.children).toEqual([]);

      // Cleanup
      FinalNode.createFromJSON = originalCreateFromJSON;
    });

    it('should parse node with allowChildren=true but no children in input', () => {
      // Arrange
      const mockNode = new StateNode({ state: { id: 'main', content: '', children: [] } });
      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn().mockReturnValue({
        success: true,
        error: undefined,
        node: mockNode
      });

      const input = { state: { id: 'main', content: '', children: [] } } as Node; // No children array

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockNode);
      expect(result.error).toHaveLength(0);
      expect(result.identifiableChildren.size).toBe(0);
      expect(result.root?.children).toEqual([]);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });

    it('should return empty errors array for successful childless nodes', () => {
      // Arrange
      const mockNode = new TransitionNode({ transition: { event: 'click', target: 'next', content: '', children: [] } });
      const originalCreateFromJSON = TransitionNode.createFromJSON;
      TransitionNode.createFromJSON = jest.fn().mockReturnValue({
        success: true,
        error: undefined,
        node: mockNode
      });

      const input = { transition: { event: 'click', target: 'next', content: '', children: [] } } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockNode);
      expect(result.error).toEqual([]);
      expect(result.identifiableChildren.size).toBe(0);

      // Cleanup
      TransitionNode.createFromJSON = originalCreateFromJSON;
    });
  });

  describe('Node With Children - Success Cases', () => {
    it('should parse node with children and build identifiable children map', () => {
      // Arrange
      const mockParentNode = new StateNode({ state: { id: 'parent', content: '', children: [] } });
      const mockChild1 = new StateNode({ state: { id: 'child1', content: '', children: [] } });
      const mockChild2 = new FinalNode({ final: { id: 'child2', content: '', children: [] } });

      const originalStateCreateFromJSON = StateNode.createFromJSON;
      const originalFinalCreateFromJSON = FinalNode.createFromJSON;

      StateNode.createFromJSON = jest.fn()
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockParentNode
        })
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockChild1
        });

      FinalNode.createFromJSON = jest.fn().mockReturnValue({
        success: true,
        error: undefined,
        node: mockChild2
      });

      const input = {
        state: {
          id: 'parent',
          content: '',
          children: [
            { state: { id: 'child1', content: '', children: [] } },
            { final: { id: 'child2', content: '', children: [] } }
          ]
        }
      } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockParentNode);
      expect(result.error).toHaveLength(0);
      expect(result.identifiableChildren.size).toBe(2);
      expect(result.identifiableChildren.get('child1')).toBe(mockChild1);
      expect(result.identifiableChildren.get('child2')).toBe(mockChild2);
      expect(result.root?.children).toHaveLength(2);
      expect(result.root?.children[0]).toBe(mockChild1);
      expect(result.root?.children[1]).toBe(mockChild2);

      // Cleanup
      StateNode.createFromJSON = originalStateCreateFromJSON;
      FinalNode.createFromJSON = originalFinalCreateFromJSON;
    });

    it('should handle children without IDs', () => {
      // Arrange
      const mockParentNode = new StateNode({ state: { id: 'parent', content: '', children: [] } });
      const mockChild = new TransitionNode({ transition: { event: 'click', target: 'next', content: '', children: [] } });

      const originalStateCreateFromJSON = StateNode.createFromJSON;
      const originalTransitionCreateFromJSON = TransitionNode.createFromJSON;

      StateNode.createFromJSON = jest.fn().mockReturnValue({
        success: true,
        error: undefined,
        node: mockParentNode
      });

      TransitionNode.createFromJSON = jest.fn().mockReturnValue({
        success: true,
        error: undefined,
        node: mockChild
      });

      const input = {
        state: {
          id: 'parent',
          content: '',
          children: [
            { transition: { event: 'click', target: 'next', content: '', children: [] } }
          ]
        }
      } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockParentNode);
      expect(result.error).toHaveLength(0);
      expect(result.identifiableChildren.size).toBe(0); // No IDs to track
      expect(result.root?.children).toHaveLength(1);
      expect(result.root?.children[0]).toBe(mockChild);

      // Cleanup
      StateNode.createFromJSON = originalStateCreateFromJSON;
      TransitionNode.createFromJSON = originalTransitionCreateFromJSON;
    });

    it('should return empty errors array when all children parse successfully', () => {
      // Arrange
      const mockParentNode = new StateNode({ state: { id: 'parent', content: '', children: [] } });
      const mockChild1 = new StateNode({ state: { id: 'child1', content: '', children: [] } });
      const mockChild2 = new StateNode({ state: { id: 'child2', content: '', children: [] } });

      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn()
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockParentNode
        })
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockChild1
        })
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockChild2
        });

      const input = {
        state: {
          id: 'parent',
          content: '',
          children: [
            { state: { id: 'child1', content: '', children: [] } },
            { state: { id: 'child2', content: '', children: [] } }
          ]
        }
      } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockParentNode);
      expect(result.error).toEqual([]); // Empty errors array
      expect(result.identifiableChildren.size).toBe(2);
      expect(result.root?.children).toHaveLength(2);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });
  });

  describe('Node With Children - Error Handling', () => {
    it('should collect errors from failed child parsing and continue processing remaining children', () => {
      // Arrange
      const mockParentNode = new StateNode({ state: { id: 'parent', content: '', children: [] } });
      const mockSuccessChild = new StateNode({ state: { id: 'success', content: '', children: [] } });

      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn()
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockParentNode
        })
        .mockReturnValueOnce({
          success: false,
          error: new Error('Child parsing failed'),
          node: undefined
        })
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockSuccessChild
        });

      const input = {
        state: {
          id: 'parent',
          content: '',
          children: [
            { state: { id: 'failed', content: '', children: [] } },
            { state: { id: 'success', content: '', children: [] } }
          ]
        }
      } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockParentNode);
      expect(result.error).toHaveLength(1);
      expect(result.error[0].message).toBe('Child parsing failed');
      expect(result.identifiableChildren.size).toBe(1); // Only successful child
      expect(result.identifiableChildren.get('success')).toBe(mockSuccessChild);
      expect(result.root?.children).toHaveLength(1); // Only successful child
      expect(result.root?.children[0]).toBe(mockSuccessChild);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });

    it('should collect errors from children that return no root node', () => {
      // Arrange
      const mockParentNode = new StateNode({ state: { id: 'parent', content: '', children: [] } });

      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn()
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockParentNode
        })
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: undefined // No node despite success
        });

      const input = {
        state: {
          id: 'parent',
          content: '',
          children: [
            { state: { id: 'nonode', content: '', children: [] } }
          ]
        }
      } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockParentNode);
      expect(result.error).toHaveLength(1);
      expect(result.error[0].message).toContain('Node could not be loaded');
      expect(result.identifiableChildren.size).toBe(0);
      expect(result.root?.children).toHaveLength(0);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });

    it('should skip failed children but continue processing subsequent children', () => {
      // Arrange
      const mockParentNode = new StateNode({ state: { id: 'parent', content: '', children: [] } });
      const mockChild1 = new StateNode({ state: { id: 'child1', content: '', children: [] } });
      const mockChild3 = new StateNode({ state: { id: 'child3', content: '', children: [] } });

      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn()
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockParentNode
        })
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockChild1
        })
        .mockReturnValueOnce({
          success: false,
          error: new Error('Child 2 failed'),
          node: undefined
        })
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockChild3
        });

      const input = {
        state: {
          id: 'parent',
          content: '',
          children: [
            { state: { id: 'child1', content: '', children: [] } },
            { state: { id: 'child2', content: '', children: [] } },
            { state: { id: 'child3', content: '', children: [] } }
          ]
        }
      } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockParentNode);
      expect(result.error).toHaveLength(1);
      expect(result.error[0].message).toBe('Child 2 failed');
      expect(result.identifiableChildren.size).toBe(2); // child1 and child3
      expect(result.identifiableChildren.get('child1')).toBe(mockChild1);
      expect(result.identifiableChildren.get('child3')).toBe(mockChild3);
      expect(result.root?.children).toHaveLength(2); // Only successful children
      expect(result.root?.children[0]).toBe(mockChild1);
      expect(result.root?.children[1]).toBe(mockChild3);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });

    it('should accumulate errors from multiple failed children', () => {
      // Arrange
      const mockParentNode = new StateNode({ state: { id: 'parent', content: '', children: [] } });

      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn()
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockParentNode
        })
        .mockReturnValueOnce({
          success: false,
          error: new Error('First child failed'),
          node: undefined
        })
        .mockReturnValueOnce({
          success: false,
          error: new Error('Second child failed'),
          node: undefined
        });

      const input = {
        state: {
          id: 'parent',
          content: '',
          children: [
            { state: { id: 'child1', content: '', children: [] } },
            { state: { id: 'child2', content: '', children: [] } }
          ]
        }
      } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockParentNode);
      expect(result.error).toHaveLength(2);
      expect(result.error[0].message).toBe('First child failed');
      expect(result.error[1].message).toBe('Second child failed');
      expect(result.identifiableChildren.size).toBe(0);
      expect(result.root?.children).toHaveLength(0);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });

    it('should handle mix of successful and failed children', () => {
      // Arrange
      const mockParentNode = new StateNode({ state: { id: 'parent', content: '', children: [] } });
      const mockSuccessChild = new FinalNode({ final: { id: 'success', content: '', children: [] } });

      const originalStateCreateFromJSON = StateNode.createFromJSON;
      const originalFinalCreateFromJSON = FinalNode.createFromJSON;

      StateNode.createFromJSON = jest.fn()
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockParentNode
        })
        .mockReturnValueOnce({
          success: false,
          error: new Error('State child failed'),
          node: undefined
        });

      FinalNode.createFromJSON = jest.fn().mockReturnValue({
        success: true,
        error: undefined,
        node: mockSuccessChild
      });

      const input = {
        state: {
          id: 'parent',
          content: '',
          children: [
            { state: { id: 'failed', content: '', children: [] } },
            { final: { id: 'success', content: '', children: [] } }
          ]
        }
      } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockParentNode);
      expect(result.error).toHaveLength(1);
      expect(result.error[0].message).toBe('State child failed');
      expect(result.identifiableChildren.size).toBe(1);
      expect(result.identifiableChildren.get('success')).toBe(mockSuccessChild);
      expect(result.root?.children).toHaveLength(1);
      expect(result.root?.children[0]).toBe(mockSuccessChild);

      // Cleanup
      StateNode.createFromJSON = originalStateCreateFromJSON;
      FinalNode.createFromJSON = originalFinalCreateFromJSON;
    });
  });

  describe('parseType Method', () => {
    it('should correctly identify data node type and call DataNode.createFromJSON', () => {
      // Arrange
      const input = { data: { id: 'test', content: '', children: [] } };
      const expectedResponse = { success: true, error: undefined, node: {} };

      const originalCreateFromJSON = DataNode.createFromJSON;
      DataNode.createFromJSON = jest.fn().mockReturnValue(expectedResponse);

      // Act
      const result = parseType(input);

      // Assert
      expect(DataNode.createFromJSON).toHaveBeenCalledWith(input);
      expect(result).toBe(expectedResponse);

      // Cleanup
      DataNode.createFromJSON = originalCreateFromJSON;
    });

    it('should correctly identify datamodel node type and call DataModelNode.createFromJSON', () => {
      // Arrange
      const input = { datamodel: { content: '', children: [] } };
      const expectedResponse = { success: true, error: undefined, node: {} };

      const originalCreateFromJSON = DataModelNode.createFromJSON;
      DataModelNode.createFromJSON = jest.fn().mockReturnValue(expectedResponse);

      // Act
      const result = parseType(input);

      // Assert
      expect(DataModelNode.createFromJSON).toHaveBeenCalledWith(input);
      expect(result).toBe(expectedResponse);

      // Cleanup
      DataModelNode.createFromJSON = originalCreateFromJSON;
    });

    it('should correctly identify final node type and call FinalNode.createFromJSON', () => {
      // Arrange
      const input = { final: { id: 'end', content: '', children: [] } };
      const expectedResponse = { success: true, error: undefined, node: {} };

      const originalCreateFromJSON = FinalNode.createFromJSON;
      FinalNode.createFromJSON = jest.fn().mockReturnValue(expectedResponse);

      // Act
      const result = parseType(input);

      // Assert
      expect(FinalNode.createFromJSON).toHaveBeenCalledWith(input);
      expect(result).toBe(expectedResponse);

      // Cleanup
      FinalNode.createFromJSON = originalCreateFromJSON;
    });

    it('should correctly identify initial node type and call InitialNode.createFromJSON', () => {
      // Arrange
      const input = { initial: { content: '', children: [] } };
      const expectedResponse = { success: true, error: undefined, node: {} };

      const originalCreateFromJSON = InitialNode.createFromJSON;
      InitialNode.createFromJSON = jest.fn().mockReturnValue(expectedResponse);

      // Act
      const result = parseType(input);

      // Assert
      expect(InitialNode.createFromJSON).toHaveBeenCalledWith(input);
      expect(result).toBe(expectedResponse);

      // Cleanup
      InitialNode.createFromJSON = originalCreateFromJSON;
    });

    it('should correctly identify scxml node type and call SCXMLNode.createFromJSON', () => {
      // Arrange
      const input = { scxml: { version: '1.0', content: '', children: [] } };
      const expectedResponse = { success: true, error: undefined, node: {} };

      const originalCreateFromJSON = SCXMLNode.createFromJSON;
      SCXMLNode.createFromJSON = jest.fn().mockReturnValue(expectedResponse);

      // Act
      const result = parseType(input);

      // Assert
      expect(SCXMLNode.createFromJSON).toHaveBeenCalledWith(input);
      expect(result).toEqual(expectedResponse);

      // Cleanup
      SCXMLNode.createFromJSON = originalCreateFromJSON;
    });

    it('should correctly identify state node type and call StateNode.createFromJSON', () => {
      // Arrange
      const input = { state: { id: 'main', content: '', children: [] } };
      const expectedResponse = { success: true, error: undefined, node: {} };

      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn().mockReturnValue(expectedResponse);

      // Act
      const result = parseType(input);

      // Assert
      expect(StateNode.createFromJSON).toHaveBeenCalledWith(input);
      expect(result).toBe(expectedResponse);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });

    it('should correctly identify transition node type and call TransitionNode.createFromJSON', () => {
      // Arrange
      const input = { transition: { event: 'click', target: 'next', content: '', children: [] } };
      const expectedResponse = { success: true, error: undefined, node: {} };

      const originalCreateFromJSON = TransitionNode.createFromJSON;
      TransitionNode.createFromJSON = jest.fn().mockReturnValue(expectedResponse);

      // Act
      const result = parseType(input);

      // Assert
      expect(TransitionNode.createFromJSON).toHaveBeenCalledWith(input);
      expect(result).toBe(expectedResponse);

      // Cleanup
      TransitionNode.createFromJSON = originalCreateFromJSON;
    });

    it('should return error for unknown node types', () => {
      // Act
      const result = parseType({ unknown: { content: '', children: [] } });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Unknown Node: unknown');
      expect(result.node).toBeUndefined();
    });

    it('should handle empty input object', () => {
      // Act
      const result = parseType({});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Unknown Node: undefined');
      expect(result.node).toBeUndefined();
    });

    it('should handle input with multiple keys (should use first key)', () => {
      // Arrange
      const input = {
        state: { id: 'first', content: '', children: [] },
        final: { id: 'second', content: '', children: [] }
      };
      const expectedResponse = { success: true, error: undefined, node: {} };

      const originalStateCreateFromJSON = StateNode.createFromJSON;
      const originalFinalCreateFromJSON = FinalNode.createFromJSON;

      StateNode.createFromJSON = jest.fn().mockReturnValue(expectedResponse);
      FinalNode.createFromJSON = jest.fn();

      // Act
      const result = parseType(input);

      // Assert
      expect(StateNode.createFromJSON).toHaveBeenCalledWith(input);
      expect(FinalNode.createFromJSON).not.toHaveBeenCalled();
      expect(result).toBe(expectedResponse);

      // Cleanup
      StateNode.createFromJSON = originalStateCreateFromJSON;
      FinalNode.createFromJSON = originalFinalCreateFromJSON;
    });

    it('should pass correct input structure to createFromJSON methods', () => {
      // Arrange
      const input = { state: { id: 'test', content: 'some content', children: [1, 2, 3] } };

      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn().mockReturnValue({ success: true, error: undefined, node: {} });

      // Act
      parseType(input);

      // Assert
      expect(StateNode.createFromJSON).toHaveBeenCalledWith(input);
      expect(StateNode.createFromJSON).toHaveBeenCalledTimes(1);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });

    it('should return the exact response from createFromJSON methods without modification', () => {
      // Arrange
      const input = { final: { id: 'end', content: '', children: [] } };
      const mockResponse = {
        success: false,
        error: new Error('Custom error'),
        node: undefined,
        customProperty: 'should be preserved'
      };

      const originalCreateFromJSON = FinalNode.createFromJSON;
      FinalNode.createFromJSON = jest.fn().mockReturnValue(mockResponse);

      // Act
      const result = parseType(input);

      // Assert
      expect(result).toBe(mockResponse); // Exact same object reference
      expect(result).toEqual(mockResponse); // Same content
      expect((result as unknown as { customProperty: string }).customProperty).toBe('should be preserved');

      // Cleanup
      FinalNode.createFromJSON = originalCreateFromJSON;
    });
  });

  describe('mergeMaps Method', () => {
    it('should merge all entries from source map to target map', () => {
      // Arrange
      const mockNode1 = new StateNode({ state: { id: 'node1', content: '', children: [] } });
      const mockNode2 = new FinalNode({ final: { id: 'node2', content: '', children: [] } });
      const mockNode3 = new StateNode({ state: { id: 'node3', content: '', children: [] } });

      const sourceMap = new Map<string, BaseNode>();
      sourceMap.set('key1', mockNode1);
      sourceMap.set('key2', mockNode2);

      const targetMap = new Map<string, BaseNode>();
      targetMap.set('key3', mockNode3);

      // Act
      mergeMaps(sourceMap, targetMap);

      // Assert
      expect(targetMap.size).toBe(3);
      expect(targetMap.get('key1')).toBe(mockNode1);
      expect(targetMap.get('key2')).toBe(mockNode2);
      expect(targetMap.get('key3')).toBe(mockNode3);
    });

    it('should handle empty source map (no changes to target)', () => {
      // Arrange
      const mockNode = new StateNode({ state: { id: 'existing', content: '', children: [] } });
      const sourceMap = new Map<string, BaseNode>();
      const targetMap = new Map<string, BaseNode>();
      targetMap.set('existing', mockNode);

      const originalSize = targetMap.size;

      // Act
      mergeMaps(sourceMap, targetMap);

      // Assert
      expect(targetMap.size).toBe(originalSize);
      expect(targetMap.get('existing')).toBe(mockNode);
    });

    it('should handle empty target map (all source entries added)', () => {
      // Arrange
      const mockNode1 = new StateNode({ state: { id: 'node1', content: '', children: [] } });
      const mockNode2 = new FinalNode({ final: { id: 'node2', content: '', children: [] } });

      const sourceMap = new Map<string, BaseNode>();
      sourceMap.set('key1', mockNode1);
      sourceMap.set('key2', mockNode2);

      const targetMap = new Map<string, BaseNode>();

      // Act
      mergeMaps(sourceMap, targetMap);

      // Assert
      expect(targetMap.size).toBe(2);
      expect(targetMap.get('key1')).toBe(mockNode1);
      expect(targetMap.get('key2')).toBe(mockNode2);
    });

    it('should handle both maps empty', () => {
      // Arrange
      const sourceMap = new Map<string, BaseNode>();
      const targetMap = new Map<string, BaseNode>();

      // Act
      mergeMaps(sourceMap, targetMap);

      // Assert
      expect(targetMap.size).toBe(0);
    });

    it('should overwrite existing keys in target map with source map values', () => {
      // Arrange
      const originalNode = new StateNode({ state: { id: 'original', content: '', children: [] } });
      const newNode = new FinalNode({ final: { id: 'new', content: '', children: [] } });

      const sourceMap = new Map<string, BaseNode>();
      sourceMap.set('duplicate', newNode);

      const targetMap = new Map<string, BaseNode>();
      targetMap.set('duplicate', originalNode);

      // Act
      mergeMaps(sourceMap, targetMap);

      // Assert
      expect(targetMap.size).toBe(1);
      expect(targetMap.get('duplicate')).toBe(newNode);
      expect(targetMap.get('duplicate')).not.toBe(originalNode);
    });

    it('should preserve existing target map entries not present in source map', () => {
      // Arrange
      const existingNode = new StateNode({ state: { id: 'existing', content: '', children: [] } });
      const newNode = new FinalNode({ final: { id: 'new', content: '', children: [] } });

      const sourceMap = new Map<string, BaseNode>();
      sourceMap.set('new', newNode);

      const targetMap = new Map<string, BaseNode>();
      targetMap.set('existing', existingNode);

      // Act
      mergeMaps(sourceMap, targetMap);

      // Assert
      expect(targetMap.size).toBe(2);
      expect(targetMap.get('existing')).toBe(existingNode);
      expect(targetMap.get('new')).toBe(newNode);
    });

    it('should not modify the source map during merge operation', () => {
      // Arrange
      const sourceNode = new StateNode({ state: { id: 'source', content: '', children: [] } });
      const targetNode = new FinalNode({ final: { id: 'target', content: '', children: [] } });

      const sourceMap = new Map<string, BaseNode>();
      sourceMap.set('source', sourceNode);

      const targetMap = new Map<string, BaseNode>();
      targetMap.set('target', targetNode);

      const originalSourceSize = sourceMap.size;
      const originalSourceEntries = Array.from(sourceMap.entries());

      // Act
      mergeMaps(sourceMap, targetMap);

      // Assert
      expect(sourceMap.size).toBe(originalSourceSize);
      expect(Array.from(sourceMap.entries())).toEqual(originalSourceEntries);
      expect(sourceMap.get('source')).toBe(sourceNode);
      expect(sourceMap.has('target')).toBe(false);
    });

    it('should handle large maps efficiently', () => {
      // Arrange
      const sourceMap = new Map<string, BaseNode>();
      const targetMap = new Map<string, BaseNode>();

      // Create 1000 nodes for source map
      for (let i = 0; i < 1000; i++) {
        const node = new StateNode({ state: { id: `source${i}`, content: '', children: [] } });
        sourceMap.set(`source${i}`, node);
      }

      // Create 500 nodes for target map
      for (let i = 0; i < 500; i++) {
        const node = new FinalNode({ final: { id: `target${i}`, content: '', children: [] } });
        targetMap.set(`target${i}`, node);
      }

      const startTime = Date.now();

      // Act
      mergeMaps(sourceMap, targetMap);

      const endTime = Date.now();

      // Assert
      expect(targetMap.size).toBe(1500);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms

      // Verify some entries
      expect(targetMap.get('source0')).toBeDefined();
      expect(targetMap.get('source999')).toBeDefined();
      expect(targetMap.get('target0')).toBeDefined();
      expect(targetMap.get('target499')).toBeDefined();
    });

    it('should maintain reference integrity (values should be the same objects, not copies)', () => {
      // Arrange
      const originalNode = new StateNode({ state: { id: 'test', content: '', children: [] } });

      const sourceMap = new Map<string, BaseNode>();
      sourceMap.set('test', originalNode);

      const targetMap = new Map<string, BaseNode>();

      // Act
      mergeMaps(sourceMap, targetMap);

      // Assert
      expect(targetMap.get('test')).toBe(originalNode); // Same reference
      expect(targetMap.get('test') === originalNode).toBe(true); // Strict equality

      // Modify original node to verify it's the same reference
      originalNode.children.push({} as BaseNode);
      expect(targetMap.get('test')?.children).toHaveLength(1);
    });
  });

  describe('Hierarchical ID Path Construction', () => {
    it('should build hierarchical paths for nested identifiable children', () => {
      // Arrange
      const mockParentNode = new StateNode({ state: { id: 'parent', content: '', children: [] } });
      const mockChildNode = new StateNode({ state: { id: 'child', content: '', children: [] } });
      const mockGrandchildNode = new StateNode({ state: { id: 'grandchild', content: '', children: [] } });

      const originalCreateFromJSON = StateNode.createFromJSON;
      StateNode.createFromJSON = jest.fn()
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockParentNode
        })
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockChildNode
        })
        .mockReturnValueOnce({
          success: true,
          error: undefined,
          node: mockGrandchildNode
        });

      const input = {
        state: {
          id: 'parent',
          content: '',
          children: [
            {
              state: {
                id: 'child',
                content: '',
                children: [
                  { state: { id: 'grandchild', content: '', children: [] } }
                ]
              }
            }
          ]
        }
      } as Node;

      // Act
      const result = parse(input);

      // Assert
      expect(result.root).toBe(mockParentNode);
      expect(result.error).toHaveLength(0);
      expect(result.identifiableChildren.size).toBe(2);
      expect(result.identifiableChildren.get('child')).toBe(mockChildNode);
      expect(result.identifiableChildren.get('child.grandchild')).toBe(mockGrandchildNode);

      // Cleanup
      StateNode.createFromJSON = originalCreateFromJSON;
    });
  });

  describe('Legacy Parser Test', () => {
    it('should parse a simple xml structure', () => {
      // Arrange
      const parsedFile = SimpleXML.convertXML(xml);

      // Act
      const { root, identifiableChildren } = parse(parsedFile);

      // Assert
      expect(root).toBeInstanceOf(BaseStateNode);
      expect(identifiableChildren.size).toBe(5);
    });
  });
});