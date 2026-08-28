import type { PreparedColor, RGBColor } from '../color';

export type BeadMaterial = 'normal' | 'metallic' | 'transparent' | 'fluorescent' | 'glow' | 'other';
export type PaletteConfidence = 'official-digital' | 'verified' | 'community' | 'estimated';
export type CalibrationLevel = 'L0' | 'L1' | 'L2';

export interface BeadColorDefinition {
  code: string;
  name: string;
  /** Official digital RGB from the brand color chart (display reference). */
  rgb: RGBColor;
  /** Calibrated RGB from physical measurement under controlled conditions (L2). Undefined when no physical calibration has been done. */
  calibratedRGB?: RGBColor;
  material?: BeadMaterial;
  available?: boolean;
  confidence?: PaletteConfidence;
  /** When true, the color is excluded from matching (deprecated, unreliable, or special material). */
  deprecated?: boolean;
  /** Source attribution for this specific color entry (e.g. 'official-chart', 'cross-verified', 'community-report'). */
  source?: string;
  notes?: string;
}

/** Trust level for a color entry, used by the matcher to downrank or exclude. */
export type ColorTrustLevel = 'trusted' | 'low-confidence' | 'untrusted';

/** Audit finding for a single color entry. */
export interface ColorAuditFinding {
  code: string;
  issue: 'out-of-range' | 'duplicate-rgb' | 'near-duplicate' | 'special-material' | 'manual-exclusion' | 'suspicious-value';
  detail: string;
  trust: ColorTrustLevel;
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
