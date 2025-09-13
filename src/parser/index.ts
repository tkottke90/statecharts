import z from "zod";
import { BaseNode, CreateFromJsonResponse, Node } from "../models";
import { DataNode, DataModelNode, FinalNode, StateNode, TransitionNode } from "../nodes";
import { InitialNode } from "../nodes/initial.node";

export function mergeMaps(sourceMap: Map<string, BaseNode>, targetMap: Map<string, BaseNode>) {
  for (const [ key, value ] of sourceMap) {
    targetMap.set(key, value);
  }
}

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
    case 'transition': {
      return TransitionNode.createFromJSON(input);
    }
    default: {
      return { success: false, error: new Error(`Unknown Node: ${keys}`), node: undefined };
    }
  }
}


interface ParseResponse {
  root?: BaseNode | undefined;
  identifiableChildren: Map<string, BaseNode>;
  error: Array<z.ZodError | Error>;
}

export function parse(input: Node): ParseResponse {
  // Create a map to store children with ids
  const childrenWithIds = new Map<string, BaseNode>();
  
  // Parse the Node
  const { success, node, error } = parseType(input);

  // Handle Error
  if (!success || node === undefined) {
    
    // If there was an error parsing the node, we should record it
    if (error !== undefined) {
      return { 
        root: undefined,
        identifiableChildren: childrenWithIds,
        error: [error]
      };
    }
    
    // We should not reach this state but if we do, we record the issue
    // and return to the caller
    return { 
      root: undefined,
      identifiableChildren: childrenWithIds,
      error: [
        new Error(`Node could not be loaded even though it contained the correct schema`)
      ]
    };
  }

  // Get the node label so we can access the children
  const nodeLabel = node.label;

  const childIssues: ParseResponse['error'] = [];
  
  // Parse children and assign to parent
  if (
    node.allowChildren &&
    Array.isArray(input[nodeLabel]?.children)
  ) {
    const parsedChildren = input[nodeLabel].children
      .map((child) => {
        // Parse the child
        const childNode = parse(child);

        if (!childNode.root) {
          childIssues.push(...childNode.error);
          return;
        }

        // If there were any issues parsing the child, we should
        // record them and continue
        if (childNode.error.length > 0) {
          childIssues.push(...childNode.error);
          return;
        }


        // Capture the child node in the map so we can access it
        // later during execution
        if ('id' in childNode.root) {
          childrenWithIds.set(childNode.root.id as string, childNode.root);
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
      })

      // Filter out any undefined children
      node.children = parsedChildren.filter(child => child !== undefined);
  }

  // Return the node
  return {
      root: node,
      identifiableChildren: childrenWithIds,
      error: childIssues
    };
}