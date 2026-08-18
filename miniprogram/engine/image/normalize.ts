import type { Pixel, PixelMatrix } from './types';

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number`);
  }
}

export function clampChannel(value: number): number {
  assertFiniteNumber(value, 'color channel');
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function normalizePixel(pixel: Pixel): Required<Pixel> {
  return {
    r: clampChannel(pixel.r),
    g: clampChannel(pixel.g),
    b: clampChannel(pixel.b),
    a: pixel.a === undefined ? 255 : clampChannel(pixel.a),
  };
}

export function assertPixelMatrix(matrix: PixelMatrix): void {
  if (!Number.isInteger(matrix.width) || matrix.width <= 0) {
    throw new RangeError('PixelMatrix.width must be a positive integer');
  }

  if (!Number.isInteger(matrix.height) || matrix.height <= 0) {
    throw new RangeError('PixelMatrix.height must be a positive integer');
  }

  if (!Array.isArray(matrix.pixels) || matrix.pixels.length !== matrix.height) {
    throw new RangeError('PixelMatrix row count must equal height');
  }

  for (let y = 0; y < matrix.height; y++) {
    const row = matrix.pixels[y];
    if (!Array.isArray(row) || row.length !== matrix.width) {
      throw new RangeError(`PixelMatrix row ${y} length must equal width`);
    }

    for (let x = 0; x < matrix.width; x++) {
      const pixel = row[x];
      if (!pixel || typeof pixel !== 'object') {
        throw new TypeError(`PixelMatrix pixel at (${x}, ${y}) is invalid`);
      }
      assertFiniteNumber(pixel.r, `pixel(${x},${y}).r`);
      assertFiniteNumber(pixel.g, `pixel(${x},${y}).g`);
      assertFiniteNumber(pixel.b, `pixel(${x},${y}).b`);
      if (pixel.a !== undefined) {
        assertFiniteNumber(pixel.a, `pixel(${x},${y}).a`);
      }
    }
  }
}

/**
 * Produces a defensive, channel-clamped copy of the input matrix.
 * Missing alpha is normalized to 255. Transparent-pixel semantics are kept
 * intact for downstream palette/background policy instead of being guessed here.
 */
export function normalizePixelMatrix(matrix: PixelMatrix): PixelMatrix {
  assertPixelMatrix(matrix);

  return {
    width: matrix.width,
    height: matrix.height,
    pixels: matrix.pixels.map((row) => row.map(normalizePixel)),
  };
}
