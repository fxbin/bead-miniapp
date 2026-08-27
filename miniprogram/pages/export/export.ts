import type { PatternResult } from '../../engine';
import { getPalette } from '../../engine/palette/registry';

Page({
  data: {
    patternResult: null as PatternResult | null,
    usageList: [] as Array<{ code: string; name: string; count: number; rgb: { r: number; g: number; b: number } }>,
    sortBy: 'count' as 'count' | 'code',
  },

  onLoad() {
    const app = getApp() as any;
    const result = app.globalData.lastPatternResult as PatternResult | null;
    if (result) {
      this.setData({ patternResult: result });
      this.buildUsageList(result);
    }
  },

  buildUsageList(result: PatternResult) {
    let colorLookup: Record<string, { name: string; rgb: { r: number; g: number; b: number } }> = {};
    try {
      const palette = getPalette(result.paletteId);
      colorLookup = Object.fromEntries(
        palette.colors.map((c) => [c.code, { name: c.name, rgb: c.rgb }])
      );
    } catch {
      // Fallback
    }

    const list = Object.entries(result.paletteUsage)
      .map(([code, count]) => ({
        code,
        name: colorLookup[code]?.name ?? code,
        count,
        rgb: colorLookup[code]?.rgb ?? { r: 128, g: 128, b: 128 },
      }));

    this.applySort(list);
  },

  applySort(list: Array<{ code: string; name: string; count: number; rgb: { r: number; g: number; b: number } }>) {
    if (this.data.sortBy === 'count') {
      list.sort((a, b) => b.count - a.count);
    } else {
      list.sort((a, b) => a.code.localeCompare(b.code));
    }
    this.setData({ usageList: list });
  },

  onSortByCount() {
    this.setData({ sortBy: 'count' });
    if (this.data.patternResult) {
      const list = [...this.data.usageList];
      list.sort((a, b) => b.count - a.count);
      this.setData({ usageList: list });
    }
  },

  onSortByCode() {
    this.setData({ sortBy: 'code' });
    if (this.data.patternResult) {
      const list = [...this.data.usageList];
      list.sort((a, b) => a.code.localeCompare(b.code));
      this.setData({ usageList: list });
    }
  },

  // #23: Export pattern as canvas image and save to album
  onExportImage() {
    const result = this.data.patternResult;
    if (!result) return;

    const query = wx.createSelectorQuery();
    query.select('#export-canvas').fields({ node: true }).exec((res: any) => {
      const canvas = res[0]?.node;
      if (!canvas) {
        wx.showToast({ title: '导出失败', icon: 'none' });
        return;
      }

      const ctx = canvas.getContext('2d');
      const cellSize = 20;
      const padding = 40;
      const legendHeight = 200;
      canvas.width = result.width * cellSize + padding * 2;
      canvas.height = result.height * cellSize + padding * 2 + legendHeight;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get color lookup
      let colorLookup: Record<string, { r: number; g: number; b: number }> = {};
      try {
        const palette = getPalette(result.paletteId);
        colorLookup = Object.fromEntries(palette.colors.map((c) => [c.code, c.rgb]));
      } catch {
        // Fallback
      }

      // Draw grid
      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          const cell = result.grid[y][x];
          const rgb = colorLookup[cell.colorCode] ?? { r: 128, g: 128, b: 128 };
          ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
          ctx.fillRect(padding + x * cellSize, padding + y * cellSize, cellSize, cellSize);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(padding + x * cellSize, padding + y * cellSize, cellSize, cellSize);
        }
      }

      // Draw legend
      const legendY = padding + result.height * cellSize + 20;
      ctx.fillStyle = '#333';
      ctx.font = '14px sans-serif';
      ctx.fillText(`品牌: ${result.paletteId} | 尺寸: ${result.width}×${result.height} | 总豆数: ${result.totalBeads} | 颜色数: ${result.uniqueColors}`, padding, legendY);

      // Save to album
      wx.canvasToTempFilePath({
        canvas,
        success: (res: any) => {
          wx.saveImageToPhotosAlbum({
            tempFilePath: res.tempFilePath,
            success: () => {
              wx.showToast({ title: '保存成功', icon: 'success' });
            },
            fail: (err: any) => {
              if (err.errMsg?.includes('auth deny')) {
                wx.showModal({
                  title: '需要相册权限',
                  content: '请在设置中允许保存到相册',
                  confirmText: '去设置',
                  success: (res: any) => {
                    if (res.confirm) wx.openSetting();
                  },
                });
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            },
          });
        },
        fail: () => {
          wx.showToast({ title: '导出失败', icon: 'none' });
        },
      });
    });
  },

  // #24: Clear local state
  onClearData() {
    wx.showModal({
      title: '清除数据',
      content: '确定清除当前图纸数据？此操作不可撤销。',
      success: (res: any) => {
        if (res.confirm) {
          const app = getApp() as any;
          app.globalData.lastPatternResult = null;
          wx.reLaunch({ url: '/pages/index/index' });
        }
      },
    });
  },
});
