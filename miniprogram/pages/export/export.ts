import type { PatternResult } from '../../engine';
import { getPalette } from '../../engine/palette/registry';

type UsageItem = {
  code: string;
  name: string;
  count: number;
  rgb: { r: number; g: number; b: number };
};

Page({
  data: {
    patternResult: null as PatternResult | null,
    usageList: [] as UsageItem[],
    sortBy: 'count' as 'count' | 'code',
    brandLabel: 'Artkal C',
  },

  onLoad() {
    const app = getApp() as any;
    const result = app.globalData.lastPatternResult as PatternResult | null;
    if (result) {
      this.setData({ patternResult: result }, () => {
        this.buildUsageList(result);
        this.renderPreview();
      });
    }
  },

  getColorLookup(result: PatternResult): Record<string, { name: string; rgb: { r: number; g: number; b: number } }> {
    try {
      const palette = getPalette(result.paletteId);
      return Object.fromEntries(palette.colors.map((c) => [c.code, { name: c.name, rgb: c.rgb }]));
    } catch {
      return {};
    }
  },

  buildUsageList(result: PatternResult) {
    const colorLookup = this.getColorLookup(result);
    const list = Object.entries(result.paletteUsage).map(([code, count]) => ({
      code,
      name: colorLookup[code]?.name ?? code,
      count,
      rgb: colorLookup[code]?.rgb ?? { r: 128, g: 128, b: 128 },
    }));
    this.applySort(list);
  },

  applySort(list: UsageItem[]) {
    if (this.data.sortBy === 'count') {
      list.sort((a, b) => b.count - a.count);
    } else {
      list.sort((a, b) => a.code.localeCompare(b.code));
    }
    this.setData({ usageList: list });
  },

  onSortByCount() {
    this.setData({ sortBy: 'count' });
    const list = [...this.data.usageList].sort((a, b) => b.count - a.count);
    this.setData({ usageList: list });
  },

  onSortByCode() {
    this.setData({ sortBy: 'code' });
    const list = [...this.data.usageList].sort((a, b) => a.code.localeCompare(b.code));
    this.setData({ usageList: list });
  },

  renderPreview() {
    const result = this.data.patternResult;
    if (!result) return;

    const query = wx.createSelectorQuery();
    query.select('#sheet-preview-canvas').fields({ node: true }).exec((res: any) => {
      const canvas = res[0]?.node;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const cellSize = Math.max(6, Math.floor(560 / Math.max(result.width, result.height)));
      const padding = 18;
      const width = result.width * cellSize + padding * 2;
      const height = result.height * cellSize + padding * 2;
      const dpr = wx.getWindowInfo().pixelRatio;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#f1ede7';
      ctx.fillRect(0, 0, width, height);

      const lookup = this.getColorLookup(result);
      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          const cell = result.grid[y][x];
          const rgb = lookup[cell.colorCode]?.rgb ?? { r: 128, g: 128, b: 128 };
          const cx = padding + x * cellSize + cellSize / 2;
          const cy = padding + y * cellSize + cellSize / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.44, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1.2, cellSize * 0.14), 0, Math.PI * 2);
          ctx.fillStyle = '#f7f5f0';
          ctx.fill();
        }
      }
    });
  },

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
      const padding = 64;
      const headerHeight = 160;
      const maxGridWidth = 900;
      const cellSize = Math.max(10, Math.floor(maxGridWidth / result.width));
      const gridWidth = result.width * cellSize;
      const gridHeight = result.height * cellSize;
      const canvasWidth = Math.max(1000, gridWidth + padding * 2);
      const legendColumns = 3;
      const legendRows = Math.ceil(this.data.usageList.length / legendColumns);
      const legendHeight = 120 + legendRows * 44;
      const canvasHeight = headerHeight + gridHeight + legendHeight + padding * 2;
      const gridX = Math.floor((canvasWidth - gridWidth) / 2);
      const gridY = headerHeight;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      ctx.fillStyle = '#f8f6f2';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.fillStyle = '#282522';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText('拼豆制作图纸', padding, 58);
      ctx.fillStyle = '#84786f';
      ctx.font = '20px sans-serif';
      ctx.fillText(`${this.data.brandLabel}  ·  ${result.width} × ${result.height}  ·  ${result.totalBeads} 豆  ·  ${result.uniqueColors} 色`, padding, 98);

      const lookup = this.getColorLookup(result);
      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          const cell = result.grid[y][x];
          const rgb = lookup[cell.colorCode]?.rgb ?? { r: 128, g: 128, b: 128 };
          const px = gridX + x * cellSize;
          const py = gridY + y * cellSize;
          ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = 'rgba(48,42,38,0.18)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, cellSize, cellSize);
        }
      }

      const legendTop = gridY + gridHeight + 54;
      ctx.fillStyle = '#2f2a27';
      ctx.font = 'bold 25px sans-serif';
      ctx.fillText(`颜色清单（${result.uniqueColors} 色）`, padding, legendTop);

      const colWidth = (canvasWidth - padding * 2) / legendColumns;
      ctx.font = '18px sans-serif';
      this.data.usageList.forEach((item: UsageItem, index: number) => {
        const col = index % legendColumns;
        const row = Math.floor(index / legendColumns);
        const x = padding + col * colWidth;
        const y = legendTop + 52 + row * 44;
        ctx.beginPath();
        ctx.arc(x + 10, y - 6, 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 10, y - 6, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f8f6f2';
        ctx.fill();
        ctx.fillStyle = '#514942';
        ctx.fillText(`${item.code}  ${item.count} 颗`, x + 30, y);
      });

      ctx.fillStyle = '#a09388';
      ctx.font = '16px sans-serif';
      ctx.fillText('由拼豆图纸生成 · 请以实际品牌色号与材料为准', padding, canvasHeight - 38);

      wx.canvasToTempFilePath({
        canvas,
        success: (fileRes: any) => {
          // Check album write permission before attempting save.
          // This provides a smoother UX than relying on saveImageToPhotosAlbum's fail.
          wx.getSetting({
            success: (settingRes: any) => {
              const hasPermission = settingRes.authSetting['scope.writePhotosAlbum'];
              if (hasPermission === false) {
                // Previously denied — guide to settings.
                wx.showModal({
                  title: '需要相册权限',
                  content: '请在设置中允许保存到相册',
                  confirmText: '去设置',
                  success: (modalRes: any) => {
                    if (modalRes.confirm) wx.openSetting();
                  },
                });
                return;
              }
              if (hasPermission === undefined) {
                // Never asked — request authorization first.
                wx.authorize({
                  scope: 'scope.writePhotosAlbum',
                  success: () => this.doSaveImage(fileRes.tempFilePath),
                  fail: () => {
                    wx.showModal({
                      title: '需要相册权限',
                      content: '请在设置中允许保存到相册',
                      confirmText: '去设置',
                      success: (modalRes: any) => {
                        if (modalRes.confirm) wx.openSetting();
                      },
                    });
                  },
                });
                return;
              }
              // Already authorized — save directly.
              this.doSaveImage(fileRes.tempFilePath);
            },
            fail: () => {
              // Fallback: try saving directly.
              this.doSaveImage(fileRes.tempFilePath);
            },
          });
        },
        fail: () => wx.showToast({ title: '导出失败', icon: 'none' }),
      });
    });
  },

  doSaveImage(tempFilePath: string) {
    wx.saveImageToPhotosAlbum({
      tempFilePath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    });
  },

  onClearData() {
    wx.showModal({
      title: '清除当前图纸？',
      content: '清除后需要重新选择照片生成。',
      confirmText: '清除',
      success: (res: any) => {
        if (res.confirm) {
          const app = getApp() as any;
          app.globalData.lastPatternResult = null;
          app.globalData.lastImageSrc = '';
          wx.reLaunch({ url: '/pages/index/index' });
        }
      },
    });
  },
});
