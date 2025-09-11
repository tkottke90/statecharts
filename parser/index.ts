import { BaseNode, CreateFromJsonResponse } from "../models";
import { DataNode, DataModelNode, FinalNode, StateNode, TransitionNode } from "../nodes";
import { InitialNode } from "../nodes/initial.node";

export function parseType(input: Record<string, unknown>): CreateFromJsonResponse<BaseNode> {
  const [ keys ] = Object.keys(input);
  
  switch(keys) {
    case 'data': {
      return DataNode.createFromJSON(input);
    }
    case 'datamodel': {
      return DataModelNode.createFromJSON(input);
    }
    case 'final': {
      return FinalNode.createFromJSON(input);
    }
    case 'initial': {
      return InitialNode.createFromJSON(input);
    }
    case 'state': {
      return StateNode.createFromJSON(input);
    }
    case 'scxml': {
      return StateNode.createFromJSON({ id: 'root', ...input });
    }
    case 'transition': {
      return TransitionNode.createFromJSON(input);
    }
    default: {
      return { success: false, error: new Error(`Unknown Node: ${keys}`), node: undefined };
    }
  }
}

export function parse(input: Record<string, unknown>) {
  // Parse the Node
  const { success, node, error } = parseType(input);

  // Handle Error
  if (!success || !node) {
    throw error;
  }

  // Create a map to store children with ids
  const childrenWithIds = new Map<string, BaseNode>();
  
  // Parse children and assign to parent
  if (
    node.allowChildren &&
    'children' in input &&
    Array.isArray(input.children)
  ) {
    node.children = input.children.map((child) => {
      // Parse the child
      const childNode = parse(child);

      // Capture the child node in the map so we can access it 
      // later during execution
      if ('id' in childNode.root) {
        childrenWithIds.set(childNode.root.id as string, node);
      }

      // Add the child's children to the map if they have an id
      if (childNode.identifiableChildren.size > 0) {
        for (const [ key, value ] of childNode.identifiableChildren.entries()) {
          let nodeId = key;


          if ('id' in childNode.root) {
            nodeId = `${childNode.root.id}.${key}`;
          }


          childrenWithIds.set(nodeId, value);
        }
      }

      // Return the child
      return childNode.root;
    });
  }

  // Return the node
  return {
      root: node,
      identifiableChildren: childrenWithIds
    };
}