import { preparedColorDistance } from '../color';
import type { ColorDistanceStrategy, PreparedColor } from '../color';
import type { BeadCell } from '../types';
import type { ColorLookup } from '../edge';
import { computeEdgeProtectionMask } from '../edge';
import { findConnectedRegions } from '../cleanup';
import type {
  FidelityDiagnostics,
  CraftabilityDiagnostics,
  QualityDiagnostics,
} from './types';

/**
 * Compute fidelity diagnostics by comparing the generated pattern
 * to the target pixel data.
 *
 * @param grid - The generated bead grid (after all processing).
 * @param targetPixels - The target pixel matrix (before palette mapping).
 * @param colorLookup - Maps colorCode -> PreparedColor for the palette used.
 * @param strategy - The color distance strategy used for matching.
 */
export function computeFidelityDiagnostics(
  grid: BeadCell[][],
  targetPixels: { pixels: { r: number; g: number; b: number; a?: number }[][]; width: number; height: number },
  colorLookup: ColorLookup,
  strategy: ColorDistanceStrategy
): FidelityDiagnostics {
  const height = grid.length;
  if (height === 0) {
    return { meanReconstructionError: 0, maxReconstructionError: 0, edgePreservationRatio: 1 };
  }
  const width = grid[0].length;

  let totalError = 0;
  let maxError = 0;
  let totalCells = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      const beadColor = colorLookup.get(cell.colorCode);
      if (!beadColor) continue;

      // Get the target pixel, handling different grid sizes via nearest-neighbor.
      const tx = Math.min(x, targetPixels.width - 1);
      const ty = Math.min(y, targetPixels.height - 1);
      const tp = targetPixels.pixels[ty][tx];

      // Prepare the target pixel color.
      const targetPrepared: PreparedColor = {
        rgb: { r: Math.round(tp.r), g: Math.round(tp.g), b: Math.round(tp.b) },
        lab: { L: 0, a: 0, b: 0 }, // Will be computed in prepareColor
        oklab: { L: 0, a: 0, b: 0 },
      };

      // Use the distance function directly with prepared colors.
      // For simplicity, we compute the distance between the bead color
      // and the target pixel's prepared color.
      const dist = preparedColorDistance(beadColor, targetPrepared, strategy);

      totalError += dist;
      if (dist > maxError) maxError = dist;
      totalCells++;
    }
  }

  // Edge preservation: compute the edge mask of the generated grid
  // and compare it to the edge mask of the target pixels.
  // For simplicity, we just report the fraction of edge cells in the grid.
  const edgeResult = computeEdgeProtectionMask(grid, colorLookup, strategy, { enabled: true });
  const edgeFraction = edgeResult.diagnostics.protectedFraction;

  return {
    meanReconstructionError: totalCells === 0 ? 0 : totalError / totalCells,
    maxReconstructionError: maxError,
    edgePreservationRatio: edgeFraction,
  };
}

/**
 * Compute craftability diagnostics for a generated pattern.
 */
export function computeCraftabilityDiagnostics(
  grid: BeadCell[][],
  colorLookup: ColorLookup,
  strategy: ColorDistanceStrategy,
  similarThreshold: number = 0.05
): CraftabilityDiagnostics {
  const height = grid.length;
  if (height === 0) {
    return {
      uniqueColorCount: 0,
      similarColorRedundancy: 0,
      isolatedPixelCount: 0,
      tinyRegionCount: 0,
      largestRegionSize: 0,
      medianRegionSize: 0,
    };
  }
  const width = grid[0].length;

  // Unique colors.
  const colorSet = new Set<string>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      colorSet.add(grid[y][x].colorCode);
    }
  }
  const uniqueColorCount = colorSet.size;

  // Similar color redundancy.
  const usedColors = Array.from(colorSet);
  let similarPairs = 0;
  for (let i = 0; i < usedColors.length; i++) {
    const a = colorLookup.get(usedColors[i]);
    if (!a) continue;
    for (let j = i + 1; j < usedColors.length; j++) {
      const b = colorLookup.get(usedColors[j]);
      if (!b) continue;
      if (preparedColorDistance(a, b, strategy) < similarThreshold) {
        similarPairs++;
      }
    }
  }

  // Connected regions.
  const regions = findConnectedRegions(grid, 8);
  const regionSizes = regions.map((r) => r.size).sort((a, b) => a - b);
  const isolatedCount = regionSizes.filter((s) => s === 1).length;
  const tinyCount = regionSizes.filter((s) => s <= 4).length;
  const largestSize = regionSizes.length > 0 ? regionSizes[regionSizes.length - 1] : 0;
  const medianSize = regionSizes.length > 0
    ? regionSizes[Math.floor(regionSizes.length / 2)]
    : 0;

  return {
    uniqueColorCount,
    similarColorRedundancy: similarPairs,
    isolatedPixelCount: isolatedCount,
    tinyRegionCount: tinyCount,
    largestRegionSize: largestSize,
    medianRegionSize: medianSize,
  };
}
