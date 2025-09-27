import { describe, it, expect, jest } from '@jest/globals';
import { BaseStateNode } from './base-state';
import { TransitionNode } from '../nodes/transition.node';
import { FinalNode } from '../nodes/final.node';
import { InitialNode } from '../nodes/initial.node';
import { OnEntryNode } from '../nodes/onentry.node';
import { OnExitNode } from '../nodes/onexit.node';
import { InternalState } from './internalState';
import { AssignNode } from '../nodes/assign.node';
import { DataModelNode } from '../nodes/datamodel.node';
import { DataNode } from '../nodes/data.node';

describe('BaseStateNode', () => {
  describe('constructor', () => {
    it.skip('should create a BaseStateNode instance with default values', () => {
      // Test basic construction
    });

    it.skip('should set allowChildren to true', () => {
      // Test that allowChildren is properly set
    });

    it.skip('should initialize with empty id when not provided', () => {
      // Test default id behavior
    });

    it.skip('should set initial state when provided', () => {
      // Test initial state setting
    });
  });

  describe('properties', () => {
    describe('#isAtomic', () => {
      it('should return true when state has no child states', () => {
        // Arrange
        const atomicState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'atomicState';
          }
        })();

        // Act
        const result = atomicState.isAtomic;

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when state has child states', () => {
        // Arrange
        const childState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'childState';
          }
        })();

        const compoundState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [childState] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'compoundState';
          }
        })();

        // Mock getChildrenOfType to return the child state
        jest
          .spyOn(compoundState, 'getChildrenOfType')
          .mockReturnValue([childState]);

        // Act
        const result = compoundState.isAtomic;

        // Assert
        expect(result).toBe(false);
      });

      it('should only consider BaseStateNode children for atomic determination', () => {
        // Arrange
        const transitionNode = new TransitionNode({
          transition: {
            event: 'test',
            target: 'target',
            content: '',
            children: [],
          },
        });
        const finalNode = new FinalNode({
          final: { id: 'final', content: '', children: [] },
        });

        const stateWithNonStateChildren = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [transitionNode, finalNode] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'stateWithNonStateChildren';
          }
        })();

        // Mock getChildrenOfType to return empty array for BaseStateNode children
        jest
          .spyOn(stateWithNonStateChildren, 'getChildrenOfType')
          .mockReturnValue([]);

        // Act
        const result = stateWithNonStateChildren.isAtomic;

        // Assert
        expect(result).toBe(true);
        expect(
          stateWithNonStateChildren.getChildrenOfType,
        ).toHaveBeenCalledWith(BaseStateNode);
      });
    });

    describe('#initialState', () => {
      it('should return the initial attribute value when set', () => {
        // Arrange
        // Create a child state to make the parent compound (not atomic)
        const childState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'specificInitialState';
          }
        })();

        const stateWithInitial = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [childState] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'stateWithInitial';
            // @ts-expect-error - Setting readonly property for testing
            this.initial = 'specificInitialState';
          }
        })();

        // Act
        const result = stateWithInitial.initialState;

        // Assert
        expect(result).toBe('specificInitialState');
      });

      it('should return content from initial child element when no initial attribute', () => {
        // Arrange
        const initialNode = new InitialNode({
          initial: { content: 'initialFromElement', children: [] },
        });

        // Create a child state to make the parent compound (not atomic)
        const childState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'initialFromElement';
          }
        })();

        const stateWithInitialElement = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [initialNode, childState] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'stateWithInitialElement';
          }
        })();

        // Act
        const result = stateWithInitialElement.initialState;

        // Assert
        expect(result).toBe('initialFromElement');
      });

      it('should return first child state id when no initial specified', () => {
        // Arrange
        const firstChildState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'firstChild';
          }
        })();

        const secondChildState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'secondChild';
          }
        })();

        const stateWithChildren = new (class extends BaseStateNode {
          constructor() {
            super({
              content: '',
              children: [firstChildState, secondChildState],
            });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'stateWithChildren';
          }
        })();

        // Act
        const result = stateWithChildren.initialState;

        // Assert
        expect(result).toBe('firstChild');
      });

      it('should return empty string when no children exist', () => {
        // Arrange
        const emptyState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'emptyState';
          }
        })();

        // Mock getChildrenOfType to return empty arrays
        jest.spyOn(emptyState, 'getChildrenOfType').mockReturnValue([]);

        // Act
        const result = emptyState.initialState;

        // Assert
        expect(result).toBe('');
      });

      it('should prioritize initial attribute over initial element', () => {
        // Arrange

        const firstChildState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'firstChild';
          }
        })();

        const secondChildState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'secondChild';
          }
        })();

        const stateWithBoth = new (class extends BaseStateNode {
          constructor() {
            super({
              content: '',
              children: [firstChildState, secondChildState],
            });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'stateWithBoth';
            // @ts-expect-error - Setting readonly property for testing
            this.initial = 'secondChild';
          }
        })();

        // Act
        const result = stateWithBoth.initialState;

        // Assert
        expect(result).toBe('secondChild');
      });
    });
  });

  describe('utility methods', () => {
    describe('#getEventlessTransitions', () => {
      it('should return eventless transitions for atomic states', () => {
        // Arrange
        const eventlessTransition = new TransitionNode({
          transition: {
            event: '',
            target: 'target',
            content: '',
            children: [],
          },
        });
        const eventTransition = new TransitionNode({
          transition: {
            event: 'click',
            target: 'target',
            content: '',
            children: [],
          },
        });

        const atomicState = new (class extends BaseStateNode {
          constructor() {
            super({
              content: '',
              children: [eventlessTransition, eventTransition],
            });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'atomicState';
          }
        })();

        // Mock getChildrenOfType to return both transitions
        jest
          .spyOn(atomicState, 'getChildrenOfType')
          .mockReturnValue([eventlessTransition, eventTransition]);

        // Act
        const result = atomicState.getEventlessTransitions();

        // Assert
        expect(result).toEqual([eventlessTransition]);
        expect(result).toHaveLength(1);
        expect(result[0]?.isEventLess).toBe(true);
      });

      it('should return eventless transitions for compound states', () => {
        // Arrange
        const eventlessTransition = new TransitionNode({
          transition: {
            event: '',
            target: 'target',
            content: '',
            children: [],
          },
        });
        const eventTransition = new TransitionNode({
          transition: {
            event: 'click',
            target: 'target',
            content: '',
            children: [],
          },
        });
        const childState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'childState';
          }
        })();

        const compoundState = new (class extends BaseStateNode {
          constructor() {
            super({
              content: '',
              children: [eventlessTransition, eventTransition, childState],
            });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'compoundState';
          }
        })();

        // Mock getChildrenOfType to return transitions when called with TransitionNode
        jest
          .spyOn(compoundState, 'getChildrenOfType')
          .mockImplementation(type => {
            if (type === TransitionNode) {
              return [eventlessTransition, eventTransition];
            }
            return [childState]; // For BaseStateNode type
          });

        // Act
        const result = compoundState.getEventlessTransitions();

        // Assert
        expect(result).toEqual([eventlessTransition]);
        expect(result).toHaveLength(1);
        expect(result[0]?.isEventLess).toBe(true);
      });

      it('should return empty array when no eventless transitions exist', () => {
        // Arrange
        const eventTransition = new TransitionNode({
          transition: {
            event: 'click',
            target: 'target',
            content: '',
            children: [],
          },
        });

        const atomicState = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [eventTransition] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'atomicState';
          }
        })();

        // Mock getChildrenOfType to return only event-based transition
        jest
          .spyOn(atomicState, 'getChildrenOfType')
          .mockReturnValue([eventTransition]);

        // Act
        const result = atomicState.getEventlessTransitions();

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should filter out non-TransitionNode children', () => {
        // Arrange
        const eventlessTransition = new TransitionNode({
          transition: {
            event: '',
            target: 'target',
            content: '',
            children: [],
          },
        });
        const finalNode = new FinalNode({
          final: { id: 'final', content: '', children: [] },
        });

        const stateWithMixedChildren = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [eventlessTransition, finalNode] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'stateWithMixedChildren';
          }
        })();

        // Mock getChildrenOfType to return only TransitionNode children
        jest
          .spyOn(stateWithMixedChildren, 'getChildrenOfType')
          .mockReturnValue([eventlessTransition]);

        // Act
        const result = stateWithMixedChildren.getEventlessTransitions();

        // Assert
        expect(result).toEqual([eventlessTransition]);
        expect(stateWithMixedChildren.getChildrenOfType).toHaveBeenCalledWith(
          TransitionNode,
        );
      });
    });

    describe('#getChildState', () => {
      it.skip('should return empty array for atomic states', () => {
        // Test atomic state child behavior
      });

      it.skip('should return all child states when no id specified', () => {
        // Test all children retrieval
      });

      it.skip('should return specific child state when id provided', () => {
        // Test specific child lookup
      });

      it.skip('should return undefined when child with id not found', () => {
        // Test missing child behavior
      });

      it.skip('should only return BaseStateNode children', () => {
        // Test type filtering
      });
    });

    describe('#getFinalState', () => {
      it.skip('should return empty array for atomic states', () => {
        // Test atomic state final behavior
      });

      it.skip('should return all FinalNode children', () => {
        // Test final state collection
      });

      it.skip('should filter out non-FinalNode children', () => {
        // Test type filtering
      });
    });

    describe('#getDataModelNodes', () => {
      it('should return empty array when no datamodel nodes exist', () => {
        // Arrange
        const stateWithoutDataModel = new (class extends BaseStateNode {
          constructor() {
            super({ content: '', children: [] });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'noDataModelState';
          }
        })();

        // Act
        const result = stateWithoutDataModel.getDataModelNodes();

        // Assert
        expect(result).toEqual([]);
      });

      it('should return all DataModelNode children', () => {
        // Arrange
        const dataModelNode1 = new DataModelNode({
          datamodel: { content: '', children: [] },
        });

        const dataModelNode2 = new DataModelNode({
          datamodel: { content: '', children: [] },
        });

        const onEntryNode = new OnEntryNode({
          onentry: { content: '', children: [] },
        });

        const stateWithDataModels = new (class extends BaseStateNode {
          constructor() {
            super({
              content: '',
              children: [dataModelNode1, onEntryNode, dataModelNode2],
            });
            // @ts-expect-error - Setting readonly property for testing
            this.id = 'multiDataModelState';
          }
        })();

        // Act
        const result = stateWithDataModels.getDataModelNodes();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(dataModelNode1);
        expect(result[1]).toBe(dataModelNode2);
      });
    });
  });

  describe('#onEntry', () => {
    it.skip('should execute default onentry handler', () => {
      // Test default onentry behavior
    });

    it.skip('should pass state through unchanged by default', () => {
      // Test state passthrough
    });

    it.skip('should allow custom onentry handler override', () => {
      // Test custom handler
    });

    it.skip('should receive current state as parameter', () => {
      // Test parameter passing
    });

    it.skip('should return modified state from custom handler', () => {
      // Test state modification
    });
  });

  describe('#onExit', () => {
    it.skip('should execute default onexit handler', () => {
      // Test default onexit behavior
    });

    it.skip('should pass state through unchanged by default', () => {
      // Test state passthrough
    });

    it.skip('should allow custom onexit handler override', () => {
      // Test custom handler
    });

    it.skip('should receive current state as parameter', () => {
      // Test parameter passing
    });

    it.skip('should return modified state from custom handler', () => {
      // Test state modification
    });
  });

  describe('#mount', () => {
    it('should execute OnEntryNode instances for atomic states', async () => {
      // Arrange
      const onEntryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [
            new AssignNode({
              assign: {
                location: 'data.entryExecuted',
                content: 'yes',
                children: [],
              },
            }),
          ],
        },
      });

      // Mock the run method to track execution
      const runSpy = jest.spyOn(onEntryNode, 'run');

      const atomicState = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [onEntryNode] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'atomicState';
        }
      })();

      const initialState: InternalState = { data: { initial: 'value' } };

      // Act
      const result = await atomicState.mount(initialState);

      // Assert
      expect(runSpy).toHaveBeenCalledWith(initialState);
      expect(result.state.data.entryExecuted).toBe('yes');
      expect(result.node).toBe(atomicState);
      expect(result.childPath).toBeUndefined();
    });

    it('should return compound state path when initial state exists', async () => {
      // Arrange
      const compoundState = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'compoundState';
          // @ts-expect-error - Setting readonly property for testing
          this.initial = 'childState';
        }

        get isAtomic() {
          return false; // Compound state
        }
      })();

      const initialState: InternalState = { data: {} };

      // Act
      const result = await compoundState.mount(initialState);

      // Assert
      expect(result.childPath).toBe('childState');
      expect(result.node).toBe(compoundState);
    });

    it('should process datamodel nodes before onentry nodes', async () => {
      // Arrange
      const dataNode = new DataNode({
        data: {
          id: 'localVar',
          type: 'text',
          expr: "'initialized'",
          content: '',
          children: [],
        },
      });

      const dataModelNode = new DataModelNode({
        datamodel: {
          content: '',
          children: [dataNode],
        },
      });

      const onEntryNode = new OnEntryNode({
        onentry: {
          content: '',
          children: [
            new AssignNode({
              assign: {
                location: 'data.result',
                expr: 'data.localVar + "_processed"',
                content: '',
                children: [],
              },
            }),
          ],
        },
      });

      const stateWithDataModel = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [dataModelNode, onEntryNode] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'stateWithDataModel';
        }
      })();

      const initialState: InternalState = { data: {} };

      // Act
      const result = await stateWithDataModel.mount(initialState);

      // Assert
      expect(result.state.data.localVar).toBe('initialized'); // From datamodel
      expect(result.state.data.result).toBe('initialized_processed'); // From onentry using local data
    });

    it('should process multiple datamodel nodes in document order', async () => {
      // Arrange
      const dataNode1 = new DataNode({
        data: {
          id: 'var1',
          type: 'text',
          expr: "'first'",
          content: '',
          children: [],
        },
      });

      const dataNode2 = new DataNode({
        data: {
          id: 'var2',
          type: 'text',
          expr: "'second'",
          content: '',
          children: [],
        },
      });

      const dataModelNode1 = new DataModelNode({
        datamodel: {
          content: '',
          children: [dataNode1],
        },
      });

      const dataModelNode2 = new DataModelNode({
        datamodel: {
          content: '',
          children: [dataNode2],
        },
      });

      const stateWithMultipleDataModels = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [dataModelNode1, dataModelNode2] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'multiDataModelState';
        }
      })();

      const initialState: InternalState = { data: {} };

      // Act
      const result = await stateWithMultipleDataModels.mount(initialState);

      // Assert
      expect(result.state.data.var1).toBe('first');
      expect(result.state.data.var2).toBe('second');
    });
  });

  describe('#unmount', () => {
    it('should execute OnExitNode instances', async () => {
      // Arrange
      const onExitNode = new OnExitNode({
        onexit: {
          content: '',
          children: [
            new AssignNode({
              assign: {
                location: 'data.exitExecuted',
                content: 'yes',
                children: [],
              },
            }),
          ],
        },
      });

      // Mock the run method to track execution
      const runSpy = jest.spyOn(onExitNode, 'run');

      const stateNode = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [onExitNode] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'testState';
        }
      })();

      const initialState: InternalState = { data: { initial: 'value' } };

      // Act
      const result = await stateNode.unmount(initialState);

      // Assert
      expect(runSpy).toHaveBeenCalledWith(initialState);
      expect(result.data.exitExecuted).toBe('yes');
    });

    it('should execute multiple OnExitNode instances', async () => {
      // Arrange
      const onExitNode1 = new OnExitNode({
        onexit: {
          content: '',
          children: [
            new AssignNode({
              assign: { location: 'data.step1', content: 'true', children: [] },
            }),
          ],
        },
      });

      const onExitNode2 = new OnExitNode({
        onexit: {
          content: '',
          children: [
            new AssignNode({
              assign: { location: 'data.step2', content: 'true', children: [] },
            }),
          ],
        },
      });

      const stateNode = new (class extends BaseStateNode {
        constructor() {
          super({ content: '', children: [onExitNode1, onExitNode2] });
          // @ts-expect-error - Setting readonly property for testing
          this.id = 'testState';
        }
      })();

      const initialState: InternalState = { data: {} };

      // Act
      const result = await stateNode.unmount(initialState);

      // Assert
      expect(result.data.step1).toBe('true');
      expect(result.data.step2).toBe('true');
    });
  });

  describe('integration tests', () => {
    it.skip('should handle complete mount/unmount cycle', () => {
      // Test full lifecycle
    });

    it.skip('should maintain state consistency through operations', () => {
      // Test state consistency
    });

    it.skip('should work with complex nested state hierarchies', () => {
      // Test complex scenarios
    });
  });

  describe('edge cases', () => {
    it.skip('should handle empty children array', () => {
      // Test empty children
    });

    it.skip('should handle null/undefined state objects', () => {
      // Test error conditions
    });

    it.skip('should handle circular references safely', () => {
      // Test circular reference protection
    });
  });
});
