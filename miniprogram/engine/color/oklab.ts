import { srgbToLinear } from './srgb';
import type { LinearRGBColor, OKLabColor, RGBColor } from './types';

/**
 * Linear sRGB -> OKLab conversion using Björn Ottosson's published matrices.
 */
export function linearSrgbToOklab(rgb: LinearRGBColor): OKLabColor {
  const l = 0.4122214708 * rgb.r + 0.5363325363 * rgb.g + 0.0514459929 * rgb.b;
  const m = 0.2119034982 * rgb.r + 0.6806995451 * rgb.g + 0.1073969566 * rgb.b;
  const s = 0.0883024619 * rgb.r + 0.2817188376 * rgb.g + 0.6299787005 * rgb.b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    L: 0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot,
  };
}

export function srgbToOklab(rgb: RGBColor): OKLabColor {
  return linearSrgbToOklab(srgbToLinear(rgb));
}
