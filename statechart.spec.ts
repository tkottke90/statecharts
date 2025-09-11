 

import { StateChart } from './statechart';

// Type for mock active state chain entries
type MockActiveStateEntry = [string, Record<string, unknown>];

describe('StateChart', () => {

  describe('findLCCA', () => {
    let stateChart: StateChart;

    beforeEach(() => {
      // Create a simple StateChart instance for testing the findLCCA method
      stateChart = new StateChart('gameStart', new Map());
    });

    it('should find LCCA for states within same parent', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.critical';
      const expectedLCCA = 'playing.healthSystem';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should find LCCA for states across different subsystems', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.scoreSystem.scoring';
      const expectedLCCA = 'playing';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should find LCCA for transition to top level', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'gameOver';
      const expectedLCCA = '';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle root level transitions', () => {
      // Arrange
      const sourcePath = 'gameStart';
      const targetPath = 'gameOver';
      const expectedLCCA = '';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle single-level paths', () => {
      // Arrange
      const sourcePath = 'playing';
      const targetPath = 'gameOver';
      const expectedLCCA = '';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle identical source and target paths', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.healthy';
      const expectedLCCA = 'playing.healthSystem.healthy';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle deep nested paths with different depths', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.processingDamage.subState';
      const targetPath = 'playing.healthSystem.critical';
      const expectedLCCA = 'playing.healthSystem';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle paths where one is ancestor of another', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem';
      const targetPath = 'playing.healthSystem.healthy';
      const expectedLCCA = 'playing.healthSystem';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle complex parallel system transitions', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.processingDamage';
      const targetPath = 'playing.scoreSystem.addingPoints';
      const expectedLCCA = 'playing';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle transitions within score system', () => {
      // Arrange
      const sourcePath = 'playing.scoreSystem.scoring';
      const targetPath = 'playing.scoreSystem.addingPoints';
      const expectedLCCA = 'playing.scoreSystem';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle empty string paths correctly', () => {
      // Arrange
      const sourcePath = '';
      const targetPath = 'gameStart';
      const expectedLCCA = '';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle reverse transition (target to source)', () => {
      // Arrange
      const sourcePath = 'playing.scoreSystem.scoring';
      const targetPath = 'playing.healthSystem.healthy';
      const expectedLCCA = 'playing';

      // Act
      const result = stateChart.findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });
  });

  describe('computeExitSet', () => {
    let stateChart: StateChart;

    beforeEach(() => {
      stateChart = new StateChart('gameStart', new Map());
    });

    it('should compute exit set for same-parent transition', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.critical';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
        ['playing.scoreSystem', {}],
        ['playing.scoreSystem.scoring', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeExitSet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual(['playing.healthSystem.healthy']);
    });

    it('should compute exit set for cross-subsystem transition', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.scoreSystem.addingPoints';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
        ['playing.scoreSystem', {}],
        ['playing.scoreSystem.scoring', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeExitSet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual([
        'playing.healthSystem.healthy',
        'playing.scoreSystem.scoring',
        'playing.healthSystem'
      ]);
    });

    it('should compute exit set for transition to top level', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'gameOver';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
        ['playing.scoreSystem', {}],
        ['playing.scoreSystem.scoring', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeExitSet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual([
        'playing.healthSystem.healthy',
        'playing.scoreSystem.scoring',
        'playing.healthSystem',
        'playing.scoreSystem',
        'playing'
      ]);
    });

    it('should return empty array when no states need to exit', () => {
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
      const result = stateChart.computeExitSet(sourcePath, targetPath);

      // Assert
      expect(result).toEqual([]);
    });

    it('should sort exit states in proper order (deepest first)', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'gameStart';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
        ['playing.healthSystem.processingDamage', {}],
        ['playing.scoreSystem', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeExitSet(sourcePath, targetPath);

      // Assert
      // Verify deepest states come first (depth 3, then depth 2, then depth 1)
      const depth3States = result.filter(path => path.split('.').length === 3);
      const depth2States = result.filter(path => path.split('.').length === 2);
      const depth1States = result.filter(path => path.split('.').length === 1);

      expect(depth3States.length).toBe(2); // healthy and processingDamage
      expect(depth2States.length).toBe(2); // healthSystem and scoreSystem
      expect(depth1States.length).toBe(1); // playing

      // Verify order: all depth 3 first, then depth 2, then depth 1
      expect(result.slice(0, 2).every(path => path.split('.').length === 3)).toBe(true);
      expect(result.slice(2, 4).every(path => path.split('.').length === 2)).toBe(true);
      expect(result.slice(4, 5).every(path => path.split('.').length === 1)).toBe(true);
    });

    it('should handle parallel state exits', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.critical';
      const mockActiveStateChain: MockActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
        ['playing.scoreSystem', {}],
        ['playing.scoreSystem.scoring', {}]
      ];
      (stateChart as unknown as { activeStateChain: MockActiveStateEntry[] }).activeStateChain = mockActiveStateChain;

      // Act
      const result = stateChart.computeExitSet(sourcePath, targetPath);

      // Assert
      // Should only exit the source state, not the parallel scoreSystem
      expect(result).toEqual(['playing.healthSystem.healthy']);
      expect(result).not.toContain('playing.scoreSystem.scoring');
      expect(result).not.toContain('playing.scoreSystem');
    });

    it('should exclude LCCA from exit set', () => {
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
      const result = stateChart.computeExitSet(sourcePath, targetPath);

      // Assert
      // LCCA is 'playing.healthSystem', should not be in exit set
      expect(result).not.toContain('playing.healthSystem');
      expect(result).toEqual(['playing.healthSystem.healthy']);
    });
  });

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