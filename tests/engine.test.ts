import { describe, expect, it } from 'vitest';
import { generatePattern } from '../miniprogram/engine';

describe('generatePattern baseline', () => {
  it('runs Image -> resize -> brand palette -> PatternResult', () => {
    const result = generatePattern(
      {
        width: 2,
        height: 2,
        pixels: [
          [{ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }],
          [{ r: 255, g: 130, b: 0 }, { r: 228, g: 0, b: 43 }],
        ],
      },
      {
        width: 2,
        height: 2,
        paletteId: 'artkal-c-2024',
        matcherStrategy: 'oklab',
      }
    );

    expect(result.grid.map((row) => row.map((cell) => cell.colorCode))).toEqual([
      ['C01', 'C02'],
      ['C03', 'C05'],
    ]);
    expect(result.totalBeads).toBe(4);
    expect(result.uniqueColors).toBe(4);
    expect(Object.values(result.paletteUsage).reduce((sum, count) => sum + count, 0)).toBe(4);
  });

  it('supports standard bead-grid sizes', { timeout: 60000 }, () => {
    const source = { width: 1, height: 1, pixels: [[{ r: 255, g: 255, b: 255 }]] };
    for (const size of [32, 48, 64]) {
      const result = generatePattern(source, {
        width: size,
        height: size,
        paletteId: 'artkal-c-2024',
      });
      expect(result.width).toBe(size);
      expect(result.height).toBe(size);
      expect(result.totalBeads).toBe(size * size);
    }
  });
});
