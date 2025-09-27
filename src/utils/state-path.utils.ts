/**
 * Utility function which creates a dot delimited path string
 * from any number of string segments.  This primarily helps
 * with the construction of paths for States in the StateChart
 * @param parts Steps in the path
 * @returns The path string
 */
export function createStatePath(...parts: string[]): string {
  return parts
    .filter(Boolean) // Filter out empty strings
    .join('.'); // Join on periods
}
