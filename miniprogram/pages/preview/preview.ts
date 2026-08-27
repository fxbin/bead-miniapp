import type { PatternResult } from '../../engine';
import type { BeadCell } from '../../engine';
import { getPalette } from '../../engine/palette/registry';

interface EditState {
  history: BeadCell[][][];
  historyIndex: number;
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
    // #22: cell editing
    editMode: false,
    selectedCell: null as null | { x: number; y: number; code: string },
    availableColors: [] as Array<{ code: string; rgb: { r: number; g: number; b: number } }>,
    showColorPicker: false,
    canUndo: false,
  },

  // Internal edit history (not reactive).
  _editState: { history: [], historyIndex: -1 } as EditState,

  onLoad() {
    const app = getApp() as any;
    const result = app.globalData.lastPatternResult as PatternResult | null;
    if (result) {
      this.setData({
        patternResult: result,
        canvasWidth: result.width * this.data.cellSize,
        canvasHeight: result.height * this.data.cellSize,
      });
      // Initialize edit history with the original grid.
      this._editState = {
        history: [result.grid.map((row) => row.map((cell) => ({ ...cell })))],
        historyIndex: 0,
      };
      this.updateUndoState();
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

  // #22: Toggle edit mode
  onToggleEdit() {
    this.setData({
      editMode: !this.data.editMode,
      selectedCell: null,
      showColorPicker: false,
    });
  },

  // #22: Handle canvas tap for cell selection in edit mode
  onCanvasTap(e: any) {
    if (!this.data.editMode || !this.data.patternResult) return;

    const result = this.data.patternResult;
    const cellSize = this.data.cellSize * this.data.scale;
    const touch = e.detail;
    const x = Math.floor((touch.x - this.data.offsetX) / cellSize);
    const y = Math.floor((touch.y - this.data.offsetY) / cellSize);

    if (x < 0 || x >= result.width || y < 0 || y >= result.height) return;

    const cell = result.grid[y][x];
    this.setData({
      selectedCell: { x, y, code: cell.colorCode },
    });

    // Load available colors from the palette.
    try {
      const palette = getPalette(result.paletteId);
      const colors = palette.colors
        .filter((c) => c.available !== false && (c.material ?? 'normal') === 'normal')
        .map((c) => ({ code: c.code, rgb: c.rgb }));
      this.setData({ availableColors: colors, showColorPicker: true });
    } catch {
      // Palette lookup failed
    }
  },

  // #22: Change cell color
  onColorSelect(e: any) {
    const newCode = e.currentTarget.dataset.code;
    const selected = this.data.selectedCell;
    const result = this.data.patternResult;
    if (!selected || !result) return;

    // Create a new grid copy
    const newGrid = result.grid.map((row: BeadCell[]) => row.map((cell: BeadCell) => ({ ...cell })));
    newGrid[selected.y][selected.x] = { colorCode: newCode };

    // Push to edit history
    this._editState.history = this._editState.history.slice(0, this._editState.historyIndex + 1);
    this._editState.history.push(newGrid);
    this._editState.historyIndex++;

    // Recompute palette usage
    const paletteUsage: Record<string, number> = {};
    for (let y = 0; y < newGrid.length; y++) {
      for (let x = 0; x < newGrid[y].length; x++) {
        const code = newGrid[y][x].colorCode;
        paletteUsage[code] = (paletteUsage[code] ?? 0) + 1;
      }
    }

    const updatedResult = {
      ...result,
      grid: newGrid,
      paletteUsage,
      uniqueColors: Object.keys(paletteUsage).length,
    };

    // Update global data
    const app = getApp() as any;
    app.globalData.lastPatternResult = updatedResult;

    this.setData({
      patternResult: updatedResult,
      selectedCell: { ...selected, code: newCode },
      showColorPicker: false,
    });
    this.updateUndoState();
    this.renderGrid();
  },

  // #22: Undo last edit
  onUndo() {
    if (this._editState.historyIndex <= 0) return;

    this._editState.historyIndex--;
    const prevGrid = this._editState.history[this._editState.historyIndex];
    const result = this.data.patternResult;
    if (!result) return;

    // Recompute palette usage
    const paletteUsage: Record<string, number> = {};
    for (let y = 0; y < prevGrid.length; y++) {
      for (let x = 0; x < prevGrid[y].length; x++) {
        const code = prevGrid[y][x].colorCode;
        paletteUsage[code] = (paletteUsage[code] ?? 0) + 1;
      }
    }

    const updatedResult = {
      ...result,
      grid: prevGrid,
      paletteUsage,
      uniqueColors: Object.keys(paletteUsage).length,
    };

    const app = getApp() as any;
    app.globalData.lastPatternResult = updatedResult;

    this.setData({ patternResult: updatedResult, selectedCell: null });
    this.updateUndoState();
    this.renderGrid();
  },

  // #22: Close color picker
  onCloseColorPicker() {
    this.setData({ showColorPicker: false, selectedCell: null });
  },

  updateUndoState() {
    this.setData({ canUndo: this._editState.historyIndex > 0 });
  },

  onTouchMove(e: any) {
    if (this.data.editMode) return; // Disable pan in edit mode
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
    if (!result) return;

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

      ctx.save();
      ctx.translate(this.data.offsetX, this.data.offsetY);

      let colorLookup: Record<string, { r: number; g: number; b: number }> = {};
      try {
        const palette = getPalette(result.paletteId);
        colorLookup = Object.fromEntries(
          palette.colors.map((c) => [c.code, c.rgb])
        );
      } catch {
        // Fallback
      }

      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          const cell: BeadCell = result.grid[y][x];
          const rgb = colorLookup[cell.colorCode] ?? { r: 128, g: 128, b: 128 };
          ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

          if (this.data.showGrid) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }

          if (this.data.showCodes && cellSize >= 20) {
            ctx.fillStyle = getContrastColor(rgb);
            ctx.font = `${Math.max(8, cellSize * 0.25)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell.colorCode, x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
          }

          // Highlight selected cell in edit mode
          if (this.data.editMode && this.data.selectedCell &&
              this.data.selectedCell.x === x && this.data.selectedCell.y === y) {
            ctx.strokeStyle = '#07c160';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }

      ctx.restore();
    });
  },
});

function getContrastColor(rgb: { r: number; g: number; b: number }): string {
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}
