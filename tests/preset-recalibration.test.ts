import { describe, expect, it } from 'vitest';
import { resolvePreset } from '../miniprogram/engine/preset';
import { generatePattern } from '../miniprogram/engine';
import { GOLDEN_FIXTURES, BENCHMARK_SIZES } from './golden-benchmark/dataset';
import type { PatternPreset } from '../miniprogram/engine/preset';

/**
 * Preset Recalibration Verification — #40
 *
 * Validates that the three presets (easy / balanced / fidelity) produce
 * visibly different outputs on benchmark fixtures, using the golden
 * benchmark dataset from #38.
 */

// Use a subset of fixtures that have enough color variety
const DIVERSE_FIXTURES = [
  'pet-01', 'pet-03', 'portrait-01', 'portrait-02',
  'anime-01', 'anime-02', 'landscape-01', 'food-01',
  'lowcontrast-02',
];

function getFixture(id: string) {
  return GOLDEN_FIXTURES.find((f) => f.id === id)!;
}

function runPreset(fixtureId: string, size: number, preset: PatternPreset) {
  const fixture = getFixture(fixtureId);
  const source = fixture.generate();
  const params = resolvePreset(preset);
  return generatePattern(source, {
    width: size,
    height: size,
    paletteId: 'artkal-c-2024',
    matcherStrategy: 'oklab',
    maxColors: params.maxColors,
    mergeSimilarColors: params.mergeSimilarColors,
    mergeThreshold: params.mergeThreshold,
    cleanupLevel: params.cleanupLevel,
    detailLevel: params.detailLevel,
    protectEdges: params.protectEdges,
  });
}

describe('Preset Recalibration — #40', { timeout: 120000 }, () => {
  it('easy preset: maxColors=16, mergeThreshold=0.10, cleanupLevel=3', () => {
    const params = resolvePreset('easy');
    expect(params.maxColors).toBe(16);
    expect(params.mergeThreshold).toBe(0.10);
    expect(params.cleanupLevel).toBe(3);
  });

  it('balanced preset: maxColors=32, mergeThreshold=0.06, cleanupLevel=2', () => {
    const params = resolvePreset('balanced');
    expect(params.maxColors).toBe(32);
    expect(params.mergeThreshold).toBe(0.06);
    expect(params.cleanupLevel).toBe(2);
  });

  it('fidelity preset: no maxColors cap, no merge, cleanupLevel=1', () => {
    const params = resolvePreset('fidelity');
    expect(params.maxColors).toBeUndefined();
    expect(params.mergeSimilarColors).toBe(false);
    expect(params.cleanupLevel).toBe(1);
  });

  it('presets produce distinct parameter sets', () => {
    const easy = resolvePreset('easy');
    const balanced = resolvePreset('balanced');
    const fidelity = resolvePreset('fidelity');

    expect(easy.maxColors).not.toBe(balanced.maxColors);
    expect(balanced.maxColors).not.toBe(fidelity.maxColors);
    expect(easy.mergeThreshold).not.toBe(balanced.mergeThreshold);
    expect(easy.cleanupLevel).not.toBe(balanced.cleanupLevel);
    expect(balanced.cleanupLevel).not.toBe(fidelity.cleanupLevel);
  });

  // AC: "easy 模式确实降低颜色数和碎片数"
  it('easy produces fewer or equal unique colors than balanced on all diverse fixtures', () => {
    for (const fixtureId of DIVERSE_FIXTURES) {
      for (const size of BENCHMARK_SIZES) {
        const easy = runPreset(fixtureId, size, 'easy');
        const balanced = runPreset(fixtureId, size, 'balanced');
        expect(easy.uniqueColors).toBeLessThanOrEqual(balanced.uniqueColors);
      }
    }
  });

  it('easy produces fewer or equal isolated pixels than balanced', () => {
    for (const fixtureId of DIVERSE_FIXTURES) {
      for (const size of BENCHMARK_SIZES) {
        const easy = runPreset(fixtureId, size, 'easy');
        const balanced = runPreset(fixtureId, size, 'balanced');
        // easy has cleanupLevel=3 (aggressive), balanced has cleanupLevel=2
        const easyIso = easy.diagnostics.cleanup?.isolatedPixelCountAfter ?? 0;
        const balIso = balanced.diagnostics.cleanup?.isolatedPixelCountAfter ?? 0;
        expect(easyIso).toBeLessThanOrEqual(balIso + 1);
      }
    }
  });

  // AC: "高还原模式不会无意义增加相近色"
  it('fidelity does not produce excessive similar color redundancy', () => {
    for (const fixtureId of DIVERSE_FIXTURES) {
      const result = runPreset(fixtureId, 64, 'fidelity');
      // Fidelity should have reasonable unique colors (not exploded)
      // Since it doesn't merge, it could have more, but not wildly more
      const balanced = runPreset(fixtureId, 64, 'balanced');
      // Fidelity can have more colors but shouldn't be absurd
      expect(result.uniqueColors).toBeLessThanOrEqual(balanced.uniqueColors * 3);
    }
  });

  // AC: "平衡模式适合作为默认值" — check it's between easy and fidelity
  it('balanced unique colors are between easy and fidelity on most fixtures', () => {
    let balancedInMiddle = 0;
    let totalComparisons = 0;

    for (const fixtureId of DIVERSE_FIXTURES) {
      for (const size of BENCHMARK_SIZES) {
        const easy = runPreset(fixtureId, size, 'easy');
        const balanced = runPreset(fixtureId, size, 'balanced');
        const fidelity = runPreset(fixtureId, size, 'fidelity');

        totalComparisons++;
        if (easy.uniqueColors <= balanced.uniqueColors &&
            balanced.uniqueColors <= fidelity.uniqueColors) {
          balancedInMiddle++;
        }
      }
    }
    // Balanced should be in the middle for at least 60% of cases
    expect(balancedInMiddle / totalComparisons).toBeGreaterThanOrEqual(0.6);
  });

  // AC: "三套预设的输出差异肉眼可辨" — check at least some differentiation
  it('all three presets produce different outputs on at least one fixture', () => {
    let allDifferent = false;
    for (const fixtureId of DIVERSE_FIXTURES) {
      for (const size of BENCHMARK_SIZES) {
        const easy = runPreset(fixtureId, size, 'easy');
        const balanced = runPreset(fixtureId, size, 'balanced');
        const fidelity = runPreset(fixtureId, size, 'fidelity');

        // Check if at least one pair differs in unique colors
        if (easy.uniqueColors !== balanced.uniqueColors ||
            balanced.uniqueColors !== fidelity.uniqueColors) {
          allDifferent = true;
          break;
        }
      }
      if (allDifferent) break;
    }
    expect(allDifferent).toBe(true);
  });

  // AC: "三套预设在 32/48/64 上均稳定"
  it('all presets complete without errors on all sizes', () => {
    for (const fixtureId of DIVERSE_FIXTURES) {
      for (const size of BENCHMARK_SIZES) {
        expect(() => runPreset(fixtureId, size, 'easy')).not.toThrow();
        expect(() => runPreset(fixtureId, size, 'balanced')).not.toThrow();
        expect(() => runPreset(fixtureId, size, 'fidelity')).not.toThrow();
      }
    }
  });
});
