import { describe, expect, it } from 'vitest';
import {
  GOLDEN_FIXTURES,
  BENCHMARK_SIZES,
  BENCHMARK_PRESETS,
  runGoldenBenchmark,
  runFixtureBenchmark,
  printBenchmarkSummary,
} from './dataset';
import type { FixtureCategory } from './dataset';

describe('Golden Benchmark Dataset — #38', () => {
  it('has exactly 20 fixtures', () => {
    expect(GOLDEN_FIXTURES).toHaveLength(20);
  });

  it('covers all 7 categories', () => {
    const categories = new Set(GOLDEN_FIXTURES.map((f) => f.category));
    const expected: FixtureCategory[] = [
      'pet', 'portrait', 'anime', 'logo', 'landscape', 'food', 'lowcontrast',
    ];
    for (const cat of expected) {
      expect(categories.has(cat)).toBe(true);
    }
  });

  it('pet category has 4 fixtures', () => {
    expect(GOLDEN_FIXTURES.filter((f) => f.category === 'pet')).toHaveLength(4);
  });

  it('portrait category has 4 fixtures', () => {
    expect(GOLDEN_FIXTURES.filter((f) => f.category === 'portrait')).toHaveLength(4);
  });

  it('anime category has 3 fixtures', () => {
    expect(GOLDEN_FIXTURES.filter((f) => f.category === 'anime')).toHaveLength(3);
  });

  it('logo category has 2 fixtures', () => {
    expect(GOLDEN_FIXTURES.filter((f) => f.category === 'logo')).toHaveLength(2);
  });

  it('landscape category has 3 fixtures', () => {
    expect(GOLDEN_FIXTURES.filter((f) => f.category === 'landscape')).toHaveLength(3);
  });

  it('food category has 2 fixtures', () => {
    expect(GOLDEN_FIXTURES.filter((f) => f.category === 'food')).toHaveLength(2);
  });

  it('lowcontrast category has 2 fixtures', () => {
    expect(GOLDEN_FIXTURES.filter((f) => f.category === 'lowcontrast')).toHaveLength(2);
  });

  it('every fixture has a stable id, name, source, and deterministic generate', () => {
    for (const f of GOLDEN_FIXTURES) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.source).toBeTruthy();
      // Determinism: generate twice, same output
      const a = f.generate();
      const b = f.generate();
      expect(a.width).toBe(b.width);
      expect(a.height).toBe(b.height);
      expect(a.pixels).toEqual(b.pixels);
    }
  });

  it('all fixtures produce 96×96 pixel matrices', () => {
    for (const f of GOLDEN_FIXTURES) {
      const m = f.generate();
      expect(m.width).toBe(96);
      expect(m.height).toBe(96);
      expect(m.pixels.length).toBe(96);
      expect(m.pixels[0].length).toBe(96);
    }
  });

  it('covers 3 sizes and 3 presets', () => {
    expect(BENCHMARK_SIZES).toEqual([32, 48, 64]);
    expect(BENCHMARK_PRESETS).toEqual(['easy', 'balanced', 'fidelity']);
  });
});

describe('Golden Benchmark Runner — #38', () => {
  // Full suite is 180 runs; use a single fixture for unit test speed.
  it('runFixtureBenchmark produces 9 runs for one fixture (3 sizes × 3 presets)', () => {
    const runs = runFixtureBenchmark('logo-01');
    expect(runs).toHaveLength(9);
    expect(runs.every((r) => r.fixtureId === 'logo-01')).toBe(true);
    expect(runs.map((r) => r.size).sort((a, b) => a - b)).toEqual([32, 32, 32, 48, 48, 48, 64, 64, 64]);
  });

  it('every run has valid fidelity and craftability metrics', () => {
    const runs = runFixtureBenchmark('anime-01');
    for (const r of runs) {
      expect(r.uniqueColors).toBeGreaterThan(0);
      expect(r.totalBeads).toBeGreaterThan(0);
      expect(r.meanMatchDistance).toBeGreaterThanOrEqual(0);
      expect(r.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(r.craftability.uniqueColorCount).toBeGreaterThan(0);
      expect(r.craftability.isolatedPixelCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('easy preset produces fewer unique colors than fidelity for same fixture+size', () => {
    const runs = runFixtureBenchmark('landscape-01');
    const easy64 = runs.find((r) => r.size === 64 && r.preset === 'easy')!;
    const fidelity64 = runs.find((r) => r.size === 64 && r.preset === 'fidelity')!;
    expect(easy64).toBeDefined();
    expect(fidelity64).toBeDefined();
    // Easy has maxColors=24 cap; fidelity has no cap.
    expect(easy64.uniqueColors).toBeLessThanOrEqual(fidelity64.uniqueColors);
  });
});

describe('Golden Benchmark Full Suite — #38', () => {
  it('runGoldenBenchmark produces 180 runs (20 × 3 × 3)', { timeout: 120000 }, () => {
    const report = runGoldenBenchmark();
    expect(report.totalRuns).toBe(180);
    expect(report.fixtureCount).toBe(20);
    expect(report.runs.length).toBe(180);
    expect(report.generatedAt).toBeTruthy();
    // Every run has valid metrics.
    for (const r of report.runs) {
      expect(r.uniqueColors).toBeGreaterThan(0);
      expect(r.craftability.uniqueColorCount).toBeGreaterThan(0);
    }
    printBenchmarkSummary(report);
  });
});
