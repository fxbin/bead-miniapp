import type { ColorDistanceStrategy, RGBColor } from './color';
import type { SamplingStrategy } from './image';

export interface GeneratePatternOptions {
  width: number;
  height: number;
  paletteId: string;
  samplingStrategy?: SamplingStrategy;
  matcherStrategy?: ColorDistanceStrategy;
  background?: RGBColor;

  /** M1 controls. Optional until their implementation issues are completed. */
  maxColors?: number;
  detailLevel?: number;
  cleanupLevel?: number;
  mergeSimilarColors?: boolean;
  protectEdges?: boolean;
}

export interface BeadCell {
  colorCode: string;
}

export interface PatternDiagnostics {
  matcherStrategy: ColorDistanceStrategy;
  samplingStrategy: SamplingStrategy;
  meanMatchDistance: number;
}

export interface PatternResult {
  width: number;
  height: number;
  paletteId: string;
  grid: BeadCell[][];
  paletteUsage: Record<string, number>;
  totalBeads: number;
  uniqueColors: number;
  diagnostics: PatternDiagnostics;
}
