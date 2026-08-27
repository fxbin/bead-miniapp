import { describe, expect, it } from 'vitest';
import { computeEdgeProtectionMask, effectiveRegionSize } from '../miniprogram/engine/edge';
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

describe('computeEdgeProtectionMask — basic detection', () => {
  it('flags cells on high-contrast boundaries', () => {
    const grid = makeGrid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
      ['A', 'A', 'A'],
    ]);
    const colorLookup = makeColorLookup({
      A: [255, 255, 255],
      B: [0, 0, 0],
    });

    const result = computeEdgeProtectionMask(grid, colorLookup, 'oklab', { enabled: true });

    // Row 0 (A) borders Row 1 (B) — all cells in row 0 should be protected.
    expect(result.mask[0].every((v) => v === true)).toBe(true);
    // Row 1 (B) borders rows 0 and 2 (A) — all cells should be protected.
    expect(result.mask[1].every((v) => v === true)).toBe(true);
    // Row 2 (A) borders Row 1 (B) — all cells should be protected.
    expect(result.mask[2].every((v) => v === true)).toBe(true);
  });

  it('does not flag cells in uniform regions', () => {
    const grid = makeGrid([
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
    ]);
    const colorLookup = makeColorLookup({ A: [128, 128, 128] });

    const result = computeEdgeProtectionMask(grid, colorLookup, 'oklab', { enabled: true });

    // All same color — no edges.
    expect(result.diagnostics.protectedCellCount).toBe(0);
  });
});

describe('computeEdgeProtectionMask — threshold sensitivity', () => {
  it('does not flag low-contrast boundaries below threshold', () => {
    const grid = makeGrid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
    ]);
    // A and B are very close in color.
    const colorLookup = makeColorLookup({
      A: [255, 255, 255],
      B: [254, 254, 254],
    });

    const result = computeEdgeProtectionMask(grid, colorLookup, 'oklab', {
      enabled: true,
      edgeThreshold: 0.05,
    });

    expect(result.diagnostics.protectedCellCount).toBe(0);
  });

  it('flags low-contrast boundaries when threshold is very low', () => {
    const grid = makeGrid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
    ]);
    const colorLookup = makeColorLookup({
      A: [255, 255, 255],
      B: [254, 254, 254],
    });

    const result = computeEdgeProtectionMask(grid, colorLookup, 'oklab', {
      enabled: true,
      edgeThreshold: 0.001,
    });

    expect(result.diagnostics.protectedCellCount).toBeGreaterThan(0);
  });
});

describe('computeEdgeProtectionMask — disabled', () => {
  it('returns all-false mask when disabled', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const colorLookup = makeColorLookup({
      A: [255, 0, 0], B: [0, 255, 0], C: [0, 0, 255], D: [255, 255, 0],
    });

    const result = computeEdgeProtectionMask(grid, colorLookup, 'oklab', { enabled: false });

    expect(result.diagnostics.protectedCellCount).toBe(0);
    expect(result.mask.every((row) => row.every((v) => v === false))).toBe(true);
  });
});

describe('computeEdgeProtectionMask — edge cases', () => {
  it('handles empty grid', () => {
    const result = computeEdgeProtectionMask([], new Map(), 'oklab', { enabled: true });
    expect(result.diagnostics.totalCells).toBe(0);
    expect(result.diagnostics.protectedCellCount).toBe(0);
  });

  it('handles single-cell grid', () => {
    const grid = makeGrid([['A']]);
    const colorLookup = makeColorLookup({ A: [128, 128, 128] });

    const result = computeEdgeProtectionMask(grid, colorLookup, 'oklab', { enabled: true });

    expect(result.diagnostics.totalCells).toBe(1);
    expect(result.diagnostics.protectedCellCount).toBe(0);
  });

  it('handles cells with unknown colors (no lookup)', () => {
    const grid = makeGrid([['A', 'B']]);
    const colorLookup = makeColorLookup({ A: [255, 255, 255] });

    const result = computeEdgeProtectionMask(grid, colorLookup, 'oklab', { enabled: true });

    // B has no color lookup, so its distance can't be computed.
    // A might still be flagged if it can see B... but B is unknown.
    expect(result.diagnostics.protectedCellCount).toBe(0);
  });
});

describe('computeEdgeProtectionMask — diagnostics', () => {
  it('reports correct protected fraction', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const colorLookup = makeColorLookup({
      A: [255, 0, 0], B: [0, 255, 0], C: [0, 0, 255], D: [255, 255, 0],
    });

    const result = computeEdgeProtectionMask(grid, colorLookup, 'oklab', { enabled: true });

    expect(result.diagnostics.totalCells).toBe(4);
    expect(result.diagnostics.protectedFraction).toBe(
      result.diagnostics.protectedCellCount / 4
    );
  });
});

describe('effectiveRegionSize', () => {
  it('adds bonus for protected cells', () => {
    expect(effectiveRegionSize(1, 1, 3)).toBe(4);
    expect(effectiveRegionSize(2, 0, 3)).toBe(2);
    expect(effectiveRegionSize(3, 2, 3)).toBe(9);
  });
});
