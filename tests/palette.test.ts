import { describe, expect, it } from 'vitest';
import {
  getPalette,
  getPreparedPalette,
  matchPixelMatrixToPalette,
} from '../miniprogram/engine/palette';

describe('Artkal palette registry', () => {
  it('loads the official digital palette with explicit exclusions', () => {
    const palette = getPalette('artkal-c-2024');
    expect(palette.colors).toHaveLength(172);
    expect(palette.excluded?.map((item) => item.code)).toEqual(['C35', 'C152']);
  });

  it('caches prepared color-space values', () => {
    expect(getPreparedPalette('artkal-c-2024')).toBe(getPreparedPalette('artkal-c-2024'));
  });
});

describe('palette matcher', () => {
  it('matches exact white and black to C01/C02', () => {
    const result = matchPixelMatrixToPalette(
      {
        width: 2,
        height: 1,
        pixels: [[
          { r: 255, g: 255, b: 255 },
          { r: 0, g: 0, b: 0 },
        ]],
      },
      { paletteId: 'artkal-c-2024', strategy: 'oklab' }
    );

    expect(result.grid[0].map((cell) => cell.colorCode)).toEqual(['C01', 'C02']);
    expect(result.paletteUsage).toEqual({ C01: 1, C02: 1 });
    expect(result.meanMatchDistance).toBeCloseTo(0, 10);
  });

  it('composites transparent pixels on white by default', () => {
    const result = matchPixelMatrixToPalette(
      { width: 1, height: 1, pixels: [[{ r: 0, g: 0, b: 0, a: 0 }]] },
      { paletteId: 'artkal-c-2024' }
    );
    expect(result.grid[0][0].colorCode).toBe('C01');
  });
});
