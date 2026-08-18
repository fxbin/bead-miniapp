import { deltaE76, deltaE2000, oklabDistance, rgbDistance } from './distance';
import { srgbToLab } from './lab';
import { srgbToOklab } from './oklab';
import type { ColorDistanceStrategy, LabColor, OKLabColor, RGBColor } from './types';

export interface PreparedColor {
  rgb: RGBColor;
  lab: LabColor;
  oklab: OKLabColor;
}

export function prepareColor(rgb: RGBColor): PreparedColor {
  const normalized = {
    r: Math.min(255, Math.max(0, rgb.r)),
    g: Math.min(255, Math.max(0, rgb.g)),
    b: Math.min(255, Math.max(0, rgb.b)),
  };

  return {
    rgb: normalized,
    lab: srgbToLab(normalized),
    oklab: srgbToOklab(normalized),
  };
}

export function preparedColorDistance(
  left: PreparedColor,
  right: PreparedColor,
  strategy: ColorDistanceStrategy
): number {
  switch (strategy) {
    case 'rgb':
      return rgbDistance(left.rgb, right.rgb);
    case 'lab76':
      return deltaE76(left.lab, right.lab);
    case 'ciede2000':
      return deltaE2000(left.lab, right.lab);
    case 'oklab':
      return oklabDistance(left.oklab, right.oklab);
    default: {
      const exhaustiveCheck: never = strategy;
      throw new Error(`Unsupported color distance strategy: ${exhaustiveCheck}`);
    }
  }
}
