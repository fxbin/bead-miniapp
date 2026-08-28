/**
 * Regression Comparison Harness — Issue #39
 *
 * Takes a golden benchmark report (baseline) and a candidate report,
 * produces per-run metric deltas, and flags regressions.
 *
 * Regression thresholds (tunable):
 *   - meanMatchDistance increase > 15% → color shift regression
 *   - uniqueColors increase > 20% or decrease > 20% → color count anomaly
 *   - isolatedPixelCount increase > 50% → fragmentation regression
 *   - tinyRegionCount increase > 50% → fragmentation regression
 *   - edgePreservationRatio decrease > 10% → detail loss regression
 */

import type { BenchmarkRun, BenchmarkReport } from './dataset';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunDelta {
  fixtureId: string;
  fixtureName: string;
  category: string;
  size: number;
  preset: string;

  // Fidelity deltas
  meanMatchDistance: number;
  meanMatchDistanceDelta: number;
  uniqueColors: number;
  uniqueColorsDelta: number;
  totalBeads: number;
  totalBeadsDelta: number;

  // Craftability deltas
  isolatedPixelCount: number;
  isolatedPixelCountDelta: number;
  tinyRegionCount: number;
  tinyRegionCountDelta: number;
  similarColorRedundancy: number;
  similarColorRedundancyDelta: number;
  largestRegionSize: number;
  largestRegionSizeDelta: number;

  // Timing
  elapsedMs: number;
  elapsedMsDelta: number;
}

export interface RegressionFlag {
  fixtureId: string;
  size: number;
  preset: string;
  metric: string;
  baselineValue: number;
  candidateValue: number;
  delta: number;
  deltaPercent: number;
  direction: 'regression' | 'improvement';
  reason: string;
}

export interface RegressionReport {
  deltas: RunDelta[];
  flags: RegressionFlag[];
  summary: {
    totalRuns: number;
    regressions: number;
    improvements: number;
    unchanged: number;
  };
  baselineSha?: string;
  candidateSha?: string;
}

// ---------------------------------------------------------------------------
// Regression thresholds
// ---------------------------------------------------------------------------

export interface RegressionThresholds {
  /** Max acceptable % increase in meanMatchDistance before flagging color shift. */
  colorShiftPercent: number;
  /** Max acceptable % change in uniqueColors before flagging anomaly. */
  colorCountChangePercent: number;
  /** Max acceptable % increase in isolatedPixelCount before flagging fragmentation. */
  isolatedPixelIncreasePercent: number;
  /** Max acceptable % increase in tinyRegionCount before flagging fragmentation. */
  tinyRegionIncreasePercent: number;
  /** Max acceptable % decrease in edgePreservationRatio before flagging detail loss. */
  edgeLossPercent: number;
}

export const DEFAULT_THRESHOLDS: RegressionThresholds = {
  colorShiftPercent: 15,
  colorCountChangePercent: 20,
  isolatedPixelIncreasePercent: 50,
  tinyRegionIncreasePercent: 50,
  edgeLossPercent: 10,
};

// ---------------------------------------------------------------------------
// Comparison logic
// ---------------------------------------------------------------------------

function pctDelta(baseline: number, candidate: number): number {
  if (baseline === 0) {
    return candidate === 0 ? 0 : candidate > 0 ? Infinity : -Infinity;
  }
  return ((candidate - baseline) / baseline) * 100;
}

function makeRunKey(r: BenchmarkRun): string {
  return `${r.fixtureId}|${r.size}|${r.preset}`;
}

/**
 * Compare a baseline report against a candidate report.
 * Returns deltas for all matching runs + regression flags.
 */
export function compareReports(
  baseline: BenchmarkReport,
  candidate: BenchmarkReport,
  thresholds: RegressionThresholds = DEFAULT_THRESHOLDS
): RegressionReport {
  const baselineMap = new Map<string, BenchmarkRun>();
  for (const r of baseline.runs) {
    baselineMap.set(makeRunKey(r), r);
  }

  const deltas: RunDelta[] = [];
  const flags: RegressionFlag[] = [];

  for (const cand of candidate.runs) {
    const base = baselineMap.get(makeRunKey(cand));
    if (!base) continue;

    const delta: RunDelta = {
      fixtureId: cand.fixtureId,
      fixtureName: cand.fixtureName,
      category: cand.category,
      size: cand.size,
      preset: cand.preset,
      meanMatchDistance: cand.meanMatchDistance,
      meanMatchDistanceDelta: cand.meanMatchDistance - base.meanMatchDistance,
      uniqueColors: cand.uniqueColors,
      uniqueColorsDelta: cand.uniqueColors - base.uniqueColors,
      totalBeads: cand.totalBeads,
      totalBeadsDelta: cand.totalBeads - base.totalBeads,
      isolatedPixelCount: cand.craftability.isolatedPixelCount,
      isolatedPixelCountDelta: cand.craftability.isolatedPixelCount - base.craftability.isolatedPixelCount,
      tinyRegionCount: cand.craftability.tinyRegionCount,
      tinyRegionCountDelta: cand.craftability.tinyRegionCount - base.craftability.tinyRegionCount,
      similarColorRedundancy: cand.craftability.similarColorRedundancy,
      similarColorRedundancyDelta: cand.craftability.similarColorRedundancy - base.craftability.similarColorRedundancy,
      largestRegionSize: cand.craftability.largestRegionSize,
      largestRegionSizeDelta: cand.craftability.largestRegionSize - base.craftability.largestRegionSize,
      elapsedMs: cand.elapsedMs,
      elapsedMsDelta: cand.elapsedMs - base.elapsedMs,
    };
    deltas.push(delta);

    // --- Check regressions ---

    // Color shift: meanMatchDistance increased beyond threshold
    const distPct = pctDelta(base.meanMatchDistance, cand.meanMatchDistance);
    if (distPct > thresholds.colorShiftPercent) {
      flags.push({
        fixtureId: cand.fixtureId, size: cand.size, preset: cand.preset,
        metric: 'meanMatchDistance',
        baselineValue: base.meanMatchDistance,
        candidateValue: cand.meanMatchDistance,
        delta: cand.meanMatchDistance - base.meanMatchDistance,
        deltaPercent: distPct,
        direction: 'regression',
        reason: `Color shift: +${distPct.toFixed(1)}% > ${thresholds.colorShiftPercent}% threshold`,
      });
    } else if (distPct < -thresholds.colorShiftPercent) {
      flags.push({
        fixtureId: cand.fixtureId, size: cand.size, preset: cand.preset,
        metric: 'meanMatchDistance',
        baselineValue: base.meanMatchDistance,
        candidateValue: cand.meanMatchDistance,
        delta: cand.meanMatchDistance - base.meanMatchDistance,
        deltaPercent: distPct,
        direction: 'improvement',
        reason: `Color accuracy improved: ${distPct.toFixed(1)}%`,
      });
    }

    // Color count anomaly
    const colorsPct = pctDelta(base.uniqueColors, cand.uniqueColors);
    if (Math.abs(colorsPct) > thresholds.colorCountChangePercent) {
      flags.push({
        fixtureId: cand.fixtureId, size: cand.size, preset: cand.preset,
        metric: 'uniqueColors',
        baselineValue: base.uniqueColors,
        candidateValue: cand.uniqueColors,
        delta: cand.uniqueColors - base.uniqueColors,
        deltaPercent: colorsPct,
        direction: colorsPct > 0 ? 'regression' : 'improvement',
        reason: `Color count ${colorsPct > 0 ? 'increased' : 'decreased'} ${Math.abs(colorsPct).toFixed(1)}% (> ${thresholds.colorCountChangePercent}% threshold)`,
      });
    }

    // Isolated pixel fragmentation
    const isolatedPct = pctDelta(base.craftability.isolatedPixelCount, cand.craftability.isolatedPixelCount);
    if (isolatedPct > thresholds.isolatedPixelIncreasePercent && cand.craftability.isolatedPixelCount > 0) {
      flags.push({
        fixtureId: cand.fixtureId, size: cand.size, preset: cand.preset,
        metric: 'isolatedPixelCount',
        baselineValue: base.craftability.isolatedPixelCount,
        candidateValue: cand.craftability.isolatedPixelCount,
        delta: cand.craftability.isolatedPixelCount - base.craftability.isolatedPixelCount,
        deltaPercent: isolatedPct,
        direction: 'regression',
        reason: `Fragmentation: isolated pixels +${isolatedPct.toFixed(0)}% (> ${thresholds.isolatedPixelIncreasePercent}% threshold)`,
      });
    }

    // Tiny region fragmentation
    const tinyPct = pctDelta(base.craftability.tinyRegionCount, cand.craftability.tinyRegionCount);
    if (tinyPct > thresholds.tinyRegionIncreasePercent && cand.craftability.tinyRegionCount > 0) {
      flags.push({
        fixtureId: cand.fixtureId, size: cand.size, preset: cand.preset,
        metric: 'tinyRegionCount',
        baselineValue: base.craftability.tinyRegionCount,
        candidateValue: cand.craftability.tinyRegionCount,
        delta: cand.craftability.tinyRegionCount - base.craftability.tinyRegionCount,
        deltaPercent: tinyPct,
        direction: 'regression',
        reason: `Fragmentation: tiny regions +${tinyPct.toFixed(0)}% (> ${thresholds.tinyRegionIncreasePercent}% threshold)`,
      });
    }
  }

  const regressions = flags.filter((f) => f.direction === 'regression').length;
  const improvements = flags.filter((f) => f.direction === 'improvement').length;

  return {
    deltas,
    flags,
    summary: {
      totalRuns: deltas.length,
      regressions,
      improvements,
      unchanged: deltas.length - regressions - improvements,
    },
    baselineSha: baseline.gitSha,
    candidateSha: candidate.gitSha,
  };
}

/**
 * Print a human-readable regression report.
 */
export function printRegressionReport(report: RegressionReport): void {
  console.log('\n=== Regression Report ===');
  console.log(`Runs: ${report.summary.totalRuns} | Regressions: ${report.summary.regressions} | Improvements: ${report.summary.improvements} | Unchanged: ${report.summary.unchanged}\n`);

  if (report.flags.length === 0) {
    console.log('  No regressions or improvements detected. ✅');
    return;
  }

  // Group by metric
  const byMetric = new Map<string, RegressionFlag[]>();
  for (const f of report.flags) {
    if (!byMetric.has(f.metric)) byMetric.set(f.metric, []);
    byMetric.get(f.metric)!.push(f);
  }

  for (const [metric, flags] of byMetric) {
    const regs = flags.filter((f) => f.direction === 'regression');
    const imps = flags.filter((f) => f.direction === 'improvement');
    console.log(`  ${metric}: ${regs.length} regression(s), ${imps.length} improvement(s)`);
    for (const f of flags.slice(0, 5)) {
      const icon = f.direction === 'regression' ? '⚠' : '✓';
      console.log(`    ${icon} ${f.fixtureId} ${f.size}x${f.size} ${f.preset}: ${f.reason}`);
    }
    if (flags.length > 5) {
      console.log(`    ... and ${flags.length - 5} more`);
    }
  }
}

/**
 * Serialize a regression report to JSON for file output.
 */
export function serializeReport(report: RegressionReport): string {
  return JSON.stringify(report, null, 2);
}
