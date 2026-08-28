import { describe, expect, it } from 'vitest';
import { resolvePreset } from '../miniprogram/engine/preset';
import { computeCraftabilityDiagnostics } from '../miniprogram/engine/preset/diagnostics';
import { prepareColor } from '../miniprogram/engine/color';
import type { BeadCell } from '../miniprogram/engine/types';
import type { ColorLookup } from '../miniprogram/engine/edge';

function makeGrid(rows: string[][]): BeadCell[][] {
  return rows.map((row) => row.map((code) => ({ colorCode: code })));
}

function makeColorLookup(colors: Record<string, [number, number, number]>): ColorLookup {
  const map = new Map();
  for (const [code, [r, g, b]] of Object.entries(colors)) {
    map.set(code, prepareColor({ r, g, b }));
  }
  return map;
}

describe('resolvePreset', () => {
  it('easy preset: low maxColors, high cleanup, merge enabled', () => {
    const params = resolvePreset('easy');
    expect(params.maxColors).toBe(16);
    expect(params.mergeSimilarColors).toBe(true);
    expect(params.cleanupLevel).toBe(3);
    expect(params.protectEdges).toBe(true);
  });

  it('balanced preset: medium maxColors, medium cleanup', () => {
    const params = resolvePreset('balanced');
    expect(params.maxColors).toBe(32);
    expect(params.mergeSimilarColors).toBe(true);
    expect(params.cleanupLevel).toBe(2);
    expect(params.protectEdges).toBe(true);
  });

  it('fidelity preset: no maxColors cap, merge disabled, low cleanup', () => {
    const params = resolvePreset('fidelity');
    expect(params.maxColors).toBeUndefined();
    expect(params.mergeSimilarColors).toBe(false);
    expect(params.cleanupLevel).toBe(1);
    expect(params.protectEdges).toBe(true);
  });

  it('presets produce distinct parameters', () => {
    const easy = resolvePreset('easy');
    const balanced = resolvePreset('balanced');
    const fidelity = resolvePreset('fidelity');

    expect(easy.maxColors).not.toBe(balanced.maxColors);
    expect(balanced.maxColors).not.toBe(fidelity.maxColors);
    expect(easy.cleanupLevel).not.toBe(balanced.cleanupLevel);
  });
});

describe('computeCraftabilityDiagnostics', () => {
  it('counts unique colors correctly', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'A'],
    ]);
    const colorLookup = makeColorLookup({
      A: [255, 0, 0], B: [0, 255, 0], C: [0, 0, 255],
    });

    const result = computeCraftabilityDiagnostics(grid, colorLookup, 'oklab');

    expect(result.uniqueColorCount).toBe(3);
  });

  it('detects isolated pixels', () => {
    const grid = makeGrid([
      ['A', 'A', 'A'],
      ['A', 'B', 'A'],
      ['A', 'A', 'A'],
    ]);
    const colorLookup = makeColorLookup({
      A: [255, 255, 255], B: [0, 0, 0],
    });

    const result = computeCraftabilityDiagnostics(grid, colorLookup, 'oklab');

    // B is an isolated pixel.
    expect(result.isolatedPixelCount).toBe(1);
  });

  it('counts tiny regions', () => {
    const grid = makeGrid([
      ['A', 'B', 'A', 'C'],
      ['A', 'A', 'A', 'A'],
    ]);
    const colorLookup = makeColorLookup({
      A: [128, 128, 128], B: [255, 0, 0], C: [0, 255, 0],
    });

    const result = computeCraftabilityDiagnostics(grid, colorLookup, 'oklab');

    // B and C are isolated pixels (size 1 <= 4).
    expect(result.tinyRegionCount).toBeGreaterThanOrEqual(2);
  });

  it('reports largest and median region sizes', () => {
    const grid = makeGrid([
      ['A', 'A', 'A', 'B'],
      ['A', 'A', 'A', 'B'],
      ['C', 'A', 'A', 'A'],
    ]);
    const colorLookup = makeColorLookup({
      A: [128, 128, 128], B: [255, 0, 0], C: [0, 255, 0],
    });

    const result = computeCraftabilityDiagnostics(grid, colorLookup, 'oklab');

    // A is the largest region (7 cells).
    expect(result.largestRegionSize).toBeGreaterThanOrEqual(7);
  });

  it('detects similar color redundancy', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const colorLookup = makeColorLookup({
      A: [255, 255, 255], B: [254, 254, 254], // A and B are very similar
      C: [0, 0, 0], D: [128, 0, 0],
    });

    const result = computeCraftabilityDiagnostics(grid, colorLookup, 'oklab', 0.05);

    expect(result.similarColorRedundancy).toBeGreaterThanOrEqual(1);
  });

  it('handles empty grid', () => {
    const result = computeCraftabilityDiagnostics([], new Map(), 'oklab');
    expect(result.uniqueColorCount).toBe(0);
    expect(result.isolatedPixelCount).toBe(0);
  });
});
