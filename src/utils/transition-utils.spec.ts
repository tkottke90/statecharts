import {
  findLCCA,
  computeExitSet,
  buildEntryPath,
  type ActiveStateEntry,
} from './transition-utils';

describe('Transition Utils', () => {
  describe('findLCCA', () => {
    it('should find LCCA for states within same parent', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.critical';
      const expectedLCCA = 'playing.healthSystem';

      // Act
      const result = findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should find LCCA for states across different subsystems', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.scoreSystem.scoring';
      const expectedLCCA = 'playing';

      // Act
      const result = findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should find LCCA for transition to top level', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'gameOver';
      const expectedLCCA = '';

      // Act
      const result = findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle root level transitions', () => {
      // Arrange
      const sourcePath = 'gameStart';
      const targetPath = 'gameOver';
      const expectedLCCA = '';

      // Act
      const result = findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });

    it('should handle identical source and target paths', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.healthy';
      const expectedLCCA = 'playing.healthSystem.healthy';

      // Act
      const result = findLCCA(sourcePath, targetPath);

      // Assert
      expect(result).toBe(expectedLCCA);
    });
  });

  describe('computeExitSet', () => {
    it('should compute exit set for same-parent transition', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.critical';
      const activeStateChain: ActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
        ['playing.scoreSystem', {}],
        ['playing.scoreSystem.scoring', {}],
      ];

      // Act
      const result = computeExitSet(sourcePath, targetPath, activeStateChain);

      // Assert
      expect(result).toEqual(['playing.healthSystem.healthy']);
    });

    it('should compute exit set for cross-subsystem transition', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.scoreSystem.addingPoints';
      const activeStateChain: ActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
        ['playing.scoreSystem', {}],
        ['playing.scoreSystem.scoring', {}],
      ];

      // Act
      const result = computeExitSet(sourcePath, targetPath, activeStateChain);

      // Assert
      expect(result).toEqual([
        'playing.healthSystem.healthy',
        'playing.scoreSystem.scoring',
        'playing.healthSystem',
      ]);
    });

    it('should return empty array when no states need to exit', () => {
      // Arrange
      const sourcePath = 'playing.healthSystem.healthy';
      const targetPath = 'playing.healthSystem.healthy'; // Same state
      const activeStateChain: ActiveStateEntry[] = [
        ['playing', {}],
        ['playing.healthSystem', {}],
        ['playing.healthSystem.healthy', {}],
      ];

      // Act
      const result = computeExitSet(sourcePath, targetPath, activeStateChain);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('buildEntryPath', () => {
    it('should build entry path from LCCA to target', () => {
      // Arrange
      const lccaPath = 'playing';
      const targetPath = 'playing.healthSystem.healthy';

      // Act
      const result = buildEntryPath(lccaPath, targetPath);

      // Assert
      expect(result).toEqual([
        'playing',
        'playing.healthSystem',
        'playing.healthSystem.healthy',
      ]);
    });

    it('should build entry path from root LCCA', () => {
      // Arrange
      const lccaPath = '';
      const targetPath = 'playing.healthSystem.healthy';

      // Act
      const result = buildEntryPath(lccaPath, targetPath);

      // Assert
      expect(result).toEqual([
        'playing',
        'playing.healthSystem',
        'playing.healthSystem.healthy',
      ]);
    });

    it('should handle single-level target', () => {
      // Arrange
      const lccaPath = '';
      const targetPath = 'gameOver';

      // Act
      const result = buildEntryPath(lccaPath, targetPath);

      // Assert
      expect(result).toEqual(['gameOver']);
    });

    it('should handle same LCCA and target', () => {
      // Arrange
      const lccaPath = 'playing.healthSystem';
      const targetPath = 'playing.healthSystem';

      // Act
      const result = buildEntryPath(lccaPath, targetPath);

      // Assert
      expect(result).toEqual(['playing.healthSystem']);
    });
  });
});
