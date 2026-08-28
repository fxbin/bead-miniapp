import { generatePattern } from '../../engine';
import type { PatternResult } from '../../engine';
import { resolvePreset } from '../../engine/preset';
import { readImageToPixelMatrix, validatePixelMatrix } from '../../adapter/imageAdapter';
import { ImageAdapterError } from '../../adapter/imageAdapter';

type PresetId = 'easy' | 'balanced' | 'fidelity';

Page({
  data: {
    imageSrc: '' as string,
    patternResult: null as PatternResult | null,
    loading: false,
    error: '' as string,
    sizes: [32, 48, 64],
    selectedSize: 48,
    presets: ['easy', 'balanced', 'fidelity'] as const,
    selectedPreset: 'balanced' as PresetId,
  },

  onLoad(options: Record<string, string>) {
    if (options.autoChoose === '1') {
      setTimeout(() => this.onChooseImage(), 120);
    }
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
      fail: (err: any) => {
        const cancelled = String(err?.errMsg ?? '').includes('cancel');
        this.setData({ error: cancelled ? '' : '选择图片失败，请重试' });
      },
    });
  },

  onSizeTap(e: any) {
    const size = Number(e.currentTarget.dataset.size);
    if (this.data.sizes.includes(size)) {
      this.setData({ selectedSize: size });
    }
  },

  onPresetTap(e: any) {
    const preset = e.currentTarget.dataset.preset as PresetId;
    if ((this.data.presets as readonly string[]).includes(preset)) {
      this.setData({ selectedPreset: preset });
    }
  },

  // Kept for compatibility with any existing picker bindings.
  onSizeChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ selectedSize: this.data.sizes[Number(e.detail.value)] ?? 48 });
  },

  onPresetChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ selectedPreset: this.data.presets[Number(e.detail.value)] });
  },

  async onGenerate() {
    if (this.data.loading) return;
    if (!this.data.imageSrc) {
      this.setData({ error: '请先选择图片' });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const canvas = await this.getCanvasNode();
      const pixelMatrix = await readImageToPixelMatrix(this.data.imageSrc, canvas);
      validatePixelMatrix(pixelMatrix);

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

      const app = getApp() as any;
      app.globalData.lastPatternResult = result;
      app.globalData.lastImageSrc = this.data.imageSrc;
      app.globalData.lastPreset = this.data.selectedPreset;

      wx.navigateTo({ url: '/pages/preview/preview' });
    } catch (err) {
      let errorMsg: string;
      if (err instanceof ImageAdapterError) {
        // Empty message means user cancelled — don't show error.
        errorMsg = err.message;
      } else {
        errorMsg = `生成失败: ${err instanceof Error ? err.message : String(err)}`;
      }
      this.setData({
        loading: false,
        error: errorMsg,
      });
    }
  },

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
