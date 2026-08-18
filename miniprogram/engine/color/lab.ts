import { srgbToLinear } from './srgb';
import type { LabColor, RGBColor, XYZColor } from './types';

const D65 = {
  x: 0.95047,
  y: 1,
  z: 1.08883,
};

export function linearSrgbToXyz(rgb: ReturnType<typeof srgbToLinear>): XYZColor {
  return {
    x: 0.4124564 * rgb.r + 0.3575761 * rgb.g + 0.1804375 * rgb.b,
    y: 0.2126729 * rgb.r + 0.7151522 * rgb.g + 0.0721750 * rgb.b,
    z: 0.0193339 * rgb.r + 0.1191920 * rgb.g + 0.9503041 * rgb.b,
  };
}

function labPivot(value: number): number {
  const delta = 6 / 29;
  const deltaCubed = delta * delta * delta;

  return value > deltaCubed
    ? Math.cbrt(value)
    : value / (3 * delta * delta) + 4 / 29;
}

export function xyzToLab(xyz: XYZColor): LabColor {
  const fx = labPivot(xyz.x / D65.x);
  const fy = labPivot(xyz.y / D65.y);
  const fz = labPivot(xyz.z / D65.z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export function srgbToLab(rgb: RGBColor): LabColor {
  return xyzToLab(linearSrgbToXyz(srgbToLinear(rgb)));
}
