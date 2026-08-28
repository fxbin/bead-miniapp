import { describe, expect, it } from 'vitest';
import { runFixtureBenchmark } from './dataset';
import type { BenchmarkReport, BenchmarkRun } from './dataset';
import { compareReports, printRegressionReport, DEFAULT_THRESHOLDS } from './regression';

// Helper: deep-clone a report and perturb specific metrics
function perturbReport(report: BenchmarkReport, mutator: (run: BenchmarkRun) => void): BenchmarkReport {
  const runs = report.runs.map((r) => {
    const copy: BenchmarkRun = JSON.parse(JSON.stringify(r));
    mutator(copy);
    return copy;
  });
  return { ...report, runs };
}

// Build a small 9-run report from a single fixture for fast tests
function makeSmallReport(fixtureId: string = 'logo-01'): BenchmarkReport {
  const runs = runFixtureBenchmark(fixtureId);
  return {
    runs,
    fixtureCount: 1,
    totalRuns: runs.length,
    generatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('Regression Comparison — #39', () => {
  it('compareReports produces deltas for all 9 runs (single fixture)', () => {
    const baseline = makeSmallReport();
    const candidate = makeSmallReport();
    const report = compareReports(baseline, candidate);
    expect(report.deltas).toHaveLength(9);
    expect(report.summary.totalRuns).toBe(9);
    // Same data → no regressions, no improvements
    expect(report.summary.regressions).toBe(0);
    expect(report.summary.improvements).toBe(0);
    expect(report.summary.unchanged).toBe(9);
  });

  it('detects color shift regression when meanMatchDistance increases', () => {
    const baseline = makeSmallReport();
    const candidate = perturbReport(baseline, (run) => {
      run.meanMatchDistance *= 1.20; // +20% > 15% threshold
    });
    const report = compareReports(baseline, candidate, {
      ...DEFAULT_THRESHOLDS,
      colorShiftPercent: 15,
    });
    expect(report.summary.regressions).toBe(9);
    expect(report.summary.improvements).toBe(0);
    // Every flag should be about meanMatchDistance
    for (const f of report.flags) {
      expect(f.metric).toBe('meanMatchDistance');
      expect(f.direction).toBe('regression');
      expect(f.deltaPercent).toBeGreaterThan(15);
    }
  });

  it('detects color count anomaly when uniqueColors changes significantly', () => {
    const baseline = makeSmallReport();
    const candidate = perturbReport(baseline, (run) => {
      run.uniqueColors = Math.round(run.uniqueColors * 1.30); // +30% > 20% threshold
    });
    const report = compareReports(baseline, candidate);
    const colorFlags = report.flags.filter((f) => f.metric === 'uniqueColors');
    expect(colorFlags.length).toBeGreaterThan(0);
    expect(colorFlags.every((f) => f.direction === 'regression')).toBe(true);
  });

  it('detects fragmentation regression when isolatedPixelCount increases', () => {
    // Use a report where we inject isolated pixels into candidate
    const baseline = makeSmallReport('logo-01');
    const candidate = perturbReport(baseline, (run) => {
      // Only fidelity runs have isolated pixels; inject some into all runs
      run.craftability.isolatedPixelCount = Math.max(run.craftability.isolatedPixelCount, 5);
    });
    const report = compareReports(baseline, candidate);
    const fragFlags = report.flags.filter((f) => f.metric === 'isolatedPixelCount');
    // Runs that had 0 isolated pixels now have 5 → Infinity % increase → flag
    expect(fragFlags.length).toBeGreaterThan(0);
    expect(fragFlags.every((f) => f.direction === 'regression')).toBe(true);
  });

  it('detects improvement when meanMatchDistance decreases', () => {
    const baseline = makeSmallReport();
    const candidate = perturbReport(baseline, (run) => {
      run.meanMatchDistance *= 0.80; // -20%
    });
    const report = compareReports(baseline, candidate);
    expect(report.summary.improvements).toBe(9);
    expect(report.summary.regressions).toBe(0);
  });

  it('handles zero-baseline values without crashing', () => {
    const minimalBaseline: BenchmarkReport = {
      runs: [{
        fixtureId: 'test', fixtureName: 'Test', category: 'logo',
        size: 32, preset: 'easy',
        meanMatchDistance: 0.03, uniqueColors: 5, totalBeads: 1024,
        craftability: {
          uniqueColorCount: 5, similarColorRedundancy: 0,
          isolatedPixelCount: 0, tinyRegionCount: 0,
          largestRegionSize: 100, medianRegionSize: 10,
        },
        elapsedMs: 10,
      }],
      fixtureCount: 1, totalRuns: 1, generatedAt: '2026-01-01T00:00:00Z',
    };
    const minimalCandidate: BenchmarkReport = {
      runs: [{
        fixtureId: 'test', fixtureName: 'Test', category: 'logo',
        size: 32, preset: 'easy',
        meanMatchDistance: 0.03, uniqueColors: 5, totalBeads: 1024,
        craftability: {
          uniqueColorCount: 5, similarColorRedundancy: 0,
          isolatedPixelCount: 5, tinyRegionCount: 3,
          largestRegionSize: 100, medianRegionSize: 10,
        },
        elapsedMs: 10,
      }],
      fixtureCount: 1, totalRuns: 1, generatedAt: '2026-01-01T00:00:00Z',
    };
    const report = compareReports(minimalBaseline, minimalCandidate);
    expect(report.deltas).toHaveLength(1);
    // isolatedPixel went from 0 to 5 → Infinity % → should flag
    const isoFlags = report.flags.filter((f) => f.metric === 'isolatedPixelCount');
    expect(isoFlags.length).toBe(1);
    expect(isoFlags[0].deltaPercent).toBe(Infinity);
  });

  it('printRegressionReport outputs without error', () => {
    const baseline = makeSmallReport();
    const candidate = makeSmallReport();
    const report = compareReports(baseline, candidate);
    expect(() => printRegressionReport(report)).not.toThrow();
  });
});
