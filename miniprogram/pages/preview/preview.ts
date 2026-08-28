import type { PatternResult } from '../../engine';
import type { BeadCell } from '../../engine';
import { getPalette } from '../../engine/palette/registry';

interface EditState {
  history: BeadCell[][][];
  historyIndex: number;
}

interface SwatchColor {
  code: string;
  rgb: { r: number; g: number; b: number };
}

Page({
  data: {
    patternResult: null as PatternResult | null,
    imageSrc: '' as string,
    viewMode: 'pattern' as 'pattern' | 'original',
    showCodes: false,
    showGrid: true,
    cellSize: 16,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    canvasWidth: 300,
    canvasHeight: 300,
    editMode: false,
    selectedCell: null as null | { x: number; y: number; code: string },
    availableColors: [] as SwatchColor[],
    usedColors: [] as SwatchColor[],
    showColorPicker: false,
    canUndo: false,
  },

  _editState: { history: [], historyIndex: -1 } as EditState,

  onLoad() {
    const app = getApp() as any;
    const result = app.globalData.lastPatternResult as PatternResult | null;
    const imageSrc = (app.globalData.lastImageSrc as string | undefined) ?? '';
    if (result) {
      this.setData({
        patternResult: result,
        imageSrc,
        canvasWidth: result.width * this.data.cellSize,
        canvasHeight: result.height * this.data.cellSize,
        usedColors: this.getUsedColors(result),
      });
      this._editState = {
        history: [result.grid.map((row) => row.map((cell) => ({ ...cell })))],
        historyIndex: 0,
      };
      this.updateUndoState();
      this.renderGrid();
    }
  },

  getUsedColors(result: PatternResult): SwatchColor[] {
    try {
      const palette = getPalette(result.paletteId);
      const lookup = Object.fromEntries(palette.colors.map((c) => [c.code, c.rgb]));
      return Object.entries(result.paletteUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 18)
        .map(([code]) => ({ code, rgb: lookup[code] ?? { r: 128, g: 128, b: 128 } }));
    } catch {
      return [];
    }
  },

  onToggleOriginal() {
    if (!this.data.imageSrc) {
      wx.showToast({ title: '原图暂不可用', icon: 'none' });
      return;
    }
    const nextMode = this.data.viewMode === 'original' ? 'pattern' : 'original';
    this.setData({ viewMode: nextMode, editMode: false }, () => {
      if (nextMode === 'pattern') this.renderGrid();
    });
  },

  onToggleCodes() {
    if (this.data.viewMode === 'original') this.setData({ viewMode: 'pattern' });
    this.setData({ showCodes: !this.data.showCodes }, () => this.renderGrid());
  },

  onToggleGrid() {
    if (this.data.viewMode === 'original') this.setData({ viewMode: 'pattern' });
    this.setData({ showGrid: !this.data.showGrid }, () => this.renderGrid());
  },

  onToggleEdit() {
    const enteringEdit = !this.data.editMode;
    this.setData({
      viewMode: 'pattern',
      editMode: enteringEdit,
      selectedCell: null,
      showColorPicker: false,
    }, () => this.renderGrid());
  },

  onCanvasTap(e: any) {
    if (!this.data.editMode || !this.data.patternResult) return;

    const result = this.data.patternResult;
    const cellSize = this.data.cellSize * this.data.scale;
    const touch = e.detail;
    const x = Math.floor((touch.x - this.data.offsetX) / cellSize);
    const y = Math.floor((touch.y - this.data.offsetY) / cellSize);

    if (x < 0 || x >= result.width || y < 0 || y >= result.height) return;

    const cell = result.grid[y][x];
    this.setData({ selectedCell: { x, y, code: cell.colorCode } });

    try {
      const palette = getPalette(result.paletteId);
      const colors = palette.colors
        .filter((c) => c.available !== false && (c.material ?? 'normal') === 'normal')
        .map((c) => ({ code: c.code, rgb: c.rgb }));
      this.setData({ availableColors: colors, showColorPicker: true });
    } catch {
      wx.showToast({ title: '色板读取失败', icon: 'none' });
    }
  },

  onColorSelect(e: any) {
    const newCode = e.currentTarget.dataset.code;
    const selected = this.data.selectedCell;
    const result = this.data.patternResult;
    if (!selected || !result) return;

    const newGrid = result.grid.map((row: BeadCell[]) => row.map((cell: BeadCell) => ({ ...cell })));
    newGrid[selected.y][selected.x] = { colorCode: newCode };

    this._editState.history = this._editState.history.slice(0, this._editState.historyIndex + 1);
    this._editState.history.push(newGrid);
    this._editState.historyIndex++;

    const paletteUsage = countPaletteUsage(newGrid);
    const updatedResult = {
      ...result,
      grid: newGrid,
      paletteUsage,
      uniqueColors: Object.keys(paletteUsage).length,
    };

    const app = getApp() as any;
    app.globalData.lastPatternResult = updatedResult;

    this.setData({
      patternResult: updatedResult,
      usedColors: this.getUsedColors(updatedResult),
      selectedCell: { ...selected, code: newCode },
      showColorPicker: false,
    });
    this.updateUndoState();
    this.renderGrid();
  },

  onUndo() {
    if (this._editState.historyIndex <= 0) return;

    this._editState.historyIndex--;
    const prevGrid = this._editState.history[this._editState.historyIndex];
    const result = this.data.patternResult;
    if (!result) return;

    const paletteUsage = countPaletteUsage(prevGrid);
    const updatedResult = {
      ...result,
      grid: prevGrid,
      paletteUsage,
      uniqueColors: Object.keys(paletteUsage).length,
    };

    const app = getApp() as any;
    app.globalData.lastPatternResult = updatedResult;

    this.setData({
      patternResult: updatedResult,
      usedColors: this.getUsedColors(updatedResult),
      selectedCell: null,
    });
    this.updateUndoState();
    this.renderGrid();
  },

  onCloseColorPicker() {
    this.setData({ showColorPicker: false, selectedCell: null });
  },

  updateUndoState() {
    this.setData({ canUndo: this._editState.historyIndex > 0 });
  },

  onTouchMove(e: any) {
    if (this.data.editMode) return;
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

  renderGrid() {
    const result = this.data.patternResult;
    if (!result || this.data.viewMode !== 'pattern') return;

    const query = wx.createSelectorQuery();
    query.select('#grid-canvas').fields({ node: true }).exec((res: any) => {
      const canvas = res[0]?.node;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const cellSize = this.data.cellSize * this.data.scale;
      const totalWidth = result.width * cellSize;
      const totalHeight = result.height * cellSize;

      const dpr = wx.getWindowInfo().pixelRatio;
      canvas.width = totalWidth * dpr;
      canvas.height = totalHeight * dpr;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#f0ece6';
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      ctx.save();
      ctx.translate(this.data.offsetX, this.data.offsetY);

      let colorLookup: Record<string, { r: number; g: number; b: number }> = {};
      try {
        const palette = getPalette(result.paletteId);
        colorLookup = Object.fromEntries(palette.colors.map((c) => [c.code, c.rgb]));
      } catch {
        // Fallback below.
      }

      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          const cell: BeadCell = result.grid[y][x];
          const rgb = colorLookup[cell.colorCode] ?? { r: 128, g: 128, b: 128 };
          const cx = x * cellSize + cellSize / 2;
          const cy = y * cellSize + cellSize / 2;
          const radius = cellSize * 0.45;

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(247, 245, 240, 0.9)';
          ctx.fill();

          if (this.data.showGrid) {
            ctx.strokeStyle = 'rgba(72, 56, 45, 0.12)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }

          if (this.data.showCodes && cellSize >= 20) {
            ctx.fillStyle = getContrastColor(rgb);
            ctx.font = `${Math.max(8, cellSize * 0.24)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell.colorCode, cx, cy);
          }

          if (this.data.editMode && this.data.selectedCell &&
              this.data.selectedCell.x === x && this.data.selectedCell.y === y) {
            ctx.strokeStyle = '#e9775c';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
          }
        }
      }

      ctx.restore();
    });
  },
});

function countPaletteUsage(grid: BeadCell[][]): Record<string, number> {
  const paletteUsage: Record<string, number> = {};
  for (const row of grid) {
    for (const cell of row) {
      paletteUsage[cell.colorCode] = (paletteUsage[cell.colorCode] ?? 0) + 1;
    }
  }
  return paletteUsage;
}

function getContrastColor(rgb: { r: number; g: number; b: number }): string {
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#2d2926' : '#fff';
}
