import { describe, expect, it } from 'vitest';
import { cleanupSmallRegions } from '../miniprogram/engine/cleanup';
import type { BeadCell } from '../miniprogram/engine/types';

function makeGrid(rows: string[][]): BeadCell[][] {
  return rows.map((row) => row.map((code) => ({ colorCode: code })));
}

function gridCodes(grid: BeadCell[][]): string[][] {
  return grid.map((row) => row.map((cell) => cell.colorCode));
}

describe('cleanupSmallRegions — isolated pixel removal', () => {
  it('replaces a single isolated pixel with the majority neighbor color', () => {
    const grid = makeGrid([
      ['A', 'A', 'A'],
      ['A', 'B', 'A'],
      ['A', 'A', 'A'],
    ]);

    const result = cleanupSmallRegions(grid, { cleanupLevel: 2 });

    // B is an isolated pixel surrounded by A — should be replaced.
    expect(gridCodes(result.grid)).toEqual([
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
    ]);
    expect(result.diagnostics.cellsReplaced).toBe(1);
    expect(result.diagnostics.isolatedPixelCountBefore).toBe(1);
    expect(result.diagnostics.isolatedPixelCountAfter).toBe(0);
  });

  it('does not replace a pixel that is part of a larger region', () => {
    const grid = makeGrid([
      ['A', 'A', 'A'],
      ['B', 'B', 'B'],
      ['A', 'A', 'A'],
    ]);

    const result = cleanupSmallRegions(grid, { cleanupLevel: 2 });

    // B is a 3-cell region, not tiny (maxTinyRegionSize=2 for level 2).
    expect(result.diagnostics.cellsReplaced).toBe(0);
  });
});

describe('cleanupSmallRegions — tiny region detection', () => {
  it('detects and replaces 2-cell regions at cleanupLevel 2', () => {
    const grid = makeGrid([
      ['A', 'A', 'A', 'A'],
      ['A', 'B', 'B', 'A'],
      ['A', 'A', 'A', 'A'],
    ]);

    const result = cleanupSmallRegions(grid, { cleanupLevel: 2 });

    // B is a 2-cell region, within maxTinyRegionSize=2 for level 2.
    expect(result.diagnostics.cellsReplaced).toBe(2);
    expect(result.diagnostics.tinyRegionCountBefore).toBe(1);
    expect(result.diagnostics.tinyRegionCountAfter).toBe(0);
  });

  it('does not replace 3-cell regions at cleanupLevel 1', () => {
    const grid = makeGrid([
      ['A', 'A', 'A', 'A'],
      ['A', 'B', 'B', 'A'],
      ['A', 'B', 'A', 'A'],
    ]);

    const result = cleanupSmallRegions(grid, { cleanupLevel: 1 });

    // B is a 3-cell region, maxTinyRegionSize=1 for level 1.
    expect(result.diagnostics.cellsReplaced).toBe(0);
  });
});

describe('cleanupSmallRegions — 4-connectivity', () => {
  it('treats diagonal-only connected cells as separate regions with 4-connectivity', () => {
    const grid = makeGrid([
      ['A', 'B', 'A'],
      ['B', 'A', 'B'],
      ['A', 'B', 'A'],
    ]);

    const result = cleanupSmallRegions(grid, {
      cleanupLevel: 2,
      connectivity: 4,
    });

    // With 4-connectivity, the center A is isolated (its diagonal neighbors
    // don't count), so it should be replaced.
    expect(result.diagnostics.isolatedPixelCountBefore).toBeGreaterThan(0);
    expect(result.diagnostics.cellsReplaced).toBeGreaterThan(0);
  });
});

describe('cleanupSmallRegions — determinism', () => {
  it('produces the same output for the same input', () => {
    const grid = makeGrid([
      ['A', 'B', 'A', 'C'],
      ['A', 'A', 'A', 'A'],
      ['D', 'A', 'A', 'A'],
    ]);

    const result1 = cleanupSmallRegions(grid, { cleanupLevel: 2 });
    const result2 = cleanupSmallRegions(grid, { cleanupLevel: 2 });

    expect(gridCodes(result1.grid)).toEqual(gridCodes(result2.grid));
    expect(result1.diagnostics).toEqual(result2.diagnostics);
  });
});

describe('cleanupSmallRegions — edge cases', () => {
  it('handles empty grid', () => {
    const result = cleanupSmallRegions([], { cleanupLevel: 2 });
    expect(result.diagnostics.cellsReplaced).toBe(0);
  });

  it('handles single-cell grid (no neighbors)', () => {
    const grid = makeGrid([['A']]);
    const result = cleanupSmallRegions(grid, { cleanupLevel: 2 });
    expect(result.diagnostics.cellsReplaced).toBe(0);
  });

  it('handles all-same-color grid', () => {
    const grid = makeGrid([
      ['A', 'A'],
      ['A', 'A'],
    ]);
    const result = cleanupSmallRegions(grid, { cleanupLevel: 2 });
    expect(result.diagnostics.cellsReplaced).toBe(0);
  });

  it('does not modify grid when cleanupLevel is 0', () => {
    const grid = makeGrid([
      ['A', 'B', 'A'],
      ['A', 'A', 'A'],
    ]);
    const result = cleanupSmallRegions(grid, { cleanupLevel: 0 });
    expect(result.diagnostics.cellsReplaced).toBe(0);
    expect(gridCodes(result.grid)).toEqual(gridCodes(grid));
  });
});

describe('cleanupSmallRegions — border regions', () => {
  it('handles isolated pixel at grid border', () => {
    const grid = makeGrid([
      ['B', 'A', 'A'],
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
    ]);

    const result = cleanupSmallRegions(grid, { cleanupLevel: 2 });

    // B at (0,0) is isolated, surrounded by A.
    expect(result.diagnostics.cellsReplaced).toBe(1);
    expect(result.grid[0][0].colorCode).toBe('A');
  });

  it('handles isolated pixel at grid corner', () => {
    const grid = makeGrid([
      ['A', 'A', 'A'],
      ['A', 'A', 'A'],
      ['A', 'A', 'B'],
    ]);

    const result = cleanupSmallRegions(grid, { cleanupLevel: 2 });

    expect(result.diagnostics.cellsReplaced).toBe(1);
    expect(result.grid[2][2].colorCode).toBe('A');
  });
});

describe('cleanupSmallRegions — multi-iteration', () => {
  it('cascading cleanup: isolated pixel appears after neighbor replacement', () => {
    // After replacing B with A, C might become isolated.
    const grid = makeGrid([
      ['A', 'A', 'A', 'A'],
      ['A', 'B', 'C', 'A'],
      ['A', 'A', 'A', 'A'],
    ]);

    const result = cleanupSmallRegions(grid, { cleanupLevel: 2 });

    // Both B and C should be cleaned up across iterations.
    expect(result.diagnostics.cellsReplaced).toBeGreaterThanOrEqual(2);
    expect(result.diagnostics.iterations).toBeGreaterThan(0);
  });
});
