/**
 * Image Adapter — the only place where wx.* Canvas APIs touch image data
 * before passing it to the pure Bead Engine.
 *
 * Responsibilities:
 * - Read image via wx.chooseMedia / wx.getImageInfo
 * - Handle EXIF orientation
 * - Downsample large images to protect memory
 * - Validate extreme aspect ratios and total pixel counts
 * - Extract pixel data via Canvas getImageData
 * - Provide user-friendly error messages
 * - Return a standard PixelMatrix for the Engine
 *
 * v0.2 robustness improvements (#51):
 * - Extreme aspect ratio guard (reject >10:1 ratio)
 * - Total pixel count guard (reject >50MP original)
 * - Canvas getImageData try/catch with specific error
 * - EXIF orientation handled via wx.getImageInfo + canvas transform
 * - User-friendly error classification
 */

import type { PixelMatrix, Pixel } from '../engine/image';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum source dimension before downsampling kicks in. */
const MAX_SOURCE_DIMENSION = 512;

/** Maximum total pixels in the original image before we reject it. */
const MAX_TOTAL_PIXELS = 50_000_000; // ~50MP (e.g. 7000x7000)

/** Maximum aspect ratio before we reject as extreme. */
const MAX_ASPECT_RATIO = 10;

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

export type ImageErrorType =
  | 'format-unsupported'
  | 'too-large'
  | 'extreme-ratio'
  | 'decode-failed'
  | 'canvas-failed'
  | 'unknown';

export class ImageAdapterError extends Error {
  constructor(
    public readonly type: ImageErrorType,
    message: string,
  ) {
    super(message);
    this.name = 'ImageAdapterError';
  }
}

// ---------------------------------------------------------------------------
// Downsampling
// ---------------------------------------------------------------------------

export function calculateDownsample(
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
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    needsDownsample: true,
  };
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Validate image dimensions before attempting to decode.
 * Throws ImageAdapterError with user-friendly message on failure.
 */
export function validateImageDimensions(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new ImageAdapterError('decode-failed', '图片尺寸无效，可能已损坏');
  }

  const totalPixels = width * height;
  if (totalPixels > MAX_TOTAL_PIXELS) {
    throw new ImageAdapterError(
      'too-large',
      `图片过大（${width}×${height}），请使用较小尺寸的图片`,
    );
  }

  const ratio = Math.max(width, height) / Math.min(width, height);
  if (ratio > MAX_ASPECT_RATIO) {
    throw new ImageAdapterError(
      'extreme-ratio',
      `图片长宽比过大（${ratio.toFixed(1)}:1），请裁剪后重试`,
    );
  }
}

// ---------------------------------------------------------------------------
// EXIF orientation
// ---------------------------------------------------------------------------

/**
 * Apply EXIF orientation to canvas context if needed.
 * wx.getImageInfo returns an orientation value (1-8, EXIF standard).
 * For type="2d" canvas, drawImage may auto-apply orientation,
 * but some platforms don't. This handles it explicitly.
 */
function applyExifOrientation(
  ctx: any,
  img: any,
  orientation: number,
  drawWidth: number,
  drawHeight: number,
): void {
  // If orientation is missing or 1 (normal), just draw normally.
  if (!orientation || orientation === 1) {
    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
    return;
  }

  // For EXIF orientations 2-8, we need to transform the canvas.
  // We set up the transform, then draw the image at (0,0) with target size.
  // The canvas has already been set to (drawWidth, drawHeight).
  switch (orientation) {
    case 2: // flip horizontal
      ctx.translate(drawWidth, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // 180°
      ctx.translate(drawWidth, drawHeight);
      ctx.scale(-1, -1);
      break;
    case 4: // flip vertical
      ctx.translate(0, drawHeight);
      ctx.scale(1, -1);
      break;
    case 5: // transpose (flip horizontal + 90° CW)
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6: // 90° CW
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -drawHeight);
      break;
    case 7: // transverse (flip horizontal + 90° CCW)
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -drawHeight);
      ctx.scale(-1, 1);
      break;
    case 8: // 90° CCW
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-drawWidth, 0);
      break;
    default:
      // Unknown orientation, draw normally.
      break;
  }
  ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
}

// ---------------------------------------------------------------------------
// Main read function
// ---------------------------------------------------------------------------

/**
 * Read an image file and convert it to a PixelMatrix suitable for the Engine.
 *
 * @param src - temp file path from wx.chooseMedia
 * @param canvas - a wx Canvas node (type="2d")
 * @returns Promise resolving to a PixelMatrix
 * @throws {ImageAdapterError} with user-friendly error type and message
 */
export function readImageToPixelMatrix(
  src: string,
  canvas: any
): Promise<PixelMatrix> {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: (imgInfo: any) => {
        const originalWidth = imgInfo.width;
        const originalHeight = imgInfo.height;
        const orientation = imgInfo.orientation ?? 1;

        // Validate dimensions before attempting to decode.
        try {
          validateImageDimensions(originalWidth, originalHeight);
        } catch (e) {
          reject(e);
          return;
        }

        const target = calculateDownsample(originalWidth, originalHeight);

        let ctx: any;
        try {
          ctx = canvas.getContext('2d');
        } catch {
          reject(new ImageAdapterError('canvas-failed', 'Canvas 初始化失败，请重试'));
          return;
        }

        const img = canvas.createImage();

        img.onload = () => {
          try {
            // Set canvas to target (possibly downsampled) size.
            canvas.width = target.width;
            canvas.height = target.height;

            // Clear canvas before drawing (in case of reuse).
            ctx.clearRect(0, 0, target.width, target.height);

            // Draw image with EXIF orientation applied.
            applyExifOrientation(ctx, img, orientation, target.width, target.height);

            // Extract pixel data.
            let imageData: any;
            try {
              imageData = ctx.getImageData(0, 0, target.width, target.height);
            } catch {
              reject(new ImageAdapterError('canvas-failed', '读取像素数据失败，可能是设备不支持'));
              return;
            }

            const data = imageData.data as Uint8ClampedArray;
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
          } catch (e) {
            reject(new ImageAdapterError('unknown', `图片处理失败: ${e instanceof Error ? e.message : String(e)}`));
          }
        };

        img.onerror = () => reject(new ImageAdapterError('format-unsupported', '图片加载失败，可能格式不支持或文件已损坏'));
        img.src = src;
      },
      fail: (err: any) => {
        const errMsg = String(err?.errMsg ?? '');
        if (errMsg.includes('cancel')) {
          reject(new ImageAdapterError('unknown', ''));
        } else {
          reject(new ImageAdapterError('decode-failed', '读取图片信息失败，请重试或更换图片'));
        }
      },
    });
  });
}

/**
 * Validate that a PixelMatrix is non-empty and has consistent dimensions.
 */
export function validatePixelMatrix(matrix: PixelMatrix): void {
  if (!matrix.width || !matrix.height || matrix.width <= 0 || matrix.height <= 0) {
    throw new ImageAdapterError('decode-failed', '图片尺寸无效');
  }
  if (!matrix.pixels || matrix.pixels.length !== matrix.height) {
    throw new ImageAdapterError('decode-failed', '图片数据不完整');
  }
  for (let y = 0; y < matrix.height; y++) {
    if (!matrix.pixels[y] || matrix.pixels[y].length !== matrix.width) {
      throw new ImageAdapterError('decode-failed', `第 ${y} 行像素数据不完整`);
    }
  }
}
