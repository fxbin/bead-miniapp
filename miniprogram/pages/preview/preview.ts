import type { PatternResult } from '../../engine';
import type { BeadCell } from '../../engine';
import { getPalette } from '../../engine/palette/registry';

interface GridRenderOptions {
  cellSize: number;
  showCodes: boolean;
  showGrid: boolean;
}

Page({
  data: {
    patternResult: null as PatternResult | null,
    showCodes: false,
    showGrid: true,
    cellSize: 16,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    canvasWidth: 300,
    canvasHeight: 300,
  },

  onLoad() {
    const app = getApp() as any;
    const result = app.globalData.lastPatternResult as PatternResult | null;
    if (result) {
      this.setData({
        patternResult: result,
        canvasWidth: result.width * this.data.cellSize,
        canvasHeight: result.height * this.data.cellSize,
      });
      this.renderGrid();
    }
  },

  onToggleCodes() {
    this.setData({ showCodes: !this.data.showCodes });
    this.renderGrid();
  },

  onToggleGrid() {
    this.setData({ showGrid: !this.data.showGrid });
    this.renderGrid();
  },

  onScaleChange(e: any) {
    const scale = Math.max(0.5, Math.min(3, Number(e.detail.value)));
    this.setData({ scale });
    this.renderGrid();
  },

  onTouchMove(e: any) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const lastTouch = (this as any)._lastTouch;
      if (lastTouch) {
        const dx = touch.x - lastTouch.x;
        const dy = touch.y - lastTouch.y;
        this.setData({
          offsetX: this.data.offsetX + dx,
          offsetY: this.data.offsetY + dy,
        });
        this.renderGrid();
      }
      (this as any)._lastTouch = { x: touch.x, y: touch.y };
    }
  },

  onTouchEnd() {
    (this as any)._lastTouch = null;
  },

  /**
   * Render the bead grid on canvas.
   */
  renderGrid() {
    const result = this.data.patternResult;
    if (!result) return;

    const query = wx.createSelectorQuery();
    query.select('#grid-canvas').fields({ node: true }).exec((res: any) => {
      const canvas = res[0]?.node;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const cellSize = this.data.cellSize * this.data.scale;
      const totalWidth = result.width * cellSize;
      const totalHeight = result.height * cellSize;

      // Set canvas dimensions
      const dpr = wx.getWindowInfo().pixelRatio;
      canvas.width = totalWidth * dpr;
      canvas.height = totalHeight * dpr;
      ctx.scale(dpr, dpr);

      // Apply offset
      ctx.save();
      ctx.translate(this.data.offsetX, this.data.offsetY);

      // Get palette for color lookup
      let colorLookup: Record<string, { r: number; g: number; b: number }> = {};
      try {
        const palette = getPalette(result.paletteId);
        colorLookup = Object.fromEntries(
          palette.colors.map((c) => [c.code, c.rgb])
        );
      } catch {
        // Fallback: use gray
      }

      // Draw cells
      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          const cell: BeadCell = result.grid[y][x];
          const rgb = colorLookup[cell.colorCode] ?? { r: 128, g: 128, b: 128 };
          ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

          // Draw grid lines
          if (this.data.showGrid) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }

          // Draw color code
          if (this.data.showCodes && cellSize >= 20) {
            ctx.fillStyle = getContrastColor(rgb);
            ctx.font = `${Math.max(8, cellSize * 0.25)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell.colorCode, x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
          }
        }
      }

      ctx.restore();
    });
  },
});

/**
 * Get black or white based on background luminance for contrast.
 */
function getContrastColor(rgb: { r: number; g: number; b: number }): string {
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}
