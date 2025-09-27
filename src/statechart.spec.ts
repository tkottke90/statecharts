import { StateChart } from './statechart';
import { StateNode } from './nodes/state.node';
import { TransitionNode } from './nodes/transition.node';
import { BaseStateNode } from './models/base-state';
import { AssignNode } from './nodes/assign.node';
import { BaseExecutableNode } from './models/base-executable';
import { InternalState } from './models/internalState';
import { SCXMLNode } from './nodes/scxml.node';
import { OnEntryNode, OnExitNode } from './nodes';

// Type for mock active state chain entries
type MockActiveStateEntry = [string, Record<string, unknown>];
// Type for real active state chain entries
type ActiveStateEntry = [string, BaseStateNode];

// Helper function to create a mock SCXMLNode for testing
function createMockSCXMLNode(): SCXMLNode {
  return new SCXMLNode({
    scxml: {
      version: '1.0',
      initial: 'gameStart',
      name: 'TestStateMachine',
      datamodel: 'ecmascript',
      content: '',
      children: [],
    },
  });
}

describe('StateChart', () => {
  describe('computeEntrySet', () => {
    let stateChart: StateChart;

    beforeEach(() => {
      stateChart = new StateChart(
        'gameStart',
        createMockSCXMLNode(),
        new Map(),
      );
    });

    it('should compute entry set for same-parent transition', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.critical';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
      ];
      (
        stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }
      ).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual(['playing.healthSystem.critical']);
    });

    it('should compute entry set for cross-subsystem transition', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.scoreSystem.addingPoints';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
      ];
      (
        stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }
      ).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual([
        'playing.scoreSystem',
        'playing.scoreSystem.addingPoints',
      ]);
    });

    it('should compute entry set for transition from top level', () => {
      // Arrange
      const sourcePath = 'gameStart';
      const targetPath = 'playing.healthSystem.healthy';
      const mockActiveStateChain: MockActiveStateEntry[] = [['gameStart', {}]];
      (
        stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }
      ).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual([
        'playing',
        'playing.healthSystem',
        'playing.healthSystem.healthy',
      ]);
    });

    it('should return empty array when target is already active', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.healthy'; // Same state
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
      ];
      (
        stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }
      ).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual([]);
    });

    it('should include all ancestors up to LCCA', () => {
      // Arrange
      const sourcePath = 'playing.scoreSystem.scoring';
      const targetPath = 'playing.healthSystem.processingDamage';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.scoreSystem', {}],
        ['playing.scoreSystem.scoring', {}],
      ];
      (
        stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }
      ).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      // LCCA is 'playing', so should enter healthSystem and processingDamage
      expect(result).toEqual([
        'playing.healthSystem',
        'playing.healthSystem.processingDamage',
      ]);
    });

    it('should maintain proper entry order (shallowest first)', () => {
      // Arrange
      const sourcePath = 'gameStart';
      const targetPath = 'playing.healthSystem.processingDamage.subState';
      const mockActiveStateChain: MockActiveStateEntry[] = [['gameStart', {}]];
      (
        stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }
      ).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      // Verify shallowest states come first (proper entry order)
      expect(result).toEqual([
        'playing', // Depth 1
        'playing.healthSystem', // Depth 2
        'playing.healthSystem.processingDamage', // Depth 3
        'playing.healthSystem.processingDamage.subState', // Depth 4
      ]);

      // Verify order: each subsequent state is deeper than the previous
      for (let i = 1; i < result.length; i++) {
        const prevPath = result[i - 1];
        const currPath = result[i];
        if (prevPath && currPath) {
          const prevDepth = prevPath.split('.').length;
          const currDepth = currPath.split('.').length;
          expect(currDepth).toBeGreaterThanOrEqual(prevDepth);
        }
      }
    });

    it('should handle compound state entry with default initial states', () => {
      // Arrange
      const sourcePath = 'gameStart';
      const targetPath = 'playing.healthSystem'; // Entering compound state
      const mockActiveStateChain: MockActiveStateEntry[] = [['gameStart', {}]];
      (
        stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }
      ).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual(['playing', 'playing.healthSystem']);
    });

    it('should handle partial path entry', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.critical.subState';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
      ];
      (
        stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }
      ).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      // Should only enter the new parts of the path
      expect(result).toEqual([
        'playing.healthSystem.critical',
        'playing.healthSystem.critical.subState',
      ]);
    });

    it('should handle entry when parent is already active', () => {
      // Arrange
      const sourcePath = 'playing.scoreSystem.scoring';
      const targetPath = 'playing.healthSystem.healthy';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.scoreSystem', {}],
        ['playing.scoreSystem.scoring', {}],
        ['playing.healthSystem', {}], // Parent already active
      ];
      (
        stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }
      ).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      // Should only enter the target, not the already-active parent
      expect(result).toEqual(['playing.healthSystem.healthy']);
    });
  });

  describe('isActive', () => {
    it.todo('should return true for active state paths');

    it.todo('should return false for inactive state paths');

    it.todo('should handle root level state paths');

    it.todo('should handle deep nested state paths');

    it.todo('should be case sensitive');
  });

  describe('exitStates', () => {
    let stateChart: StateChart;

    beforeEach(() => {
      stateChart = new StateChart(
        'gameStart',
        createMockSCXMLNode(),
        new Map(),
      );
    });

    it('should exit states and call unmount handlers', async () => {
      // Arrange
      // Create a real TransitionNode instance
      const transition = new TransitionNode({
        transition: {
          target: 'playing.healthSystem.critical',
          event: '', // eventless transition
          content: '',
          children: [],
        },
      });

      // Create a real atomic StateNode instance with custom unmount behavior
      const healthyStateNode = new StateNode({
        state: {
          id: 'healthy',
          content: '',
          children: [],
        },
      });

      // Add the transition to the atomic state (this should now work with our fix)
      healthyStateNode.children.push(transition);

      // Spy on the unmount method to verify it's called and mock its return value
      const unmountSpy = jest
        .spyOn(healthyStateNode, 'unmount')
        .mockResolvedValue({ data: { exitData: 'test' } });

      // Set up active state chain with real StateNode instances
      const activeStateChain: ActiveStateEntry[] = [
        [
          'playing',
          new StateNode({
            state: { id: 'playing', content: '', children: [] },
          }),
        ],
        [
          'playing.healthSystem',
          new StateNode({
            state: { id: 'healthSystem', content: '', children: [] },
          }),
        ],
        ['playing.healthSystem.healthy', healthyStateNode],
      ];

      // Manually set the state chain
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = activeStateChain;

      const initialState = { currentData: 'initial' };

      // Act
      const result = await (stateChart as any).exitStates(
        [transition],
        initialState,
      );

      // Assert
      expect(unmountSpy).toHaveBeenCalledWith(initialState);
      expect(result).toEqual({
        currentData: 'initial',
        data: { exitData: 'test' },
      });

      // Verify state was removed from active chain
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(
        updatedActiveChain.find(
          ([path]) => path === 'playing.healthSystem.healthy',
        ),
      ).toBeUndefined();
    });

    it('should handle multiple transitions with different exit sets', async () => {
      // Arrange
      const transition1 = new TransitionNode({
        transition: {
          target: 'playing.scoreSystem.scoring',
          event: '',
          content: '',
          children: [],
        },
      });

      const transition2 = new TransitionNode({
        transition: {
          target: 'playing.powerUpSystem.active',
          event: '',
          content: '',
          children: [],
        },
      });

      const assignNode = new AssignNode({
        assign: {
          location: 'data.healthy',
          expr: '"exited"', // Use expr with proper string literal
          content: '', // Required by BaseNode
          children: []
        }
      })

      const healthyOnExit = new OnExitNode({
        onexit: { content: '', children: [assignNode] }
      })

      // Create StateNode instances
      const healthyStateNode = new StateNode({
        state: { id: 'healthy', content: '', children: [healthyOnExit, transition1] },
      });

      const criticalStateNode = new StateNode({
        state: { id: 'critical', content: '', children: [transition2] },
      });

      // Set up active state chain
      const activeStateChain: ActiveStateEntry[] = [
        [
          'playing',
          new StateNode({
            state: { id: 'playing', content: '', children: [] },
          }),
        ],
        [
          'playing.healthSystem',
          new StateNode({
            state: { id: 'healthSystem', content: '', children: [] },
          }),
        ],
        ['playing.healthSystem.healthy', healthyStateNode],
        ['playing.healthSystem.critical', criticalStateNode],
      ];

      // Manually set the state chain
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = activeStateChain;

      const initialState = { baseData: 'base' };

      // Act
      const result = await (stateChart as any).exitStates(
        [transition1, transition2],
        initialState,
      );

      // Assert
      expect(result).toEqual({
        baseData: 'base',
        data: { healthy: 'exited' },
      });

      // Verify states were removed from active chain
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      const chainPaths = updatedActiveChain.map(([path]) => path);
      expect(chainPaths).not.toContain('playing.healthSystem.healthy');
      expect(chainPaths).not.toContain('playing.healthSystem.critical');
    });

    it('should handle transitions with no source state gracefully', async () => {
      // Arrange
      const transition = new TransitionNode({
        transition: {
          target: 'playing.healthSystem.critical',
          event: '',
          content: '',
          children: [],
        },
      });

      // Manually set the state chain
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = [];

      const initialState = { baseData: 'base' };

      // Act
      const result = await (stateChart as any).exitStates(
        [transition],
        initialState,
      );

      // Assert
      expect(result).toEqual({ baseData: 'base' });

      // Verify no changes to active chain
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(updatedActiveChain).toHaveLength(0);
    });
  });

  describe('enterStates', () => {
    let stateChart: StateChart;

    beforeEach(() => {
      stateChart = new StateChart(
        'gameStart',
        createMockSCXMLNode(),
        new Map(),
      );
    });

    it('should enter states and call mount handlers', async () => {
      // Arrange
      // Create a real TransitionNode instance
      const transition = new TransitionNode({
        transition: {
          target: 'playing.healthSystem.healthy',
          event: '', // eventless transition
          content: '',
          children: [],
        },
      });

      // Create real StateNode instances with custom mount behavior
      const playingStateNode = new StateNode({
        state: {
          id: 'playing',
          content: '',
          children: [],
        },
      });

      const healthSystemStateNode = new StateNode({
        state: {
          id: 'healthSystem',
          content: '',
          children: [],
        },
      });

      const healthyStateNode = new StateNode({
        state: {
          id: 'healthy',
          content: '',
          children: [],
        },
      });

      // Spy on the mount methods to verify they're called and mock their return values
      const playingMountSpy = jest
        .spyOn(playingStateNode, 'mount')
        .mockResolvedValue({
          node: playingStateNode,
          state: { data: { playingData: 'entered' } },
        });

      const healthSystemMountSpy = jest
        .spyOn(healthSystemStateNode, 'mount')
        .mockResolvedValue({
          node: healthSystemStateNode,
          state: { data: { healthSystemData: 'entered' } },
        });

      const healthyMountSpy = jest
        .spyOn(healthyStateNode, 'mount')
        .mockResolvedValue({
          node: healthyStateNode,
          state: { data: { healthyData: 'entered' } },
        });

      // Set up states map
      const statesMap = new Map([
        ['playing', playingStateNode],
        ['playing.healthSystem', healthSystemStateNode],
        ['playing.healthSystem.healthy', healthyStateNode],
      ]);
      (stateChart as unknown as { states: Map<string, BaseStateNode> }).states =
        statesMap;

      // Set up initial active state chain (empty for this test)
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = [];

      const initialState = { currentData: 'initial' };

      // Act
      const result = await (stateChart as any).enterStates(
        [transition],
        initialState,
      );

      // Assert
      expect(playingMountSpy).toHaveBeenCalledWith({
        currentData: 'initial',
        data: {},
      });
      expect(healthSystemMountSpy).toHaveBeenCalled();
      expect(healthyMountSpy).toHaveBeenCalled();

      expect(result).toEqual({
        currentData: 'initial',
        data: { healthyData: 'entered' },
      });

      // Verify states were added to active chain in correct order
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(updatedActiveChain).toHaveLength(3);

      expect(updatedActiveChain[0][0]).toBe('playing');
      expect(updatedActiveChain[1][0]).toBe('playing.healthSystem');
      expect(updatedActiveChain[2][0]).toBe('playing.healthSystem.healthy');
    });

    it('should only enter states that are not already active', async () => {
      // Arrange
      const transition = new TransitionNode({
        transition: {
          target: 'playing.healthSystem.critical',
          event: '',
          content: '',
          children: [],
        },
      });

      // Create StateNode instances
      const playingStateNode = new StateNode({
        state: { id: 'playing', content: '', children: [] },
      });
      const healthSystemStateNode = new StateNode({
        state: { id: 'healthSystem', content: '', children: [] },
      });
      const criticalStateNode = new StateNode({
        state: { id: 'critical', content: '', children: [] },
      });

      // Mock mount methods
      const playingMountSpy = jest
        .spyOn(playingStateNode, 'mount')
        .mockResolvedValue({
          node: playingStateNode,
          state: { data: { playing: true } },
        });
      const healthSystemMountSpy = jest
        .spyOn(healthSystemStateNode, 'mount')
        .mockResolvedValue({
          node: healthSystemStateNode,
          state: { data: { health: 100 } },
        });
      const criticalMountSpy = jest
        .spyOn(criticalStateNode, 'mount')
        .mockResolvedValue({
          node: criticalStateNode,
          state: { data: { status: 'critical' } },
        });

      // Set up states map
      const statesMap = new Map([
        ['playing', playingStateNode],
        ['playing.healthSystem', healthSystemStateNode],
        ['playing.healthSystem.critical', criticalStateNode],
      ]);
      (stateChart as unknown as { states: Map<string, BaseStateNode> }).states =
        statesMap;

      // Set up active state chain with some states already active
      const activeStateChain: ActiveStateEntry[] = [
        ['playing', playingStateNode],
        ['playing.healthSystem', healthSystemStateNode],
      ];
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = activeStateChain;

      const initialState = { baseData: 'base' };

      // Act
      const result = await (stateChart as any).enterStates(
        [transition],
        initialState,
      );

      // Assert
      // Only the critical state should be entered (playing and healthSystem are already active)
      expect(playingMountSpy).not.toHaveBeenCalled();
      expect(healthSystemMountSpy).not.toHaveBeenCalled();
      expect(criticalMountSpy).toHaveBeenCalledWith({
        baseData: 'base',
        data: {},
      });

      expect(result).toEqual({
        baseData: 'base',
        data: { status: 'critical' },
      });

      // Verify only the new state was added to active chain
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(updatedActiveChain).toHaveLength(3);
      expect(updatedActiveChain[2][0]).toBe('playing.healthSystem.critical');
    });

    it('should handle multiple transitions with different targets', async () => {
      // Arrange
      const transition1 = new TransitionNode({
        transition: {
          target: 'playing.healthSystem.healthy',
          event: '',
          content: '',
          children: [],
        },
      });

      const transition2 = new TransitionNode({
        transition: {
          target: 'playing.scoreSystem.scoring',
          event: '',
          content: '',
          children: [],
        },
      });

      // Create StateNode instances
      const playingStateNode = new StateNode({
        state: { id: 'playing', content: '', children: [] },
      });
      const healthSystemStateNode = new StateNode({
        state: { id: 'healthSystem', content: '', children: [] },
      });
      const healthyStateNode = new StateNode({
        state: { id: 'healthy', content: '', children: [] },
      });
      const scoreSystemStateNode = new StateNode({
        state: { id: 'scoreSystem', content: '', children: [] },
      });
      const scoringStateNode = new StateNode({
        state: { id: 'scoring', content: '', children: [] },
      });

      // Mock mount methods
      jest.spyOn(playingStateNode, 'mount').mockResolvedValue({
        node: playingStateNode,
        state: { data: { playing: true } },
      });
      jest.spyOn(healthSystemStateNode, 'mount').mockResolvedValue({
        node: healthSystemStateNode,
        state: { data: { health: 100 } },
      });
      jest.spyOn(healthyStateNode, 'mount').mockResolvedValue({
        node: healthyStateNode,
        state: { data: { status: 'healthy' } },
      });
      jest.spyOn(scoreSystemStateNode, 'mount').mockResolvedValue({
        node: scoreSystemStateNode,
        state: { data: { score: 0 } },
      });
      jest.spyOn(scoringStateNode, 'mount').mockResolvedValue({
        node: scoringStateNode,
        state: { data: { scoring: true } },
      });

      // Set up states map
      const statesMap = new Map([
        ['playing', playingStateNode],
        ['playing.healthSystem', healthSystemStateNode],
        ['playing.healthSystem.healthy', healthyStateNode],
        ['playing.scoreSystem', scoreSystemStateNode],
        ['playing.scoreSystem.scoring', scoringStateNode],
      ]);
      (stateChart as unknown as { states: Map<string, BaseStateNode> }).states =
        statesMap;
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = [];

      const initialState = { baseData: 'base' };

      // Act
      const result = await (stateChart as any).enterStates(
        [transition1, transition2],
        initialState,
      );

      // Assert
      expect(result).toEqual({
        baseData: 'base',
        data: { scoring: true },
      });

      // Verify all unique states were added to active chain
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      const chainPaths = updatedActiveChain.map(([path]) => path);
      expect(chainPaths).toContain('playing');
      expect(chainPaths).toContain('playing.healthSystem');
      expect(chainPaths).toContain('playing.healthSystem.healthy');
      expect(chainPaths).toContain('playing.scoreSystem');
      expect(chainPaths).toContain('playing.scoreSystem.scoring');
    });

    it('should handle transitions with no target gracefully', async () => {
      // Arrange
      const transition = new TransitionNode({
        transition: {
          target: '', // No target
          event: '',
          content: '',
          children: [],
        },
      });

      const initialState = { baseData: 'base' };

      // Act
      const result = await (stateChart as any).enterStates(
        [transition],
        initialState,
      );

      // Assert
      expect(result).toEqual({ baseData: 'base' });

      // Verify no states were added to active chain
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(updatedActiveChain).toHaveLength(0);
    });

    it('should handle states that do not exist in states map', async () => {
      // Arrange
      const transition = new TransitionNode({
        transition: {
          target: 'nonexistent.state',
          event: '',
          content: '',
          children: [],
        },
      });

      // Set up empty states map
      (stateChart as unknown as { states: Map<string, BaseStateNode> }).states =
        new Map();
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = [];

      const initialState = { baseData: 'base' };

      // Act
      const result = await (stateChart as any).enterStates(
        [transition],
        initialState,
      );

      // Assert
      expect(result).toEqual({ baseData: 'base' });

      // Verify no states were added to active chain
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(updatedActiveChain).toHaveLength(0);
    });

    it('should maintain proper entry order (shallowest first)', async () => {
      // Arrange
      const transition = new TransitionNode({
        transition: {
          target: 'a.b.c.d',
          event: '',
          content: '',
          children: [],
        },
      });

      // Create StateNode instances
      const stateA = new StateNode({
        state: { id: 'a', content: '', children: [] },
      });
      const stateB = new StateNode({
        state: { id: 'b', content: '', children: [] },
      });
      const stateC = new StateNode({
        state: { id: 'c', content: '', children: [] },
      });
      const stateD = new StateNode({
        state: { id: 'd', content: '', children: [] },
      });

      // Track the order of mount calls
      const mountOrder: string[] = [];
      jest.spyOn(stateA, 'mount').mockImplementation(async () => {
        mountOrder.push('a');
        return { node: stateA, state: { data: { a: true } } };
      });
      jest.spyOn(stateB, 'mount').mockImplementation(async () => {
        mountOrder.push('a.b');
        return { node: stateB, state: { data: { b: true } } };
      });
      jest.spyOn(stateC, 'mount').mockImplementation(async () => {
        mountOrder.push('a.b.c');
        return { node: stateC, state: { data: { c: true } } };
      });
      jest.spyOn(stateD, 'mount').mockImplementation(async () => {
        mountOrder.push('a.b.c.d');
        return { node: stateD, state: { data: { d: true } } };
      });

      // Set up states map
      const statesMap = new Map([
        ['a', stateA],
        ['a.b', stateB],
        ['a.b.c', stateC],
        ['a.b.c.d', stateD],
      ]);
      (stateChart as unknown as { states: Map<string, BaseStateNode> }).states =
        statesMap;
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = [];

      const initialState = {};

      // Act
      await (stateChart as any).enterStates([transition], initialState);

      // Assert - verify mount order is shallowest first
      expect(mountOrder).toEqual(['a', 'a.b', 'a.b.c', 'a.b.c.d']);

      // Verify active chain order matches entry order
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      const chainPaths = updatedActiveChain.map(([path]) => path);
      expect(chainPaths).toEqual(['a', 'a.b', 'a.b.c', 'a.b.c.d']);
    });
  });

  describe('updateStates', () => {
    let stateChart: StateChart;

    beforeEach(() => {
      stateChart = new StateChart(
        'gameStart',
        createMockSCXMLNode(),
        new Map(),
      );
    });

    it('should add states to active chain when updateMethod is "add"', async () => {
      // Arrange
      const assignNode = new AssignNode({
        assign: {
          children: [],
          content: 'added',
          location: 'data.test',
        },
      });

      const onEntryNode = new OnEntryNode({
        onentry: { content: '', children: [assignNode] },
      });

      const stateNode = new StateNode({
        state: { id: 'testState', content: '', children: [onEntryNode] },
      });

      const mountSpy = jest.spyOn(stateNode, 'mount');

      const stateChart = new StateChart(
        'testState',
        new SCXMLNode({
          scxml: {
            content: '',
            children: [stateNode],
            version: '1.0',
            datamodel: 'ecmascript',
          },
        }),
        new Map([[stateNode.id, stateNode]]),
      );

      const initialState: InternalState = {
        data: {},
      };

      // Act
      const result = await (stateChart as any).updateStates(
        initialState,
        ['testState'],
        'add',
      );

      // Assert
      expect(mountSpy).toHaveBeenCalledWith(initialState);

      expect(result).toEqual({
        data: { test: 'added' },
      });

      // Verify state was added to active chain
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(updatedActiveChain).toHaveLength(1);
      expect(updatedActiveChain[0][0]).toBe('testState');
    });

    it('should remove states from active chain when updateMethod is "remove"', async () => {
      // Arrange
      const stateNode = new StateNode({
        state: { id: 'testState', content: '', children: [] },
      });

      const unmountSpy = jest.spyOn(stateNode, 'unmount').mockResolvedValue({
        data: { test: 'removed' },
      });

      // Set up active state chain with the state to remove
      const activeStateChain: ActiveStateEntry[] = [['testState', stateNode]];
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = activeStateChain;

      const initialState = { baseData: 'base' };

      // Act
      const result = await (stateChart as any).updateStates(
        initialState,
        ['testState'],
        'remove',
      );

      // Assert
      expect(unmountSpy).toHaveBeenCalledWith(initialState);
      expect(result).toEqual({
        baseData: 'base',
        data: { test: 'removed' },
      });

      // Verify state was removed from active chain
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(updatedActiveChain).toHaveLength(0);
    });

    it('should skip states not in active chain when removing', async () => {
      // Arrange
      const initialState = { baseData: 'base' };
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = [];

      // Act
      const result = await (stateChart as any).updateStates(
        initialState,
        ['nonexistentState'],
        'remove',
      );

      // Assert
      expect(result).toEqual({ baseData: 'base' });

      // Verify active chain remains empty
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(updatedActiveChain).toHaveLength(0);
    });

    it('should handle multiple states in correct order', async () => {
      // Arrange
      const stateA = new StateNode({
        state: { id: 'a', content: '', children: [] },
      });
      const stateB = new StateNode({
        state: { id: 'b', content: '', children: [] },
      });

      const mountOrder: string[] = [];
      jest.spyOn(stateA, 'mount').mockImplementation(async () => {
        mountOrder.push('a');
        return { node: stateA, state: { data: { a: true } } };
      });
      jest.spyOn(stateB, 'mount').mockImplementation(async () => {
        mountOrder.push('b');
        return { node: stateB, state: { data: { b: true } } };
      });

      // Set up states map
      const statesMap = new Map([
        ['a', stateA],
        ['b', stateB],
      ]);
      (stateChart as unknown as { states: Map<string, BaseStateNode> }).states =
        statesMap;
      (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain = [];

      const initialState = {};

      // Act
      await (stateChart as any).updateStates(initialState, ['a', 'b'], 'add');

      // Assert
      expect(mountOrder).toEqual(['a', 'b']);

      // Verify states were added in correct order
      const updatedActiveChain = (
        stateChart as unknown as { activeStateChain: ActiveStateEntry[] }
      ).activeStateChain;
      expect(updatedActiveChain).toHaveLength(2);
      expect(updatedActiveChain[0][0]).toBe('a');
      expect(updatedActiveChain[1][0]).toBe('b');
    });
  });

  describe('Integration Tests', () => {
    it.todo('should handle complete microstep with exit and entry sets');

    it.todo('should process eventless transitions correctly');

    it.todo('should handle parallel state transitions');

    it.todo('should maintain activeStateChain consistency');

    it.todo('should handle complex state hierarchy transitions');
  });

  describe('Edge Cases', () => {
    it.todo('should handle malformed paths gracefully');

    it.todo('should handle transitions with no target');

    it.todo('should handle self-transitions');

    it.todo('should handle transitions between parallel regions');

    it.todo('should handle history state transitions');
  });
});
