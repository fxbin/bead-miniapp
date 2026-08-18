import type { GeneratePatternOptions, PatternResult } from './types';

/**
 * Bead Engine entry point.
 *
 * The first implementation will progressively add:
 * image preprocessing,
 * palette mapping,
 * color optimization,
 * and pattern generation.
 */
export function generatePattern(
  _imageData: unknown,
  _options: GeneratePatternOptions
): PatternResult {
  throw new Error('Bead Engine baseline not implemented yet');
}
