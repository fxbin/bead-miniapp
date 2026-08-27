import { generatePattern } from '../../engine';
import type { PatternResult } from '../../engine';

Page({
  data: {
    imageSrc: '' as string,
    patternResult: null as PatternResult | null,
    loading: false,
    error: '' as string,
    sizes: [32, 48, 64],
    selectedSize: 32,
    presets: ['easy', 'balanced', 'fidelity'] as const,
    selectedPreset: 'balanced' as 'easy' | 'balanced' | 'fidelity',
  },

  onLoad() {
    // Page loaded
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res: any) => {
        this.setData({ imageSrc: res.tempFiles[0].tempFilePath, error: '' });
      },
      fail: () => {
        this.setData({ error: '选择图片失败，请重试' });
      },
    });
  },

  onSizeChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ selectedSize: Number(e.detail.value) });
  },

  onPresetChange(e: WechatMiniprogram.PickerChange) {
    this.setData({
      selectedPreset: this.data.presets[Number(e.detail.value)],
    });
  },

  async onGenerate() {
    if (!this.data.imageSrc) {
      this.setData({ error: '请先选择图片' });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      // Engine adapter: read image pixels via canvas, convert to PixelMatrix
      const pixelMatrix = await this.readImageToPixelMatrix(this.data.imageSrc);

      const result = generatePattern(pixelMatrix, {
        width: this.data.selectedSize,
        height: this.data.selectedSize,
        paletteId: 'artkal-c-2024',
        matcherStrategy: 'oklab',
        cleanupLevel: 2,
        protectEdges: true,
      });

      this.setData({ patternResult: result, loading: false });

      // Store in global data for preview page
      const app = getApp() as any;
      app.globalData.lastPatternResult = result;

      wx.navigateTo({ url: '/pages/preview/preview' });
    } catch (err) {
      this.setData({
        loading: false,
        error: `生成失败: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },

  /**
   * Engine adapter: read image file via canvas and extract pixel data.
   * This is the only place where wx.* APIs touch image data before
   * passing it to the pure Engine.
   */
  readImageToPixelMatrix(src: string): Promise<{
    width: number;
    height: number;
    pixels: { r: number; g: number; b: number; a?: number }[][];
  }> {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: (imgInfo: any) => {
          const query = wx.createSelectorQuery();
          query.select('#hidden-canvas').fields({ node: true }).exec((res: any) => {
            const canvas = res[0]?.node;
            if (!canvas) {
              reject(new Error('Canvas not available'));
              return;
            }

            const ctx = canvas.getContext('2d');
            const img = canvas.createImage();
            img.onload = () => {
              canvas.width = imgInfo.width;
              canvas.height = imgInfo.height;
              ctx.drawImage(img, 0, 0);

              const imageData = ctx.getImageData(
                0, 0, canvas.width, canvas.height
              );
              const data = imageData.data;
              const pixels: { r: number; g: number; b: number; a?: number }[][] = [];

              for (let y = 0; y < canvas.height; y++) {
                const row: { r: number; g: number; b: number; a?: number }[] = [];
                for (let x = 0; x < canvas.width; x++) {
                  const idx = (y * canvas.width + x) * 4;
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
                width: canvas.width,
                height: canvas.height,
                pixels,
              });
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = src;
          });
        },
        fail: () => reject(new Error('Failed to get image info')),
      });
    });
  },
});
