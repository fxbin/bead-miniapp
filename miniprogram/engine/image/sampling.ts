import { Pixel, PixelMatrix, ResizeOptions } from './types';

/**
 * Baseline nearest-neighbor sampling.
 *
 * This is intentionally simple for M0.
 * Quality improvements (bilinear/bicubic/area sampling) can be benchmarked later.
 */
export function resizePixelMatrix(
  source: PixelMatrix,
  options: ResizeOptions
): PixelMatrix {
  const targetWidth = options.width;
  const targetHeight = options.height;

  const pixels: Pixel[][] = [];

  for (let y = 0; y < targetHeight; y++) {
    const row: Pixel[] = [];
    const sourceY = Math.floor((y / targetHeight) * source.height);

    for (let x = 0; x < targetWidth; x++) {
      const sourceX = Math.floor((x / targetWidth) * source.width);
      row.push(source.pixels[sourceY][sourceX]);
    }

    pixels.push(row);
  }

  return {
    width: targetWidth,
    height: targetHeight,
    pixels,
  };
}
