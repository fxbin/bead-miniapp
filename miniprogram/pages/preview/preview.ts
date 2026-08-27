import type { PatternResult } from '../../engine';

Page({
  data: {
    patternResult: null as PatternResult | null,
  },

  onLoad() {
    const app = getApp() as any;
    const result = app.globalData.lastPatternResult as PatternResult | null;
    if (result) {
      this.setData({ patternResult: result });
    }
  },
});
