import type { PreparedColor, RGBColor } from '../color';

export type BeadMaterial = 'normal' | 'metallic' | 'transparent' | 'fluorescent' | 'glow' | 'other';
export type PaletteConfidence = 'official-digital' | 'verified' | 'community' | 'estimated';
export type CalibrationLevel = 'L0' | 'L1' | 'L2';

export interface BeadColorDefinition {
  code: string;
  name: string;
  rgb: RGBColor;
  material?: BeadMaterial;
  available?: boolean;
  confidence?: PaletteConfidence;
  notes?: string;
}

export interface PaletteDataIssue {
  code: string;
  reason: string;
  rawValue?: string;
}

export interface BeadPalette {
  id: string;
  brand: string;
  series: string;
  version: string;
  calibrationLevel: CalibrationLevel;
  sourceLabel: string;
  colors: BeadColorDefinition[];
  excluded?: PaletteDataIssue[];
  notes?: string[];
}

export interface PreparedBeadColor extends BeadColorDefinition {
  prepared: PreparedColor;
}

export interface PreparedBeadPalette extends Omit<BeadPalette, 'colors'> {
  colors: PreparedBeadColor[];
}
