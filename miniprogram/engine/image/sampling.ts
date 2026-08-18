import type { Pixel, PixelMatrix, ResizeOptions, SamplingStrategy } from './types';
import { normalizePixelMatrix } from './normalize';

function assertTargetDimension(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

function nearestSourceIndex(targetIndex: number, sourceSize: number, targetSize: number): number {
  // Center-based nearest-neighbor mapping avoids a systematic top/left bias.
  const sourcePosition = ((targetIndex + 0.5) * sourceSize) / targetSize - 0.5;
  return Math.min(sourceSize - 1, Math.max(0, Math.round(sourcePosition)));
}

function resizeNearest(source: PixelMatrix, targetWidth: number, targetHeight: number): PixelMatrix {
  const pixels: Pixel[][] = [];

  for (let y = 0; y < targetHeight; y++) {
    const sourceY = nearestSourceIndex(y, source.height, targetHeight);
    const row: Pixel[] = [];

    for (let x = 0; x < targetWidth; x++) {
      const sourceX = nearestSourceIndex(x, source.width, targetWidth);
      // Defensive copy: downstream optimization must not mutate source pixels.
      row.push({ ...source.pixels[sourceY][sourceX] });
    }

    pixels.push(row);
  }

  return { width: targetWidth, height: targetHeight, pixels };
}

/**
 * Resize a normalized PixelMatrix to the bead-grid resolution.
 *
 * v0.1 intentionally ships with nearest-neighbor as the deterministic baseline.
 * Future bilinear/area strategies can be introduced behind SamplingStrategy and
 * benchmarked before becoming defaults.
 */
export function resizePixelMatrix(source: PixelMatrix, options: ResizeOptions): PixelMatrix {
  const targetWidth = options.width;
  const targetHeight = options.height;
  const strategy: SamplingStrategy = options.strategy ?? 'nearest';

  assertTargetDimension(targetWidth, 'ResizeOptions.width');
  assertTargetDimension(targetHeight, 'ResizeOptions.height');

  const normalizedSource = normalizePixelMatrix(source);

  switch (strategy) {
    case 'nearest':
      return resizeNearest(normalizedSource, targetWidth, targetHeight);
    default: {
      const exhaustiveCheck: never = strategy;
      throw new Error(`Unsupported sampling strategy: ${exhaustiveCheck}`);
    }
  }
}
