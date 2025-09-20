import { DataModelNode } from "../../nodes/datamodel.node";
import { BaseNode } from "../base";
import { InternalState } from "../internalState";
import { Constructor } from "./core";
 
// This mixin adds a initializeDataModel method, with getters and setters
// for changing it with an encapsulated private property:
 
export function InitializeDataModelMixin<TBase extends Constructor>(Base: TBase) {
  return class InitializeDataModel extends Base {
    
    async initializeDataModel(
      node: BaseNode,
      state: InternalState
    ) {
      // Find all datamodel nodes in the root SCXML node
      const dataModelNodes = node.getChildrenOfType(DataModelNode);

      let currentState = { ...state };

      // Execute each datamodel node to initialize the data
      for (const dataModelNode of dataModelNodes) {
        currentState = await dataModelNode.run(currentState);
      }

      return currentState;
    }
  };
}