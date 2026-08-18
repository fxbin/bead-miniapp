import { resizePixelMatrix } from './image';
import type { PixelMatrix, SamplingStrategy } from './image';
import { matchPixelMatrixToPalette } from './palette';
import type { ColorDistanceStrategy } from './color';
import type { GeneratePatternOptions, PatternResult } from './types';

function assertBoardSize(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

/**
 * Bead Engine v0.1 baseline:
 * PixelMatrix -> target grid sampling -> physical brand palette matching.
 *
 * M1 optimization controls (maxColors/merge/cleanup/edge protection) are part
 * of the public options shape but are intentionally not applied until their
 * dedicated issues are implemented and benchmarked.
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

  return {
    width: matched.width,
    height: matched.height,
    paletteId: matched.paletteId,
    grid: matched.grid.map((row) => row.map((cell) => ({ colorCode: cell.colorCode }))),
    paletteUsage: matched.paletteUsage,
    totalBeads: matched.totalBeads,
    uniqueColors: matched.uniqueColors,
    diagnostics: {
      matcherStrategy,
      samplingStrategy,
      meanMatchDistance: matched.meanMatchDistance,
    },
  };
}

export * from './types';
export * from './image';
export * from './color';
export * from './palette';
