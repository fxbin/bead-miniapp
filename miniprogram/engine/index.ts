import { resizePixelMatrix } from './image';
import type { PixelMatrix, SamplingStrategy } from './image';
import { matchPixelMatrixToPalette } from './palette';
import { getPreparedPalette } from './palette/registry';
import type { PreparedBeadColor } from './palette/types';
import type { ColorDistanceStrategy } from './color';
import { mergePaletteColors } from './merge';
import type { MergeDiagnostics } from './merge';
import { cleanupSmallRegions } from './cleanup';
import type { CleanupDiagnostics } from './cleanup';
import { computeEdgeProtectionMask } from './edge';
import type { EdgeProtectionDiagnostics, ColorLookup } from './edge';
import type { GeneratePatternOptions, PatternResult, BeadCell } from './types';

function assertBoardSize(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

/**
 * Bead Engine v0.1 baseline:
 * PixelMatrix -> target grid sampling -> physical brand palette matching.
 *
 * M1 optimization: similar-color merge, maxColors constraint, edge protection,
 * and small-region cleanup are now applied after palette matching.
 */
export function generatePattern(
  imageData: PixelMatrix,
  options: GeneratePatternOptions
): PatternResult {
  assertBoardSize(options.width, 'GeneratePatternOptions.width');
  assertBoardSize(options.height, 'GeneratePatternOptions.height');

  const samplingStrategy: SamplingStrategy = options.samplingStrategy ?? 'nearest';
  const matcherStrategy: ColorDistanceStrategy = options.matcherStrategy ?? 'oklab';

  const resized = resizePixelMatrix(imageData, {
    width: options.width,
    height: options.height,
    strategy: samplingStrategy,
  });

  const matched = matchPixelMatrixToPalette(resized, {
    paletteId: options.paletteId,
    strategy: matcherStrategy,
    background: options.background,
  });

  // Build the initial grid and usage map from the matcher output.
  let grid: BeadCell[][] = matched.grid.map((row) => row.map((cell) => ({ colorCode: cell.colorCode })));
  let paletteUsage: Record<string, number> = { ...matched.paletteUsage };
  let uniqueColors = matched.uniqueColors;

  // --- M1: similar-color merge + maxColors ---
  let mergeDiagnostics: MergeDiagnostics | null = null;

  const mergeEnabled = options.mergeSimilarColors === true || options.maxColors !== undefined;
  if (mergeEnabled) {
    // Collect the colors that are actually in use.
    const usedCodes = Object.keys(paletteUsage);
    const usageMap = new Map<string, number>(
      usedCodes.map((code) => [code, paletteUsage[code]])
    );

    // Get the prepared palette colors that are in use.
    const preparedPalette = getPreparedPalette(options.paletteId);
    const usedColors: PreparedBeadColor[] = preparedPalette.colors.filter(
      (c) => usageMap.has(c.code)
    );

    const mergeResult = mergePaletteColors(usedColors, usageMap, matcherStrategy, {
      enabled: options.mergeSimilarColors === true,
      mergeThreshold: options.mergeThreshold,
      maxColors: options.maxColors,
    });

    mergeDiagnostics = mergeResult.diagnostics;

    // Apply the remap to the grid.
    if (Object.keys(mergeDiagnostics.remap).length > 0) {
      const remap = mergeDiagnostics.remap;
      grid = grid.map((row) =>
        row.map((cell) => ({
          colorCode: remap[cell.colorCode] ?? cell.colorCode,
        }))
      );

      // Recompute paletteUsage.
      const newUsage: Record<string, number> = {};
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          const code = grid[y][x].colorCode;
          newUsage[code] = (newUsage[code] ?? 0) + 1;
        }
      }
      paletteUsage = newUsage;
      uniqueColors = Object.keys(paletteUsage).length;
    }
  }

  // --- M1: edge / structure protection ---
  let edgeDiagnostics: EdgeProtectionDiagnostics | null = null;
  let protectionMask: boolean[][] | undefined;

  if (options.protectEdges === true) {
    // Build color lookup from the prepared palette.
    const preparedPalette = getPreparedPalette(options.paletteId);
    const colorLookup: ColorLookup = new Map(
      preparedPalette.colors.map((c) => [c.code, c.prepared])
    );

    const edgeResult = computeEdgeProtectionMask(grid, colorLookup, matcherStrategy, {
      enabled: true,
    });
    edgeDiagnostics = edgeResult.diagnostics;
    protectionMask = edgeResult.mask;
  }

  // --- M1: small-region / isolated-pixel cleanup ---
  let cleanupDiagnostics: CleanupDiagnostics | null = null;

  const cleanupEnabled = options.cleanupLevel !== undefined && options.cleanupLevel > 0;
  if (cleanupEnabled) {
    const cleanupResult = cleanupSmallRegions(grid, {
      cleanupLevel: options.cleanupLevel as 0 | 1 | 2 | 3,
      protectionMask,
    });

    cleanupDiagnostics = cleanupResult.diagnostics;

    if (cleanupDiagnostics.cellsReplaced > 0) {
      grid = cleanupResult.grid;

      // Recompute paletteUsage.
      const newUsage: Record<string, number> = {};
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          const code = grid[y][x].colorCode;
          newUsage[code] = (newUsage[code] ?? 0) + 1;
        }
      }
      paletteUsage = newUsage;
      uniqueColors = Object.keys(paletteUsage).length;
    }
  }

  return {
    width: matched.width,
    height: matched.height,
    paletteId: matched.paletteId,
    grid,
    paletteUsage,
    totalBeads: matched.totalBeads,
    uniqueColors,
    diagnostics: {
      matcherStrategy,
      samplingStrategy,
      meanMatchDistance: matched.meanMatchDistance,
      merge: mergeDiagnostics,
      cleanup: cleanupDiagnostics,
      edgeProtection: edgeDiagnostics,
    },
  };
}

export * from './types';
export * from './image';
export * from './color';
export * from './palette';
export * from './merge';
export * from './cleanup';
export * from './edge';
