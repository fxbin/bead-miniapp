import { preparedColorDistance } from '../color';
import type { ColorDistanceStrategy, PreparedColor } from '../color';
import type { PreparedBeadColor } from '../palette';
import type { MergeOptions, MergeResult, MergePair, MergeDiagnostics } from './types';

/**
 * Build a list of candidate merge pairs by computing pairwise perceptual
 * distances among palette colors that are actually in use.
 *
 * Pairs are sorted by:
 *   1. perceptual distance ascending (closest colors first)
 *   2. combined usage descending (merge low-usage colors first)
 */
function buildMergePairs(
  colors: PreparedBeadColor[],
  usage: Map<string, number>,
  strategy: ColorDistanceStrategy,
  threshold: number
): MergePair[] {
  const pairs: MergePair[] = [];

  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const a = colors[i];
      const b = colors[j];
      const distance = preparedColorDistance(a.prepared, b.prepared, strategy);
      if (distance <= threshold) {
        const usageA = usage.get(a.code) ?? 0;
        const usageB = usage.get(b.code) ?? 0;
        // Keep the higher-usage color, merge the lower-usage one.
        const [keep, merge] = usageA >= usageB ? [a, b] : [b, a];
        pairs.push({
          keep: keep.code,
          merge: merge.code,
          distance,
          combinedUsage: usageA + usageB,
        });
      }
    }
  }

  // Sort by distance ascending, then by combinedUsage descending.
  pairs.sort((x, y) => {
    if (x.distance !== y.distance) return x.distance - y.distance;
    return y.combinedUsage - x.combinedUsage;
  });

  return pairs;
}

/**
 * Compute the perceptual cost of replacing `from` with `to`.
 */
function mergeCost(
  from: PreparedColor,
  to: PreparedColor,
  strategy: ColorDistanceStrategy,
  count: number
): number {
  return preparedColorDistance(from, to, strategy) * count;
}

/**
 * Merge similar colors in the palette based on perceptual distance and usage.
 *
 * Two strategies are supported:
 * - **Threshold merge**: when `enabled` is true, all pairs whose perceptual
 *   distance <= `mergeThreshold` are candidates for merging.
 * - **maxColors hard constraint**: after threshold merging, if the remaining
 *   color count exceeds `maxColors`, the lowest-usage colors are merged into
 *   their nearest remaining neighbor until the count is within the cap.
 *
 * The function returns the reduced color list plus a remap table so the caller
 * can update the grid and usage statistics.
 */
export function mergePaletteColors(
  colors: PreparedBeadColor[],
  usage: Map<string, number>,
  strategy: ColorDistanceStrategy,
  options: MergeOptions
): MergeResult {
  // Threshold merge only runs when explicitly enabled or when a mergeThreshold is provided.
  const thresholdEnabled = options.enabled === true || options.mergeThreshold !== undefined;
  // OKLab Euclidean distance for sRGB colors ranges roughly 0..1.
  // 0.05 is a conservative default for "visually very similar".
  const threshold = options.mergeThreshold ?? 0.05;
  const maxColors = options.maxColors;

  const uniqueBefore = colors.length;
  const remap: Record<string, string> = {};

  // Build a working set: code -> PreparedBeadColor, plus a mutable usage map.
  const workingColors = new Map<string, PreparedBeadColor>(colors.map((c) => [c.code, c]));
  const workingUsage = new Map<string, number>(usage);

  if (thresholdEnabled) {
    // Phase 1: threshold-based similar-color merge
    const pairs = buildMergePairs(
      Array.from(workingColors.values()),
      workingUsage,
      strategy,
      threshold
    );

    for (const pair of pairs) {
      // Skip if either color was already merged away.
      if (!workingColors.has(pair.merge) || !workingColors.has(pair.keep)) continue;

      // Apply the merge.
      workingColors.delete(pair.merge);
      workingUsage.set(pair.keep, (workingUsage.get(pair.keep) ?? 0) + (workingUsage.get(pair.merge) ?? 0));
      workingUsage.delete(pair.merge);
      remap[pair.merge] = pair.keep;

      // Also update any existing remap targets that pointed to the merged color.
      for (const key of Object.keys(remap)) {
        if (remap[key] === pair.merge) {
          remap[key] = pair.keep;
        }
      }
    }
  }

  // Phase 2: maxColors hard constraint -- merge lowest-usage colors first.
  if (maxColors !== undefined && maxColors > 0) {
    while (workingColors.size > maxColors) {
      // Find the lowest-usage color.
      let lowestCode: string | null = null;
      let lowestUsage = Infinity;
      for (const [code, count] of workingUsage) {
        if (count < lowestUsage) {
          lowestUsage = count;
          lowestCode = code;
        }
      }

      if (lowestCode === null) break;
      const lowestColor = workingColors.get(lowestCode)!;

      // Find the nearest remaining color.
      let nearestCode: string | null = null;
      let nearestDistance = Infinity;
      for (const [code, color] of workingColors) {
        if (code === lowestCode) continue;
        const dist = preparedColorDistance(lowestColor.prepared, color.prepared, strategy);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestCode = code;
        }
      }

      if (nearestCode === null) break;

      // Apply the forced merge.
      workingColors.delete(lowestCode);
      workingUsage.set(nearestCode, (workingUsage.get(nearestCode) ?? 0) + (workingUsage.get(lowestCode) ?? 0));
      workingUsage.delete(lowestCode);
      remap[lowestCode] = nearestCode;

      // Chain-update existing remap entries.
      for (const key of Object.keys(remap)) {
        if (remap[key] === lowestCode) {
          remap[key] = nearestCode;
        }
      }
    }
  }

  // Compute total merge cost.
  let totalCost = 0;
  const originalColorMap = new Map(colors.map((c) => [c.code, c]));
  for (const [from, to] of Object.entries(remap)) {
    const fromColor = originalColorMap.get(from);
    const toColor = originalColorMap.get(to);
    if (fromColor && toColor) {
      const count = usage.get(from) ?? 0;
      totalCost += mergeCost(fromColor.prepared, toColor.prepared, strategy, count);
    }
  }

  const diagnostics: MergeDiagnostics = {
    uniqueColorsBefore: uniqueBefore,
    uniqueColorsAfter: workingColors.size,
    mergeCost: totalCost,
    remap,
  };

  return {
    colors: Array.from(workingColors.values()),
    diagnostics,
  };
}
