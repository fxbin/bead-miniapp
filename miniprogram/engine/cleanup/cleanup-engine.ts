import type { BeadCell } from '../types';
import type { CleanupOptions, CleanupResult, CleanupDiagnostics, ConnectedRegion } from './types';

/**
 * Resolve cleanup parameters from a cleanupLevel preset or explicit options.
 */
function resolveParams(options: CleanupOptions): {
  enabled: boolean;
  maxTinyRegionSize: number;
  connectivity: 4 | 8;
  iterations: number;
} {
  const level = options.cleanupLevel ?? 2;

  // cleanupLevel 0 = off
  if (level === 0 || options.enabled === false) {
    return { enabled: false, maxTinyRegionSize: 0, connectivity: 8, iterations: 0 };
  }

  const presets: Record<number, { maxTinyRegionSize: number; iterations: number }> = {
    1: { maxTinyRegionSize: 1, iterations: 1 },
    2: { maxTinyRegionSize: 2, iterations: 2 },
    3: { maxTinyRegionSize: 4, iterations: 3 },
  };

  const preset = presets[level] ?? presets[2];

  return {
    enabled: true,
    maxTinyRegionSize: options.maxTinyRegionSize ?? preset.maxTinyRegionSize,
    connectivity: options.connectivity ?? 8,
    iterations: options.cleanupLevel !== undefined ? preset.iterations : 1,
  };
}

/**
 * Get the neighbor offsets for the specified connectivity.
 */
function neighborOffsets(connectivity: 4 | 8): Array<{ dx: number; dy: number }> {
  if (connectivity === 4) {
    return [
      { dx: 0, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
    ];
  }
  return [
    { dx: -1, dy: -1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
  ];
}

/**
 * Find all connected regions in the grid using flood fill.
 * Two cells are connected if they share a neighbor relationship
 * (4 or 8 connectivity) and have the same colorCode.
 */
function findConnectedRegions(
  grid: BeadCell[][],
  connectivity: 4 | 8
): ConnectedRegion[] {
  const height = grid.length;
  if (height === 0) return [];
  const width = grid[0].length;
  if (width === 0) return [];

  const visited: boolean[][] = Array.from({ length: height }, () =>
    new Array(width).fill(false)
  );
  const offsets = neighborOffsets(connectivity);
  const regions: ConnectedRegion[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (visited[y][x]) continue;

      const colorCode = grid[y][x].colorCode;
      const cells: Array<{ x: number; y: number }> = [{ x, y }];
      visited[y][x] = true;

      // BFS flood fill
      let head = 0;
      while (head < cells.length) {
        const current = cells[head];
        head++;

        for (const offset of offsets) {
          const nx = current.x + offset.dx;
          const ny = current.y + offset.dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (visited[ny][nx]) continue;
          if (grid[ny][nx].colorCode !== colorCode) continue;

          visited[ny][nx] = true;
          cells.push({ x: nx, y: ny });
        }
      }

      regions.push({ colorCode, cells, size: cells.length });
    }
  }

  return regions;
}

/**
 * Count isolated pixels (single-cell regions).
 */
function countIsolatedPixels(regions: ConnectedRegion[]): number {
  return regions.filter((r) => r.size === 1).length;
}

/**
 * Count tiny regions (size <= maxTinyRegionSize).
 */
function countTinyRegions(regions: ConnectedRegion[], maxTinyRegionSize: number): number {
  return regions.filter((r) => r.size <= maxTinyRegionSize).length;
}

/**
 * Find the majority neighbor color for a set of cells.
 * Returns the most common colorCode among all neighbors of the region
 * that are NOT the region's own color.
 */
function findMajorityNeighborColor(
  grid: BeadCell[][],
  region: ConnectedRegion,
  connectivity: 4 | 8
): string | null {
  const height = grid.length;
  const width = grid[0].length;
  const offsets = neighborOffsets(connectivity);
  const colorCounts: Record<string, number> = {};

  for (const cell of region.cells) {
    for (const offset of offsets) {
      const nx = cell.x + offset.dx;
      const ny = cell.y + offset.dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const neighborColor = grid[ny][nx].colorCode;
      if (neighborColor === region.colorCode) continue;
      colorCounts[neighborColor] = (colorCounts[neighborColor] ?? 0) + 1;
    }
  }

  let majorityColor: string | null = null;
  let maxCount = 0;
  for (const [color, count] of Object.entries(colorCounts)) {
    if (count > maxCount) {
      maxCount = count;
      majorityColor = color;
    }
  }

  return majorityColor;
}

/**
 * Perform one cleanup iteration: find tiny regions and replace them
 * with the majority neighbor color.
 */
function cleanupIteration(
  grid: BeadCell[][],
  maxTinyRegionSize: number,
  connectivity: 4 | 8,
  protectionMask?: boolean[][],
  protectionWeight?: number
): { grid: BeadCell[][]; replaced: number } {
  const regions = findConnectedRegions(grid, connectivity);
  const pWeight = protectionWeight ?? 3;

  const tinyRegions = regions.filter((r) => {
    // Count protected cells in this region.
    let protectedCount = 0;
    if (protectionMask) {
      for (const cell of r.cells) {
        if (protectionMask[cell.y]?.[cell.x]) protectedCount++;
      }
    }
    // Effective size = actual size + protected bonus.
    const effectiveSize = r.size + protectedCount * pWeight;
    return effectiveSize <= maxTinyRegionSize;
  });

  if (tinyRegions.length === 0) {
    return { grid, replaced: 0 };
  }

  // Create a mutable copy of the grid.
  const newGrid: BeadCell[][] = grid.map((row) => row.map((cell) => ({ ...cell })));
  let replaced = 0;

  for (const region of tinyRegions) {
    const replacementColor = findMajorityNeighborColor(grid, region, connectivity);
    if (replacementColor === null) continue;

    for (const cell of region.cells) {
      newGrid[cell.y][cell.x] = { colorCode: replacementColor };
      replaced++;
    }
  }

  return { grid: newGrid, replaced };
}

/**
 * Run the small-region / isolated-pixel cleanup pass.
 *
 * This function identifies tiny connected regions (isolated pixels and
 * small fragments) and replaces them with the majority neighbor color.
 * The process is repeated for a configurable number of iterations to
 * handle cascading cleanups (e.g., a pixel that becomes isolated after
 * its neighbor is replaced).
 *
 * Results are deterministic: the same input + parameters always produce
 * the same output.
 */
export function cleanupSmallRegions(
  grid: BeadCell[][],
  options: CleanupOptions
): CleanupResult {
  const params = resolveParams(options);

  if (!params.enabled || grid.length === 0) {
    const regions = grid.length > 0 ? findConnectedRegions(grid, params.connectivity) : [];
    const diagnostics: CleanupDiagnostics = {
      isolatedPixelCountBefore: countIsolatedPixels(regions),
      isolatedPixelCountAfter: countIsolatedPixels(regions),
      tinyRegionCountBefore: countTinyRegions(regions, params.maxTinyRegionSize),
      tinyRegionCountAfter: countTinyRegions(regions, params.maxTinyRegionSize),
      cellsReplaced: 0,
      iterations: 0,
    };
    return { grid, diagnostics };
  }

  // Baseline diagnostics
  const initialRegions = findConnectedRegions(grid, params.connectivity);
  const isolatedBefore = countIsolatedPixels(initialRegions);
  const tinyBefore = countTinyRegions(initialRegions, params.maxTinyRegionSize);

  let currentGrid = grid;
  let totalReplaced = 0;
  let iterationsPerformed = 0;

  for (let i = 0; i < params.iterations; i++) {
    const result = cleanupIteration(
      currentGrid,
      params.maxTinyRegionSize,
      params.connectivity,
      options.protectionMask,
      options.protectionWeight
    );

    if (result.replaced === 0) break;
    currentGrid = result.grid;
    totalReplaced += result.replaced;
    iterationsPerformed++;
  }

  // Final diagnostics
  const finalRegions = findConnectedRegions(currentGrid, params.connectivity);
  const isolatedAfter = countIsolatedPixels(finalRegions);
  const tinyAfter = countTinyRegions(finalRegions, params.maxTinyRegionSize);

  const diagnostics: CleanupDiagnostics = {
    isolatedPixelCountBefore: isolatedBefore,
    isolatedPixelCountAfter: isolatedAfter,
    tinyRegionCountBefore: tinyBefore,
    tinyRegionCountAfter: tinyAfter,
    cellsReplaced: totalReplaced,
    iterations: iterationsPerformed,
  };

  return { grid: currentGrid, diagnostics };
}
