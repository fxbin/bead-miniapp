import type { PatternResult } from '../../engine';

Page({
  data: {
    patternResult: null as PatternResult | null,
    usageList: [] as Array<{ code: string; count: number }>,
  },

  onLoad() {
    const app = getApp() as any;
    const result = app.globalData.lastPatternResult as PatternResult | null;
    if (result) {
      const usageList = Object.entries(result.paletteUsage)
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count);
      this.setData({ patternResult: result, usageList });
    }
  },
});
