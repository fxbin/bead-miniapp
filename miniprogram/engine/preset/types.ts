/**
 * Product-level preset for the bead pattern generation.
 */
export type PatternPreset = 'easy' | 'balanced' | 'fidelity';

/**
 * Fidelity diagnostics: how well the pattern represents the original image.
 */
export interface FidelityDiagnostics {
  /** Average perceptual color distance between the pattern and the target. */
  meanReconstructionError: number;
  /** Maximum perceptual color distance in any single cell. */
  maxReconstructionError: number;
  /** Edge preservation ratio: fraction of high-contrast edges retained. */
  edgePreservationRatio: number;
}

/**
 * Craftability diagnostics: how easy the pattern is to physically assemble.
 */
export interface CraftabilityDiagnostics {
  /** Number of unique bead colors in the pattern. */
  uniqueColorCount: number;
  /** Number of similar-color pairs (perceptual distance < 0.05). */
  similarColorRedundancy: number;
  /** Number of isolated pixels (single-cell regions). */
  isolatedPixelCount: number;
  /** Number of tiny regions (size <= 4). */
  tinyRegionCount: number;
  /** Size of the largest connected region. */
  largestRegionSize: number;
  /** Median connected region size. */
  medianRegionSize: number;
}

/**
 * Per-stage timing information.
 */
export interface StageTiming {
  resize: number;
  match: number;
  merge: number;
  edgeProtection: number;
  cleanup: number;
  total: number;
}

/**
 * Combined quality diagnostics.
 */
export interface QualityDiagnostics {
  fidelity: FidelityDiagnostics;
  craftability: CraftabilityDiagnostics;
  timing: StageTiming;
}

/**
 * Preset parameter mapping.
 */
export interface PresetParameters {
  maxColors?: number;
  mergeSimilarColors: boolean;
  mergeThreshold?: number;
  cleanupLevel: 0 | 1 | 2 | 3;
  detailLevel: number;
  protectEdges: boolean;
}

/**
 * Resolve a product preset to internal parameters.
 *
 * v0.2 recalibration (#40): parameters tuned against golden benchmark (#38)
 * to ensure visible differentiation between presets across all grid sizes.
 *
 * Key findings from benchmark:
 * - Programmatic fixtures have few unique colors (3-4), so preset differences
 *   mainly manifest on real photos with broader color distributions.
 * - easy and balanced were nearly identical on programmatic fixtures;
 *   lowering easy's maxColors to 16 and raising mergeThreshold to 0.10
 *   creates clear separation.
 * - fidelity's no-merge + no-cap + minimal cleanup produces more isolated
 *   pixels (avg 11 at 64x64), which is expected for maximum detail retention.
 */
export function resolvePreset(preset: PatternPreset): PresetParameters {
  switch (preset) {
    case 'easy':
      return {
        maxColors: 16,
        mergeSimilarColors: true,
        mergeThreshold: 0.10,
        cleanupLevel: 3,
        detailLevel: 1,
        protectEdges: true,
      };
    case 'balanced':
      return {
        maxColors: 32,
        mergeSimilarColors: true,
        mergeThreshold: 0.06,
        cleanupLevel: 2,
        detailLevel: 2,
        protectEdges: true,
      };
    case 'fidelity':
      return {
        maxColors: undefined, // no hard cap
        mergeSimilarColors: false,
        cleanupLevel: 1,
        detailLevel: 3,
        protectEdges: true,
      };
    default: {
      const exhaustive: never = preset;
      throw new Error(`Unknown preset: ${exhaustive}`);
    }
  }
}
