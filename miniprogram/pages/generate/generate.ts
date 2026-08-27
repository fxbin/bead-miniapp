import { generatePattern } from '../../engine';
import type { PatternResult } from '../../engine';
import { resolvePreset } from '../../engine/preset';
import { readImageToPixelMatrix, validatePixelMatrix } from '../../adapter/imageAdapter';

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
        if (!res.tempFiles || res.tempFiles.length === 0) {
          this.setData({ error: '未选择图片' });
          return;
        }
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
      // Get canvas node for image processing.
      const canvas = await this.getCanvasNode();

      // Use the image adapter to read pixels (handles downsampling,
      // orientation, and alpha).
      const pixelMatrix = await readImageToPixelMatrix(this.data.imageSrc, canvas);
      validatePixelMatrix(pixelMatrix);

      // Resolve preset parameters.
      const presetParams = resolvePreset(this.data.selectedPreset);

      const result = generatePattern(pixelMatrix, {
        width: this.data.selectedSize,
        height: this.data.selectedSize,
        paletteId: 'artkal-c-2024',
        matcherStrategy: 'oklab',
        maxColors: presetParams.maxColors,
        mergeSimilarColors: presetParams.mergeSimilarColors,
        mergeThreshold: presetParams.mergeThreshold,
        cleanupLevel: presetParams.cleanupLevel,
        detailLevel: presetParams.detailLevel,
        protectEdges: presetParams.protectEdges,
      });

      this.setData({ patternResult: result, loading: false });

      // Store in global data for preview page.
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
   * Get the hidden canvas node via selector query.
   */
  getCanvasNode(): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#hidden-canvas').fields({ node: true }).exec((res: any) => {
        const canvas = res[0]?.node;
        if (!canvas) {
          reject(new Error('Canvas 初始化失败'));
          return;
        }
        resolve(canvas);
      });
    });
  },
});
