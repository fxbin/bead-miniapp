import type { LinearRGBColor, RGBColor } from './types';

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError('Color channel must be a finite number');
  }
  return Math.min(1, Math.max(0, value));
}

export function clamp255(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError('Color channel must be a finite number');
  }
  return Math.min(255, Math.max(0, value));
}

export function srgbChannelToLinear(channel255: number): number {
  const encoded = clamp255(channel255) / 255;
  return encoded <= 0.04045
    ? encoded / 12.92
    : Math.pow((encoded + 0.055) / 1.055, 2.4);
}

export function linearChannelToSrgb(channel: number): number {
  const linear = clamp01(channel);
  const encoded = linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;

  return encoded * 255;
}

export function srgbToLinear(rgb: RGBColor): LinearRGBColor {
  return {
    r: srgbChannelToLinear(rgb.r),
    g: srgbChannelToLinear(rgb.g),
    b: srgbChannelToLinear(rgb.b),
  };
}

export function linearToSrgb(rgb: LinearRGBColor): RGBColor {
  return {
    r: linearChannelToSrgb(rgb.r),
    g: linearChannelToSrgb(rgb.g),
    b: linearChannelToSrgb(rgb.b),
  };
}
