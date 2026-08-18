export interface RGBColor {
  /** sRGB channels in the inclusive 0..255 range. */
  r: number;
  g: number;
  b: number;
}

export interface LinearRGBColor {
  /** Linear-light sRGB channels, normally in the 0..1 range. */
  r: number;
  g: number;
  b: number;
}

export interface XYZColor {
  /** CIE XYZ using D65 white, normalized so reference white Y = 1. */
  x: number;
  y: number;
  z: number;
}

export interface LabColor {
  /** CIELAB using D65 reference white. */
  L: number;
  a: number;
  b: number;
}

export interface OKLabColor {
  L: number;
  a: number;
  b: number;
}

export type ColorDistanceStrategy = 'rgb' | 'lab76' | 'ciede2000' | 'oklab';
