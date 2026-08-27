import type { BeadCell } from '../types';
import type { PreparedColor } from '../color';

/**
 * Options for edge / structure protection.
 */
export interface EdgeProtectionOptions {
  /** Enable the edge protection pass. */
  enabled?: boolean;
  /**
   * Perceptual distance threshold above which two adjacent cells
   * are considered an "edge".  Default: 0.15 (OKLab scale ~0..1).
   */
  edgeThreshold?: number;
  /**
   * Local contrast window radius.  1 means a 3x3 window centered
   * on each cell.  Default: 1.
   */
  windowRadius?: number;
  /**
   * Weight applied to protected cells during cleanup: a protected cell
   * receives this many "bonus" region-size points, making it harder
   * to be cleaned up.  Default: 3.
   */
  protectionWeight?: number;
}

export interface EdgeProtectionDiagnostics {
  /** Number of cells flagged as edge / high-contrast. */
  protectedCellCount: number;
  /** Total cells in the grid. */
  totalCells: number;
  /** Fraction of cells protected (0..1). */
  protectedFraction: number;
}

export interface EdgeProtectionResult {
  /** Boolean mask: true = protected, aligned with grid[y][x]. */
  mask: boolean[][];
  diagnostics: EdgeProtectionDiagnostics;
}

/**
 * A color lookup map: colorCode -> PreparedColor.
 * Used by the edge protection to compute perceptual distances between cells.
 */
export type ColorLookup = Map<string, PreparedColor>;
