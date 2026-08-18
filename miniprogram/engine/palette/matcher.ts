import { prepareColor, preparedColorDistance } from '../color';
import type { ColorDistanceStrategy, RGBColor } from '../color';
import { normalizePixelMatrix } from '../image';
import type { Pixel, PixelMatrix } from '../image';
import { getPreparedPalette } from './registry';
import type { PreparedBeadColor, PreparedBeadPalette } from './types';

export interface PaletteMatchOptions {
  paletteId: string;
  strategy?: ColorDistanceStrategy;
  /** Background used when source pixels contain transparency. */
  background?: RGBColor;
}

export interface MatchedBeadCell {
  colorCode: string;
  /** Distance under the selected strategy; useful for diagnostics/benchmarking. */
  distance: number;
}

export interface PaletteMatchResult {
  width: number;
  height: number;
  paletteId: string;
  strategy: ColorDistanceStrategy;
  grid: MatchedBeadCell[][];
  paletteUsage: Record<string, number>;
  totalBeads: number;
  uniqueColors: number;
  meanMatchDistance: number;
}

function compositeOnBackground(pixel: Pixel, background: RGBColor): RGBColor {
  const alpha = (pixel.a ?? 255) / 255;
  const inverseAlpha = 1 - alpha;

  return {
    r: pixel.r * alpha + background.r * inverseAlpha,
    g: pixel.g * alpha + background.g * inverseAlpha,
    b: pixel.b * alpha + background.b * inverseAlpha,
  };
}

export function findNearestBeadColor(
  rgb: RGBColor,
  palette: PreparedBeadPalette,
  strategy: ColorDistanceStrategy
): { color: PreparedBeadColor; distance: number } {
  const target = prepareColor(rgb);
  let bestColor = palette.colors[0];
  let bestDistance = preparedColorDistance(target, bestColor.prepared, strategy);

  for (let index = 1; index < palette.colors.length; index++) {
    const candidate = palette.colors[index];
    const distance = preparedColorDistance(target, candidate.prepared, strategy);
    if (distance < bestDistance) {
      bestColor = candidate;
      bestDistance = distance;
    }
  }

  return { color: bestColor, distance: bestDistance };
}

/**
 * Maps every pixel to one physical bead color from the selected brand palette.
 * Transparency is composited onto a configurable background (white by default),
 * keeping the baseline grid rectangular and directly craftable.
 */
export function matchPixelMatrixToPalette(
  source: PixelMatrix,
  options: PaletteMatchOptions
): PaletteMatchResult {
  const matrix = normalizePixelMatrix(source);
  const palette = getPreparedPalette(options.paletteId);
  const strategy: ColorDistanceStrategy = options.strategy ?? 'oklab';
  const background = options.background ?? { r: 255, g: 255, b: 255 };

  const paletteUsage: Record<string, number> = {};
  const grid: MatchedBeadCell[][] = [];
  let totalDistance = 0;

  for (let y = 0; y < matrix.height; y++) {
    const row: MatchedBeadCell[] = [];
    for (let x = 0; x < matrix.width; x++) {
      const rgb = compositeOnBackground(matrix.pixels[y][x], background);
      const match = findNearestBeadColor(rgb, palette, strategy);

      row.push({ colorCode: match.color.code, distance: match.distance });
      paletteUsage[match.color.code] = (paletteUsage[match.color.code] ?? 0) + 1;
      totalDistance += match.distance;
    }
    grid.push(row);
  }

  const totalBeads = matrix.width * matrix.height;
  return {
    width: matrix.width,
    height: matrix.height,
    paletteId: palette.id,
    strategy,
    grid,
    paletteUsage,
    totalBeads,
    uniqueColors: Object.keys(paletteUsage).length,
    meanMatchDistance: totalBeads === 0 ? 0 : totalDistance / totalBeads,
  };
}
