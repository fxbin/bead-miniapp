export interface Pixel {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface PixelMatrix {
  width: number;
  height: number;
  pixels: Pixel[][];
}

export interface ResizeOptions {
  width: number;
  height: number;
  preserveAspectRatio?: boolean;
}
