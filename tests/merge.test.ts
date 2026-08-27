import { describe, expect, it } from 'vitest';
import { mergePaletteColors } from '../miniprogram/engine/merge';
import { getPreparedPalette } from '../miniprogram/engine/palette/registry';
import { prepareColor } from '../miniprogram/engine/color';
import type { PreparedBeadColor } from '../miniprogram/engine/palette/types';

function makeBeadColor(code: string, r: number, g: number, b: number): PreparedBeadColor {
  return {
    code,
    name: code,
    rgb: { r, g, b },
    material: 'normal',
    available: true,
    confidence: 'official-digital',
    prepared: prepareColor({ r, g, b }),
  };
}

describe('mergePaletteColors — maxColors hard constraint', () => {
  it('reduces color count to at most maxColors', () => {
    const colors = [
      makeBeadColor('A', 255, 0, 0),
      makeBeadColor('B', 0, 255, 0),
      makeBeadColor('C', 0, 0, 255),
      makeBeadColor('D', 128, 128, 128),
      makeBeadColor('E', 64, 64, 64),
    ];
    const usage = new Map([
      ['A', 50], ['B', 10], ['C', 5], ['D', 30], ['E', 5],
    ]);

    const result = mergePaletteColors(colors, usage, 'oklab', { maxColors: 3 });

    expect(result.diagnostics.uniqueColorsBefore).toBe(5);
    expect(result.diagnostics.uniqueColorsAfter).toBeLessThanOrEqual(3);
    expect(result.diagnostics.uniqueColorsAfter).toBeGreaterThan(0);
    // Two colors should have been merged away.
    expect(Object.keys(result.diagnostics.remap)).toHaveLength(2);
  });

  it('merges lowest-usage colors first when maxColors is set', () => {
    const colors = [
      makeBeadColor('A', 255, 0, 0),
      makeBeadColor('B', 0, 255, 0),
      makeBeadColor('C', 0, 0, 255),
    ];
    const usage = new Map([
      ['A', 100], ['B', 1], ['C', 50],
    ]);

    const result = mergePaletteColors(colors, usage, 'oklab', { maxColors: 2 });

    // B has the lowest usage (1), so it should be merged.
    expect(result.diagnostics.remap['B']).toBeDefined();
    expect(result.diagnostics.remap['B']).not.toBe('B');
    // A and C should survive (highest usage).
    expect(result.diagnostics.remap['A']).toBeUndefined();
    expect(result.diagnostics.remap['C']).toBeUndefined();
    expect(result.diagnostics.uniqueColorsAfter).toBe(2);
  });

  it('chains remap correctly when merging merged colors', () => {
    const colors = [
      makeBeadColor('A', 255, 0, 0),
      makeBeadColor('B', 0, 255, 0),
      makeBeadColor('C', 0, 0, 255),
      makeBeadColor('D', 128, 0, 0),
    ];
    const usage = new Map([
      ['A', 50], ['B', 5], ['C', 3], ['D', 40],
    ]);

    const result = mergePaletteColors(colors, usage, 'oklab', { maxColors: 2 });

    expect(result.diagnostics.uniqueColorsAfter).toBeLessThanOrEqual(2);
    // All merged codes should point to a surviving code.
    for (const remapped of Object.values(result.diagnostics.remap)) {
      expect(result.colors.some((c: PreparedBeadColor) => c.code === remapped)).toBe(true);
    }
  });
});

describe('mergePaletteColors — threshold merge', () => {
  it('merges colors within the perceptual threshold', () => {
    const colors = [
      makeBeadColor('A', 255, 255, 255),
      makeBeadColor('B', 254, 254, 254), // very close to A
      makeBeadColor('C', 0, 0, 0),       // far from A and B
    ];
    const usage = new Map([
      ['A', 40], ['B', 10], ['C', 50],
    ]);

    const result = mergePaletteColors(colors, usage, 'oklab', {
      enabled: true,
      mergeThreshold: 0.05,
    });

    // B should be merged into A (higher usage, very close).
    expect(result.diagnostics.remap['B']).toBe('A');
    expect(result.diagnostics.uniqueColorsAfter).toBe(2);
  });

  it('does not merge colors beyond the threshold', () => {
    const colors = [
      makeBeadColor('A', 255, 0, 0),
      makeBeadColor('B', 0, 255, 0),
      makeBeadColor('C', 0, 0, 255),
    ];
    const usage = new Map([
      ['A', 40], ['B', 10], ['C', 50],
    ]);

    const result = mergePaletteColors(colors, usage, 'oklab', {
      enabled: true,
      mergeThreshold: 0.01,
    });

    expect(result.diagnostics.uniqueColorsAfter).toBe(3);
    expect(Object.keys(result.diagnostics.remap)).toHaveLength(0);
  });

  it('is disabled when enabled is false and no maxColors', () => {
    const colors = [
      makeBeadColor('A', 255, 255, 255),
      makeBeadColor('B', 254, 254, 254),
    ];
    const usage = new Map([['A', 40], ['B', 10]]);

    const result = mergePaletteColors(colors, usage, 'oklab', {
      enabled: false,
    });

    expect(result.diagnostics.uniqueColorsAfter).toBe(2);
  });
});

describe('mergePaletteColors — merge cost', () => {
  it('computes non-zero merge cost when colors are merged', () => {
    const colors = [
      makeBeadColor('A', 255, 255, 255),
      makeBeadColor('B', 250, 250, 250),
    ];
    const usage = new Map([['A', 50], ['B', 20]]);

    const result = mergePaletteColors(colors, usage, 'oklab', {
      enabled: true,
      mergeThreshold: 0.5,
    });

    expect(result.diagnostics.mergeCost).toBeGreaterThan(0);
  });

  it('reports zero merge cost when no colors are merged', () => {
    const colors = [
      makeBeadColor('A', 255, 0, 0),
      makeBeadColor('B', 0, 0, 255),
    ];
    const usage = new Map([['A', 50], ['B', 20]]);

    const result = mergePaletteColors(colors, usage, 'oklab', {
      enabled: true,
      mergeThreshold: 0.01,
    });

    expect(result.diagnostics.mergeCost).toBe(0);
  });
});

describe('mergePaletteColors — integration with real palette', () => {
  it('works with Artkal palette subset', () => {
    const palette = getPreparedPalette('artkal-c-2024');
    // Take the first 10 colors to have some similar ones.
    const colors = palette.colors.slice(0, 10);
    const usage = new Map(colors.map((c) => [c.code, (c.code.charCodeAt(1) % 5) + 1]));

    const result = mergePaletteColors(colors, usage, 'oklab', {
      maxColors: 5,
    });

    expect(result.diagnostics.uniqueColorsAfter).toBeLessThanOrEqual(5);
    expect(result.diagnostics.uniqueColorsAfter).toBeGreaterThan(0);
  });
});
