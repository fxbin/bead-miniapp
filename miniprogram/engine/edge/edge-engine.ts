import type { BeadCell } from '../types';
import type { PreparedColor } from '../color';
import { preparedColorDistance } from '../color';
import type { EdgeProtectionOptions, EdgeProtectionDiagnostics, EdgeProtectionResult } from './types';

/**
 * Compute the perceptual distance between two bead cells using their
 * prepared color values.  Returns 0 if either cell has no prepared color
 * (e.g., the colorCode is not in the palette).
 */
function cellDistance(
  left: PreparedColor,
  right: PreparedColor,
  strategy: 'rgb' | 'lab76' | 'ciede2000' | 'oklab'
): number {
  return preparedColorDistance(left, right, strategy);
}

/**
 * Build a lookup from colorCode -> PreparedColor for the cells in the grid.
 * Uses a provided colorMap if available; otherwise returns an empty map
 * and edge protection will use a simpler code-difference approach.
 */
function buildColorLookup(
  grid: BeadCell[][],
  colorMap?: Map<string, PreparedColor>
): Map<string, PreparedColor> {
  if (colorMap) return colorMap;
  return new Map();
}

/**
 * Compute the edge protection mask for a bead grid.
 *
 * A cell is "protected" if it sits on a high-contrast boundary — i.e.,
 * at least one of its neighbors has a perceptual distance >= edgeThreshold.
 * Additionally, a local-contrast score is computed within a windowRadius
 * neighborhood: if the variance of colors in that window is high, the
 * cell is also considered protected.
 *
 * The mask can be consumed by the cleanup pass to skip or down-weight
 * replacement of protected cells.
 */
export function computeEdgeProtectionMask(
  grid: BeadCell[][],
  colorMap: Map<string, PreparedColor>,
  strategy: 'rgb' | 'lab76' | 'ciede2000' | 'oklab',
  options: EdgeProtectionOptions
): EdgeProtectionResult {
  const enabled = options.enabled ?? true;
  const edgeThreshold = options.edgeThreshold ?? 0.15;
  const windowRadius = options.windowRadius ?? 1;

  const height = grid.length;
  if (height === 0) {
    return { mask: [], diagnostics: { protectedCellCount: 0, totalCells: 0, protectedFraction: 0 } };
  }
  const width = grid[0].length;
  if (width === 0) {
    return { mask: [], diagnostics: { protectedCellCount: 0, totalCells: 0, protectedFraction: 0 } };
  }

  const mask: boolean[][] = Array.from({ length: height }, () =>
    new Array(width).fill(false)
  );

  if (!enabled) {
    const totalCells = height * width;
    return {
      mask,
      diagnostics: { protectedCellCount: 0, totalCells, protectedFraction: 0 },
    };
  }

  let protectedCount = 0;

  // Neighbor offsets for 8-connectivity.
  const offsets = [
    { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 0 },                    { dx: 1, dy: 0 },
    { dx: -1, dy: 1 },  { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cellColor = colorMap.get(grid[y][x].colorCode);
      if (!cellColor) {
        mask[y][x] = false;
        continue;
      }

      let isEdge = false;

      // Check immediate neighbors for high contrast.
      for (const offset of offsets) {
        const nx = x + offset.dx;
        const ny = y + offset.dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const neighborColor = colorMap.get(grid[ny][nx].colorCode);
        if (!neighborColor) continue;
        const dist = cellDistance(cellColor, neighborColor, strategy);
        if (dist >= edgeThreshold) {
          isEdge = true;
          break;
        }
      }

      // If not an edge by immediate neighbors, check local contrast
      // in a wider window.
      if (!isEdge && windowRadius > 1) {
        const colors: PreparedColor[] = [];
        for (let dy = -windowRadius; dy <= windowRadius; dy++) {
          for (let dx = -windowRadius; dx <= windowRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const wc = colorMap.get(grid[ny][nx].colorCode);
            if (wc) colors.push(wc);
          }
        }
        if (colors.length >= 2) {
          // Simple contrast: max pairwise distance in the window.
          let maxDist = 0;
          for (let i = 0; i < colors.length; i++) {
            for (let j = i + 1; j < colors.length; j++) {
              const d = cellDistance(colors[i], colors[j], strategy);
              if (d > maxDist) maxDist = d;
            }
          }
          if (maxDist >= edgeThreshold) {
            isEdge = true;
          }
        }
      }

      mask[y][x] = isEdge;
      if (isEdge) protectedCount++;
    }
  }

  const totalCells = height * width;
  return {
    mask,
    diagnostics: {
      protectedCellCount: protectedCount,
      totalCells,
      protectedFraction: totalCells === 0 ? 0 : protectedCount / totalCells,
    },
  };
}

/**
 * Effective region size after applying edge protection weight.
 *
 * Protected cells add `protectionWeight` bonus points to their region's
 * effective size, making them harder to clean up.
 */
export function effectiveRegionSize(
  actualSize: number,
  protectedCountInRegion: number,
  protectionWeight: number
): number {
  return actualSize + protectedCountInRegion * protectionWeight;
}
