/**
 * Image Adapter — the only place where wx.* Canvas APIs touch image data
 * before passing it to the pure Bead Engine.
 *
 * Responsibilities:
 * - Read image via wx.chooseMedia / wx.getImageInfo
 * - Handle EXIF orientation
 * - Downsample large images to protect memory
 * - Extract pixel data via Canvas getImageData
 * - Return a standard PixelMatrix for the Engine
 */

import type { PixelMatrix, Pixel } from '../engine/image';

/** Maximum source dimension before downsampling kicks in. */
const MAX_SOURCE_DIMENSION = 512;

/**
 * Downsample an image if either dimension exceeds MAX_SOURCE_DIMENSION,
 * preserving aspect ratio.  This protects mobile memory and prevents
 * the Engine from processing unnecessarily large images.
 */
function calculateDownsample(
  width: number,
  height: number
): { width: number; height: number; needsDownsample: boolean } {
  if (width <= MAX_SOURCE_DIMENSION && height <= MAX_SOURCE_DIMENSION) {
    return { width, height, needsDownsample: false };
  }

  const scale = Math.min(
    MAX_SOURCE_DIMENSION / width,
    MAX_SOURCE_DIMENSION / height
  );
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    needsDownsample: true,
  };
}

/**
 * Read an image file and convert it to a PixelMatrix suitable for the Engine.
 *
 * @param src - temp file path from wx.chooseMedia
 * @param canvas - a wx Canvas node (type="2d")
 * @returns Promise resolving to a PixelMatrix
 */
export function readImageToPixelMatrix(
  src: string,
  canvas: any
): Promise<PixelMatrix> {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: (imgInfo: any) => {
        // wx.getImageInfo returns orientation; for type=="2d" canvas,
        // the image is already oriented when drawn via drawImage.
        const originalWidth = imgInfo.width;
        const originalHeight = imgInfo.height;

        const target = calculateDownsample(originalWidth, originalHeight);

        const ctx = canvas.getContext('2d');
        const img = canvas.createImage();

        img.onload = () => {
          // Set canvas to target (possibly downsampled) size.
          canvas.width = target.width;
          canvas.height = target.height;

          // Draw image at target size — drawImage handles resampling.
          ctx.drawImage(img, 0, 0, target.width, target.height);

          // Extract pixel data.
          const imageData = ctx.getImageData(0, 0, target.width, target.height);
          const data = imageData.data;
          const pixels: Pixel[][] = [];

          for (let y = 0; y < target.height; y++) {
            const row: Pixel[] = [];
            for (let x = 0; x < target.width; x++) {
              const idx = (y * target.width + x) * 4;
              row.push({
                r: data[idx],
                g: data[idx + 1],
                b: data[idx + 2],
                a: data[idx + 3],
              });
            }
            pixels.push(row);
          }

          resolve({
            width: target.width,
            height: target.height,
            pixels,
          });
        };

        img.onerror = () => reject(new Error('图片加载失败，可能格式不支持'));
        img.src = src;
      },
      fail: () => reject(new Error('读取图片信息失败')),
    });
  });
}

/**
 * Validate that a PixelMatrix is non-empty and has consistent dimensions.
 */
export function validatePixelMatrix(matrix: PixelMatrix): void {
  if (!matrix.width || !matrix.height || matrix.width <= 0 || matrix.height <= 0) {
    throw new Error('图片尺寸无效');
  }
  if (!matrix.pixels || matrix.pixels.length !== matrix.height) {
    throw new Error('图片数据不完整');
  }
  for (let y = 0; y < matrix.height; y++) {
    if (!matrix.pixels[y] || matrix.pixels[y].length !== matrix.width) {
      throw new Error(`第 ${y} 行像素数据不完整`);
    }
  }
}
