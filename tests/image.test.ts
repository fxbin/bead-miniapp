import { describe, expect, it } from 'vitest';
import { normalizePixelMatrix, resizePixelMatrix } from '../miniprogram/engine/image';

function pixel(r: number, g = r, b = r, a?: number) {
  return { r, g, b, a };
}

describe('image normalization', () => {
  it('clamps channels and fills missing alpha', () => {
    const result = normalizePixelMatrix({
      width: 1,
      height: 1,
      pixels: [[pixel(300, -4, 127.6)]],
    });

    expect(result.pixels[0][0]).toEqual({ r: 255, g: 0, b: 128, a: 255 });
  });

  it('rejects malformed matrices', () => {
    expect(() => normalizePixelMatrix({ width: 2, height: 1, pixels: [[pixel(0)]] }))
      .toThrow(/row 0 length must equal width/);
  });
});

describe('nearest sampling baseline', () => {
  it('samples the source center when reducing 3x3 to 1x1', () => {
    const source = {
      width: 3,
      height: 3,
      pixels: [
        [pixel(1), pixel(2), pixel(3)],
        [pixel(4), pixel(99), pixel(6)],
        [pixel(7), pixel(8), pixel(9)],
      ],
    };

    const result = resizePixelMatrix(source, { width: 1, height: 1 });
    expect(result.pixels[0][0].r).toBe(99);
  });

  it('returns defensive pixel copies', () => {
    const source = { width: 1, height: 1, pixels: [[pixel(12)]] };
    const result = resizePixelMatrix(source, { width: 1, height: 1 });
    result.pixels[0][0].r = 200;
    expect(source.pixels[0][0].r).toBe(12);
  });
});
