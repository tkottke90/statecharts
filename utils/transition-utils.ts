/**
 * Utility functions for SCXML state transition calculations.
 * 
 * These functions implement core SCXML algorithms for computing state transitions,
 * including LCCA (Least Common Compound Ancestor) calculation and exit set computation.
 * They are designed to be pure functions that can be easily tested and reused.
 */

/**
 * Finds the Least Common Compound Ancestor (LCCA) of two state paths.
 * 
 * The LCCA is the deepest compound state that contains both the source and target
 * states. This is used to determine the scope of a transition - only states within
 * the LCCA need to be considered for exit/entry operations.
 * 
 * @param sourcePath - The path of the source state (e.g., "playing.healthSystem.healthy")
 * @param targetPath - The path of the target state (e.g., "playing.scoreSystem.scoring")
 * @returns The path of the LCCA, or empty string if LCCA is the root
 * 
 * @example
 * ```typescript
 * // Same parent
 * findLCCA("playing.healthSystem.healthy", "playing.healthSystem.critical")
 * // Returns: "playing.healthSystem"
 * 
 * // Cross-subsystem
 * findLCCA("playing.healthSystem.healthy", "playing.scoreSystem.scoring") 
 * // Returns: "playing"
 * 
 * // Root level
 * findLCCA("gameStart", "gameOver")
 * // Returns: "" (empty string - root is LCCA)
 * ```
 * 
 * @remarks
 * - Uses path-based string operations for O(min depth) performance
 * - Returns empty string when LCCA is the root (both states are top-level)
 * - Handles paths of different depths correctly
 * - Pure function with no side effects
 */
export function findLCCA(sourcePath: string, targetPath: string): string {
  // Handle root level transitions
  if (!sourcePath.includes('.') && !targetPath.includes('.')) {
    return ""; // Both are top-level, LCCA is root
  }

  const sourceParts = sourcePath.split('.');
  const targetParts = targetPath.split('.');

  // Find common prefix
  let commonDepth = 0;
  const minLength = Math.min(sourceParts.length, targetParts.length);

  for (let i = 0; i < minLength; i++) {
    if (sourceParts[i] === targetParts[i]) {
      commonDepth = i + 1;
    } else {
      break;
    }
  }

  // Return the LCCA path
  return sourceParts.slice(0, commonDepth).join('.');
}

/**
 * Type representing an active state chain entry: [path, node]
 */
export type ActiveStateEntry = [string, unknown];

/**
 * Computes the set of states that need to be exited during a transition.
 * 
 * According to SCXML specification, states are exited in document order (deepest first)
 * and only states within the scope of the Least Common Compound Ancestor (LCCA) are
 * considered for exit. States that are ancestors of the target are preserved.
 * 
 * @param sourcePath - The path of the source state (e.g., "playing.healthSystem.healthy")
 * @param targetPath - The path of the target state (e.g., "playing.scoreSystem.scoring")
 * @param activeStateChain - Array of currently active state entries [path, node]
 * @returns Array of state paths to exit, sorted deepest-first for proper exit order
 * 
 * @example
 * ```typescript
 * const activeStates: ActiveStateEntry[] = [
 *   ['playing', {}],
 *   ['playing.healthSystem', {}],
 *   ['playing.healthSystem.healthy', {}]
 * ];
 * 
 * // Same-parent transition: healthy → critical
 * computeExitSet("playing.healthSystem.healthy", "playing.healthSystem.critical", activeStates)
 * // Returns: ["playing.healthSystem.healthy"]
 * 
 * // Cross-subsystem transition: health → score
 * computeExitSet("playing.healthSystem.healthy", "playing.scoreSystem.scoring", activeStates) 
 * // Returns: ["playing.healthSystem.healthy", "playing.healthSystem"]
 * ```
 * 
 * @remarks
 * - Uses `findLCCA()` to determine transition scope
 * - Preserves parallel state regions that don't conflict with the transition
 * - Excludes the LCCA itself from the exit set
 * - Returns empty array for self-transitions or when no exits are needed
 * - Maintains SCXML-compliant exit ordering (deepest states first)
 * - Pure function that doesn't modify the input activeStateChain
 */
export function computeExitSet(
  sourcePath: string, 
  targetPath: string, 
  activeStateChain: ActiveStateEntry[]
): string[] {
  const lccaPath = findLCCA(sourcePath, targetPath);
  const exitSet: string[] = [];

  // Find all active states that are descendants of LCCA but not ancestors of target
  for (const [activePath] of activeStateChain) {
    if (activePath.startsWith(lccaPath) && 
        activePath !== lccaPath && 
        !targetPath.startsWith(activePath)) {
      exitSet.push(activePath);
    }
  }

  // Sort deepest first (for proper exit order)
  return exitSet.sort((a, b) => b.split('.').length - a.split('.').length);
}

/**
 * Builds the entry path from LCCA to target, excluding already active states.
 * 
 * This is a helper function for computeEntrySet that builds the incremental path
 * from the LCCA to the target state. It's separated out for potential reuse
 * and easier testing.
 * 
 * @param lccaPath - The path of the LCCA
 * @param targetPath - The path of the target state
 * @returns Array of state paths that need to be entered, in entry order (shallowest first)
 * 
 * @example
 * ```typescript
 * buildEntryPath("playing", "playing.healthSystem.healthy")
 * // Returns: ["playing", "playing.healthSystem", "playing.healthSystem.healthy"]
 * 
 * buildEntryPath("", "playing.healthSystem.healthy")  // Root LCCA
 * // Returns: ["playing", "playing.healthSystem", "playing.healthSystem.healthy"]
 * ```
 */
export function buildEntryPath(lccaPath: string, targetPath: string): string[] {
  const entrySet: string[] = [];
  const targetParts = targetPath.split('.');
  const lccaParts = lccaPath ? lccaPath.split('.') : [];

  for (let i = lccaParts.length; i <= targetParts.length; i++) {
    const pathToEnter = targetParts.slice(0, i).join('.');
    if (pathToEnter) {
      entrySet.push(pathToEnter);
    }
  }

  return entrySet; // Already in entry order (shallowest first)
}
