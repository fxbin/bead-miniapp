export interface Pixel {
  r: number;
  g: number;
  b: number;
  /** Alpha channel in the inclusive 0..255 range. Omitted means fully opaque. */
  a?: number;
}

export interface PixelMatrix {
  width: number;
  height: number;
  pixels: Pixel[][];
}

export type SamplingStrategy = 'nearest';

export interface ResizeOptions {
  width: number;
  height: number;
  /**
   * Sampling is intentionally explicit so higher-quality strategies can be
   * benchmarked later without changing downstream APIs.
   */
  strategy?: SamplingStrategy;
}
