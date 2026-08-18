import { describe, expect, it } from 'vitest';
import { deltaE2000, srgbToLab, srgbToOklab } from '../miniprogram/engine/color';

describe('color conversions', () => {
  it('maps sRGB white close to Lab reference white', () => {
    const lab = srgbToLab({ r: 255, g: 255, b: 255 });
    expect(lab.L).toBeCloseTo(100, 4);
    expect(lab.a).toBeCloseTo(0, 3);
    expect(lab.b).toBeCloseTo(0, 3);
  });

  it('maps sRGB white close to OKLab white', () => {
    const lab = srgbToOklab({ r: 255, g: 255, b: 255 });
    expect(lab.L).toBeCloseTo(1, 6);
    expect(lab.a).toBeCloseTo(0, 5);
    expect(lab.b).toBeCloseTo(0, 5);
  });
});

describe('CIEDE2000', () => {
  const cases = [
    [{ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 }, 2.0425],
    [{ L: 50, a: 3.1571, b: -77.2803 }, { L: 50, a: 0, b: -82.7485 }, 2.8615],
    [{ L: 50, a: 2.8361, b: -74.02 }, { L: 50, a: 0, b: -82.7485 }, 3.4412],
    [{ L: 50, a: -1.3802, b: -84.2814 }, { L: 50, a: 0, b: -82.7485 }, 1.0],
  ] as const;

  for (const [left, right, expected] of cases) {
    it(`matches Sharma reference ΔE00=${expected}`, () => {
      expect(deltaE2000(left, right)).toBeCloseTo(expected, 4);
    });
  }
});
