import { prepareColor } from '../color';
import { ARTKAL_C_2024 } from './artkal-c-2024';
import type { BeadPalette, PreparedBeadPalette } from './types';

const PALETTES = new Map<string, BeadPalette>([
  [ARTKAL_C_2024.id, ARTKAL_C_2024],
]);

const PREPARED_CACHE = new Map<string, PreparedBeadPalette>();

export function listPalettes(): BeadPalette[] {
  return Array.from(PALETTES.values());
}

export function getPalette(id: string): BeadPalette {
  const palette = PALETTES.get(id);
  if (!palette) {
    throw new RangeError(`Unknown palette: ${id}`);
  }
  return palette;
}

export function getPreparedPalette(id: string): PreparedBeadPalette {
  const cached = PREPARED_CACHE.get(id);
  if (cached) {
    return cached;
  }

  const palette = getPalette(id);
  const prepared: PreparedBeadPalette = {
    ...palette,
    colors: palette.colors
      .filter(
        (color) =>
          color.available !== false &&
          (color.material ?? 'normal') === 'normal' &&
          !color.deprecated
      )
      .map((color) => ({
        ...color,
        // Use calibratedRGB when available (L2), otherwise fall back to
        // the official digital RGB (L0/L1).
        prepared: prepareColor(color.calibratedRGB ?? color.rgb),
      })),
  };

  if (prepared.colors.length === 0) {
    throw new Error(`Palette ${id} has no matchable colors`);
  }

  PREPARED_CACHE.set(id, prepared);
  return prepared;
}

export function clearPreparedPaletteCache(): void {
  PREPARED_CACHE.clear();
}
