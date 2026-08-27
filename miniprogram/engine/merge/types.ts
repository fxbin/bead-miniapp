import type { PreparedBeadColor } from '../palette';

/**
 * Options for the palette-level similar-color merge pass.
 */
export interface MergeOptions {
  /**
   * Hard cap on the number of unique colors allowed in the output grid.
   * When set, colors are merged greedily (lowest-usage-first) until the
   * count is at or below this value.
   */
  maxColors?: number;
  /**
   * Perceptual distance threshold below which two palette colors are
   * considered "redundant" candidates for merging.  Only applied when
   * `mergeSimilarColors` is enabled or `maxColors` forces a reduction.
   */
  mergeThreshold?: number;
  /** Whether to run the similar-color merge pass at all. */
  enabled?: boolean;
}

export interface MergeDiagnostics {
  /** Number of unique colors before the merge pass. */
  uniqueColorsBefore: number;
  /** Number of unique colors after the merge pass. */
  uniqueColorsAfter: number;
  /** Total perceptual reconstruction error introduced by merging. */
  mergeCost: number;
  /** Map from original color code -> replacement color code. */
  remap: Record<string, string>;
}

export interface MergeResult {
  /** The palette with similar colors merged (colors list reduced). */
  colors: PreparedBeadColor[];
  /** Diagnostics about what was merged. */
  diagnostics: MergeDiagnostics;
}

/**
 * A pair of palette colors that are candidates for merging,
 * sorted by merge cost (ascending = cheapest first).
 */
export interface MergePair {
  keep: string;
  merge: string;
  distance: number;
  /** Combined usage count (how many cells use either color). */
  combinedUsage: number;
}
