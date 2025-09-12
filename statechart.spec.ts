/* eslint-disable @typescript-eslint/no-explicit-any */
import { StateChart } from './statechart';
import { StateNode } from './nodes/state.node';
import { TransitionNode } from './nodes/transition.node';
import { BaseStateNode } from './models/base-state';

// Type for mock active state chain entries
type MockActiveStateEntry = [string, Record<string, unknown>];
// Type for real active state chain entries
type ActiveStateEntry = [string, BaseStateNode];

describe('StateChart', () => {


  describe('computeEntrySet', () => {
    let stateChart: StateChart;

    beforeEach(() => {
      stateChart = new StateChart('gameStart', new Map());
    });

    it('should compute entry set for same-parent transition', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.critical';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

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
        ['playing.healthSystem.healthy', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual([
        'playing.scoreSystem',
        'playing.scoreSystem.addingPoints'
      ]);
    });

    it('should compute entry set for transition from top level', () => {
      // Arrange
      const sourcePath = 'gameStart';
      const targetPath = 'playing.healthSystem.healthy';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['gameStart', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual([
        'playing',
        'playing.healthSystem',
        'playing.healthSystem.healthy'
      ]);
    });

    it('should return empty array when target is already active', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.healthy'; // Same state
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

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
        ['playing.scoreSystem.scoring', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      // LCCA is 'playing', so should enter healthSystem and processingDamage
      expect(result).toEqual([
        'playing.healthSystem',
        'playing.healthSystem.processingDamage'
      ]);
    });

    it('should maintain proper entry order (shallowest first)', () => {
      // Arrange
      const sourcePath = 'gameStart';
      const targetPath = 'playing.healthSystem.processingDamage.subState';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['gameStart', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      // Verify shallowest states come first (proper entry order)
      expect(result).toEqual([
        'playing',                                    // Depth 1
        'playing.healthSystem',                       // Depth 2
        'playing.healthSystem.processingDamage',      // Depth 3
        'playing.healthSystem.processingDamage.subState' // Depth 4
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
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['gameStart', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual([
        'playing',
        'playing.healthSystem'
      ]);
    });

    it('should handle partial path entry', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.critical.subState';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeEntrySet(sourcePath, targetPath);

      // Assert
      // Should only enter the new parts of the path
      expect(result).toEqual([
        'playing.healthSystem.critical',
        'playing.healthSystem.critical.subState'
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
        ['playing.healthSystem', {}] // Parent already active
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

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
      stateChart = new StateChart('gameStart', new Map());
    });

    it('should exit states and call unmount handlers', () => {
      // Arrange
      // Create a real TransitionNode instance
      const transition = new TransitionNode({
        transition: {
          target: 'playing.healthSystem.critical',
          event: '', // eventless transition
          content: '',
          children: []
        }
      });

      // Create a real atomic StateNode instance with custom unmount behavior
      const healthyStateNode = new StateNode({
        state: {
          id: 'healthy',
          content: '',
          children: []
        }
      });

      // Add the transition to the atomic state (this should now work with our fix)
      healthyStateNode.children.push(transition);

      // Spy on the unmount method to verify it's called and mock its return value
      const unmountSpy = jest.spyOn(healthyStateNode, 'unmount').mockReturnValue({ exitData: 'test' });

      // Set up active state chain with real StateNode instances
      const activeStateChain: ActiveStateEntry[] = [
        ['playing', new StateNode({ state: { id: 'playing', content: '', children: [] } })],
        ['playing.healthSystem', new StateNode({ state: { id: 'healthSystem', content: '', children: [] } })],
        ['playing.healthSystem.healthy', healthyStateNode]
      ];
      (stateChart as unknown as { activeStateChain: ActiveStateEntry[] }).activeStateChain = activeStateChain;

      const initialState = { currentData: 'initial' };



      // Act
      const result = (stateChart as any).exitStates([transition], initialState);

      // Assert
      expect(unmountSpy).toHaveBeenCalledWith(initialState);
      expect(result).toEqual({ currentData: 'initial', exitData: 'test' });

      // Verify state was removed from active chain
      const updatedActiveChain = (stateChart as unknown as { activeStateChain: ActiveStateEntry[] }).activeStateChain;
      expect(updatedActiveChain.find(([path]) => path === 'playing.healthSystem.healthy')).toBeUndefined();
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