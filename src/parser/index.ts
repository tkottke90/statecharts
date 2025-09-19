import z from 'zod';
import { BaseNode, Node } from '../models/base';
import { CreateFromJsonResponse } from '../models/methods';
import {
  AssignNode,
  DataModelNode,
  DataNode,
  ElseIfNode,
  ElseNode,
  FinalNode,
  IfNode,
  InitialNode,
  LogNode,
  OnEntryNode,
  OnExitNode,
  ParallelNode,
  ParamNode,
  RaiseNode,
  SCXMLNode,
  SendNode,
  StateNode,
  TransitionNode
} from '../nodes';

type NodeInitMethod<T extends BaseNode = BaseNode> = (
  input: Record<string, unknown>,
) => CreateFromJsonResponse<T>;

const nodeMap: Record<string, NodeInitMethod> = {
  assign: (input: Record<string, unknown>) => AssignNode.createFromJSON(input),
  data: (input: Record<string, unknown>) => DataNode.createFromJSON(input),
  datamodel: (input: Record<string, unknown>) => DataModelNode.createFromJSON(input),
  else: (input: Record<string, unknown>) => ElseNode.createFromJSON(input),
  elseif: (input: Record<string, unknown>) => ElseIfNode.createFromJSON(input),
  final: (input: Record<string, unknown>) => FinalNode.createFromJSON(input),
  if: (input: Record<string, unknown>) => IfNode.createFromJSON(input),
  initial: (input: Record<string, unknown>) => InitialNode.createFromJSON(input),
  log: (input: Record<string, unknown>) => LogNode.createFromJSON(input),
  onentry: (input: Record<string, unknown>) =>  OnEntryNode.createFromJSON(input),
  onexit: (input: Record<string, unknown>) => OnExitNode.createFromJSON(input),
  parallel: (input: Record<string, unknown>) => ParallelNode.createFromJSON(input),
  param: (input: Record<string, unknown>) => ParamNode.createFromJSON(input),
  raise: (input: Record<string, unknown>) => RaiseNode.createFromJSON(input),
  scxml: (input: Record<string, unknown>) => SCXMLNode.createFromJSON(input),
  send: (input: Record<string, unknown>) => SendNode.createFromJSON(input),
  state: (input: Record<string, unknown>) => StateNode.createFromJSON(input),
  transition: (input: Record<string, unknown>) =>TransitionNode.createFromJSON(input),
};

export function mergeMaps(
  sourceMap: Map<string, BaseNode>,
  targetMap: Map<string, BaseNode>,
) {
  for (const [key, value] of sourceMap) {
    targetMap.set(key, value);
  }
}

export function appendToMapKey(
  suffix: string,
  sourceMap: Map<string, BaseNode>,
) {
  return new Map(
    Array.from(sourceMap.entries()).map(([key, value]) => [
      `${suffix}.${key}`,
      value,
    ]),
  );
}

export function parseType(
  input: Record<string, unknown>,
): CreateFromJsonResponse<BaseNode> {
  const [key] = Object.keys(input);

  if (key && key in nodeMap) {
    const nodeInitMethod = nodeMap[key];
    if (nodeInitMethod) {
      return nodeInitMethod(input);
    }
  }

  // Return error if no valid node type found
  return {
    success: false,
    node: undefined,
    error: new Error(`Unknown node type: ${key || 'undefined'}`),
  };
}

interface ParseResponse<T extends BaseNode = BaseNode> {
  root?: T | undefined;
  identifiableChildren: Map<string, BaseNode>;
  error: Array<z.ZodError | Error>;
}

export function parse<T extends BaseNode = BaseNode>(
  input: Node,
): ParseResponse<T> {
  // Create a map to store children with ids
  const childrenWithIds = new Map<string, BaseNode>();

  // Parse the Node
  const { success, node, error } = parseType(input);

  // Handle Error
  if (!success) {
    // If there was an error parsing the node, we should record it
    if (error) {
      return {
        root: undefined,
        identifiableChildren: childrenWithIds,
        error: [error],
      };
    }

    // We should not reach this state but if we do, we record the issue
    // and return to the caller
    return {
      root: undefined,
      identifiableChildren: childrenWithIds,
      error: [
        new Error(
          `Node could not be loaded even though it contained the correct schema`,
        ),
      ],
    };
  }

  // Get the node label so we can access the children
  const nodeLabel = node.label;

  const childIssues: ParseResponse['error'] = [];

  // Parse children and assign to parent
  if (node.allowChildren && Array.isArray(input[nodeLabel]?.children)) {
    const parsedChildren = input[nodeLabel].children.map(child => {
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
        for (const [key, value] of childNode.identifiableChildren.entries()) {
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

    // Filter out any undefined children
    node.children = parsedChildren.filter(child => child !== undefined);
  }

  // Return the node
  return {
    root: node as T,
    identifiableChildren: childrenWithIds,
    error: childIssues,
  };
}
