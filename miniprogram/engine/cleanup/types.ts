import type { BeadCell } from '../types';

/**
 * Options for the small-region / isolated-pixel cleanup pass.
 */
export interface CleanupOptions {
  /** Enable the cleanup pass. */
  enabled?: boolean;
  /**
   * Maximum connected-region area (in cells) considered "tiny" and
   * eligible for replacement.  Default: 2.
   */
  maxTinyRegionSize?: number;
  /**
   * Neighborhood connectivity: 4 (von Neumann) or 8 (Moore).
   * Default: 8.
   */
  connectivity?: 4 | 8;
  /**
   * cleanupLevel maps to product-level presets:
   * 0 = off, 1 = light, 2 = medium (default), 3 = aggressive.
   * Internally controls maxTinyRegionSize and iteration count.
   */
  cleanupLevel?: 0 | 1 | 2 | 3;
  /**
   * Optional protection mask (from edge protection).  When provided,
   * cells where mask[y][x] === true are skipped during cleanup.
   */
  protectionMask?: boolean[][];
  /**
   * Weight added to a region's effective size for each protected cell
   * it contains.  Default: 3.
   */
  protectionWeight?: number;
}

export interface CleanupDiagnostics {
  /** Number of isolated pixels (single-cell regions) before cleanup. */
  isolatedPixelCountBefore: number;
  /** Number of isolated pixels after cleanup. */
  isolatedPixelCountAfter: number;
  /** Number of tiny regions (<= maxTinyRegionSize) before cleanup. */
  tinyRegionCountBefore: number;
  /** Number of tiny regions after cleanup. */
  tinyRegionCountAfter: number;
  /** Total cells replaced. */
  cellsReplaced: number;
  /** Number of cleanup iterations performed. */
  iterations: number;
}

export interface CleanupResult {
  grid: BeadCell[][];
  diagnostics: CleanupDiagnostics;
}

/**
 * Internal representation of a connected region.
 */
export interface ConnectedRegion {
  colorCode: string;
  cells: Array<{ x: number; y: number }>;
  size: number;
}
