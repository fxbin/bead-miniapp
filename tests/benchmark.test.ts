import { describe, expect, it } from 'vitest';
import { generatePattern } from '../miniprogram/engine';

interface BenchmarkRow {
  size: number;
  elapsedMs: number;
  uniqueColors: number;
  meanMatchDistance: number;
}

function makeGradientFixture(width: number, height: number) {
  return {
    width,
    height,
    pixels: Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => ({
        r: (x / Math.max(1, width - 1)) * 255,
        g: (y / Math.max(1, height - 1)) * 255,
        b: ((x + y) / Math.max(1, width + height - 2)) * 255,
      }))
    ),
  };
}

function benchmarkStandardSizes(): BenchmarkRow[] {
  const source = makeGradientFixture(96, 96);
  return [32, 48, 64].map((size) => {
    const startedAt = performance.now();
    const result = generatePattern(source, {
      width: size,
      height: size,
      paletteId: 'artkal-c-2024',
      matcherStrategy: 'oklab',
    });
    const elapsedMs = performance.now() - startedAt;

    return {
      size,
      elapsedMs,
      uniqueColors: result.uniqueColors,
      meanMatchDistance: result.diagnostics.meanMatchDistance,
    };
  });
}

describe('engine benchmark harness', () => {
  it('records baseline metrics for standard grid sizes', () => {
    const rows = benchmarkStandardSizes();
    // Timing is diagnostic, not a flaky pass/fail threshold in CI.
    console.table(rows);
    expect(rows.map((row) => row.size)).toEqual([32, 48, 64]);
    expect(rows.every((row) => Number.isFinite(row.elapsedMs))).toBe(true);
    expect(rows.every((row) => row.uniqueColors > 0)).toBe(true);
  });
});
