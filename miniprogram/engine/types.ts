export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface BeadColor {
  brand: string;
  code: string;
  name: string;
  rgb: RGBColor;
  lab?: [number, number, number];
  oklab?: [number, number, number];
}

export interface GeneratePatternOptions {
  width: number;
  height: number;
  paletteId: string;
  maxColors: number;
  detailLevel: number;
  cleanupLevel: number;
  mergeSimilarColors: boolean;
  protectEdges: boolean;
}

export interface BeadCell {
  colorCode: string;
}

export interface PatternResult {
  width: number;
  height: number;
  grid: BeadCell[][];
  paletteUsage: Record<string, number>;
}
