/**
 * Golden Benchmark Dataset — Issue #38
 *
 * 20 deterministic, programmatic image fixtures covering 7 categories.
 * Each fixture is generated from a fixed seed; no external image files required.
 * Combined with 3 grid sizes × 3 presets = 180 benchmark runs per session.
 */

import { generatePattern } from '../../miniprogram/engine';
import { resolvePreset } from '../../miniprogram/engine/preset';
import { computeCraftabilityDiagnostics } from '../../miniprogram/engine/preset/diagnostics';
import { getPreparedPalette } from '../../miniprogram/engine/palette/registry';
import type { PixelMatrix, Pixel } from '../../miniprogram/engine/image';
import type { PatternPreset } from '../../miniprogram/engine/preset';
import type { CraftabilityDiagnostics } from '../../miniprogram/engine/preset/types';
import type { PatternResult } from '../../miniprogram/engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FixtureCategory =
  | 'pet'        // 宠物 / 毛色
  | 'portrait'   // 人像 / 肤色
  | 'anime'      // 动漫 / 插画
  | 'logo'       // Logo / 几何
  | 'landscape'  // 风景
  | 'food'       // 食物
  | 'lowcontrast'; // 低对比 / 复杂背景

export interface GoldenFixture {
  /** Stable identifier used in filenames and reports. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Category for coverage tracking. */
  category: FixtureCategory;
  /** Source attribution / license. */
  source: string;
  /** Deterministic pixel generator. */
  generate: () => PixelMatrix;
}

export interface BenchmarkRun {
  fixtureId: string;
  fixtureName: string;
  category: FixtureCategory;
  size: number;
  preset: PatternPreset;
  // Fidelity
  meanMatchDistance: number;
  uniqueColors: number;
  totalBeads: number;
  // Craftability
  craftability: CraftabilityDiagnostics;
  // Timing
  elapsedMs: number;
}

export interface BenchmarkReport {
  runs: BenchmarkRun[];
  fixtureCount: number;
  totalRuns: number;
  generatedAt: string;
  gitSha?: string;
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Pixel helpers
// ---------------------------------------------------------------------------

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function makePixel(r: number, g: number, b: number): Pixel {
  return { r: clamp(r), g: clamp(g), b: clamp(b), a: 255 };
}

function makeMatrix(
  width: number,
  height: number,
  fn: (x: number, y: number) => Pixel
): PixelMatrix {
  const pixels: Pixel[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Pixel[] = [];
    for (let x = 0; x < width; x++) {
      row.push(fn(x, y));
    }
    pixels.push(row);
  }
  return { width, height, pixels };
}

// ---------------------------------------------------------------------------
// Fixture generators — each produces a deterministic 96×96 image
// ---------------------------------------------------------------------------

const FIXTURE_SIZE = 96;

// --- Pet (fur patterns) ---

function genPet1(): PixelMatrix {
  // Orange tabby-like gradient with stripes
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const stripe = Math.sin(x * 0.4) > 0.3 ? 0.7 : 1;
    return makePixel(255 * stripe, 165 * stripe, 50 * stripe);
  });
}

function genPet2(): PixelMatrix {
  // Black & white tuxedo cat
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const cx = FIXTURE_SIZE / 2;
    const cy = FIXTURE_SIZE / 2;
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    return d < 30 ? makePixel(245, 245, 245) : makePixel(35, 35, 35);
  });
}

function genPet3(): PixelMatrix {
  // Brown golden retriever gradient
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const t = (x + y) / (FIXTURE_SIZE * 2);
    return makePixel(180 - t * 40, 140 - t * 30, 90 - t * 20);
  });
}

function genPet4(): PixelMatrix {
  // Gray cat with noise
  const rng = mulberry32(42);
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const n = rng() * 30 - 15;
    const base = 120 + n;
    return makePixel(base, base, base + 5);
  });
}

// --- Portrait (skin tones) ---

function genPortrait1(): PixelMatrix {
  // Light skin tone portrait
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const cy = FIXTURE_SIZE / 2;
    const faceDist = Math.sqrt((x - cy) ** 2 + (y - cy) ** 2);
    if (faceDist < 32) return makePixel(245, 215, 185); // face
    if (faceDist < 36) return makePixel(60, 40, 30); // hair
    return makePixel(100, 80, 70); // background
  });
}

function genPortrait2(): PixelMatrix {
  // Medium skin tone
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const cy = FIXTURE_SIZE / 2;
    const d = Math.sqrt((x - cy) ** 2 + (y - cy * 0.9) ** 2);
    if (d < 30) return makePixel(180, 140, 110);
    if (d < 34) return makePixel(40, 25, 15);
    return makePixel(200, 200, 210);
  });
}

function genPortrait3(): PixelMatrix {
  // Dark skin tone
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const cy = FIXTURE_SIZE / 2;
    const d = Math.sqrt((x - cy) ** 2 + (y - cy) ** 2);
    if (d < 30) return makePixel(120, 85, 65);
    if (d < 34) return makePixel(20, 15, 10);
    return makePixel(180, 170, 160);
  });
}

function genPortrait4(): PixelMatrix {
  // Profile silhouette
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    if (x > 30 && x < 70 && y > 20 && y < 80) {
      const skin = 220 - (x - 30) * 2;
      return makePixel(skin, skin - 20, skin - 40);
    }
    return makePixel(240, 240, 240);
  });
}

// --- Anime / illustration ---

function genAnime1(): PixelMatrix {
  // Flat color blocks (anime style)
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    if (y < 30) return makePixel(135, 206, 235); // sky
    if (y < 60) return makePixel(100, 180, 80); // grass
    return makePixel(80, 60, 100); // ground
  });
}

function genAnime2(): PixelMatrix {
  // Cel-shaded face (simplified)
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const cx = FIXTURE_SIZE / 2;
    const d = Math.sqrt((x - cx) ** 2 + (y - cx) ** 2);
    if (d < 25) return makePixel(255, 230, 200); // face
    if (d < 28) return makePixel(200, 170, 150); // shadow
    return makePixel(255, 170, 170); // bg pink
  });
}

function genAnime3(): PixelMatrix {
  // Chibi-style big color patches
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const cx = FIXTURE_SIZE / 2;
    const cy = FIXTURE_SIZE / 2;
    if (Math.abs(x - cx) < 15 && Math.abs(y - cy) < 20) return makePixel(255, 200, 100);
    if (Math.abs(x - cx) < 25 && Math.abs(y - cy) < 30) return makePixel(100, 150, 255);
    return makePixel(255, 240, 220);
  });
}

// --- Logo / geometric ---

function genLogo1(): PixelMatrix {
  // Red circle on white
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const cx = FIXTURE_SIZE / 2;
    const d = Math.sqrt((x - cx) ** 2 + (y - cx) ** 2);
    return d < 28 ? makePixel(220, 30, 30) : makePixel(255, 255, 255);
  });
}

function genLogo2(): PixelMatrix {
  // Geometric: blue triangle on yellow
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    if (x > y) return makePixel(30, 80, 200); // blue triangle
    return makePixel(255, 220, 50); // yellow bg
  });
}

// --- Landscape ---

function genLandscape1(): PixelMatrix {
  // Sunset gradient
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const t = y / FIXTURE_SIZE;
    return makePixel(255 - t * 50, 140 - t * 80, 80 + t * 100);
  });
}

function genLandscape2(): PixelMatrix {
  // Mountain silhouette
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const peak = 40 + Math.sin(x * 0.15) * 20;
    if (y < peak) return makePixel(135, 206, 235); // sky
    return makePixel(80, 70, 60); // mountain
  });
}

function genLandscape3(): PixelMatrix {
  // Ocean horizon
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    if (y < 45) return makePixel(100, 160, 230); // sky
    return makePixel(30, 80, 140); // sea
  });
}

// --- Food ---

function genFood1(): PixelMatrix {
  // Red strawberry on green
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const cx = FIXTURE_SIZE / 2;
    const cy = FIXTURE_SIZE / 2;
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (d < 25) return makePixel(220, 40, 40); // strawberry
    if (d < 28) return makePixel(100, 180, 60); // leaf
    return makePixel(255, 250, 240); // plate
  });
}

function genFood2(): PixelMatrix {
  // Brown cake layers
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    if (y < 30) return makePixel(255, 220, 180); // cream
    if (y < 60) return makePixel(160, 100, 60); // cake
    return makePixel(120, 80, 50); // base
  });
}

// --- Low contrast / complex background ---

function genLowContrast1(): PixelMatrix {
  // Very subtle gray gradient
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const v = 120 + (x + y) * 0.5;
    return makePixel(v, v, v);
  });
}

function genLowContrast2(): PixelMatrix {
  // Complex: noisy mid-tone with small feature
  const rng = mulberry32(99);
  return makeMatrix(FIXTURE_SIZE, FIXTURE_SIZE, (x, y) => {
    const cx = FIXTURE_SIZE / 2;
    const d = Math.sqrt((x - cx) ** 2 + (y - cx) ** 2);
    const base = 130 + rng() * 40 - 20;
    if (d < 8) return makePixel(base + 30, base + 30, base + 30); // small feature
    return makePixel(base, base, base);
  });
}

// ---------------------------------------------------------------------------
// Fixture registry
// ---------------------------------------------------------------------------

export const GOLDEN_FIXTURES: GoldenFixture[] = [
  // Pet / fur ×4
  { id: 'pet-01', name: 'Orange Tabby Stripes', category: 'pet', source: 'programmatic', generate: genPet1 },
  { id: 'pet-02', name: 'Tuxedo Cat', category: 'pet', source: 'programmatic', generate: genPet2 },
  { id: 'pet-03', name: 'Golden Retriever', category: 'pet', source: 'programmatic', generate: genPet3 },
  { id: 'pet-04', name: 'Gray Cat Noise', category: 'pet', source: 'programmatic', generate: genPet4 },
  // Portrait / skin ×4
  { id: 'portrait-01', name: 'Light Skin Portrait', category: 'portrait', source: 'programmatic', generate: genPortrait1 },
  { id: 'portrait-02', name: 'Medium Skin Portrait', category: 'portrait', source: 'programmatic', generate: genPortrait2 },
  { id: 'portrait-03', name: 'Dark Skin Portrait', category: 'portrait', source: 'programmatic', generate: genPortrait3 },
  { id: 'portrait-04', name: 'Profile Silhouette', category: 'portrait', source: 'programmatic', generate: genPortrait4 },
  // Anime / illustration ×3
  { id: 'anime-01', name: 'Flat Color Scene', category: 'anime', source: 'programmatic', generate: genAnime1 },
  { id: 'anime-02', name: 'Cel-shaded Face', category: 'anime', source: 'programmatic', generate: genAnime2 },
  { id: 'anime-03', name: 'Chibi Patches', category: 'anime', source: 'programmatic', generate: genAnime3 },
  // Logo / geometric ×2
  { id: 'logo-01', name: 'Red Circle', category: 'logo', source: 'programmatic', generate: genLogo1 },
  { id: 'logo-02', name: 'Blue Triangle', category: 'logo', source: 'programmatic', generate: genLogo2 },
  // Landscape ×3
  { id: 'landscape-01', name: 'Sunset Gradient', category: 'landscape', source: 'programmatic', generate: genLandscape1 },
  { id: 'landscape-02', name: 'Mountain Silhouette', category: 'landscape', source: 'programmatic', generate: genLandscape2 },
  { id: 'landscape-03', name: 'Ocean Horizon', category: 'landscape', source: 'programmatic', generate: genLandscape3 },
  // Food ×2
  { id: 'food-01', name: 'Strawberry', category: 'food', source: 'programmatic', generate: genFood1 },
  { id: 'food-02', name: 'Cake Layers', category: 'food', source: 'programmatic', generate: genFood2 },
  // Low contrast / complex ×2
  { id: 'lowcontrast-01', name: 'Subtle Gray Gradient', category: 'lowcontrast', source: 'programmatic', generate: genLowContrast1 },
  { id: 'lowcontrast-02', name: 'Noisy Midtone Feature', category: 'lowcontrast', source: 'programmatic', generate: genLowContrast2 },
];

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

export const BENCHMARK_SIZES = [32, 48, 64] as const;
export const BENCHMARK_PRESETS = ['easy', 'balanced', 'fidelity'] as const;
export const PALETTE_ID = 'artkal-c-2024';

/**
 * Run the full golden benchmark suite.
 * Returns a report with 20 fixtures × 3 sizes × 3 presets = 180 runs.
 */
export function runGoldenBenchmark(): BenchmarkReport {
  const runs: BenchmarkRun[] = [];

  // Pre-build color lookup for craftability diagnostics.
  const palette = getPreparedPalette(PALETTE_ID);
  const colorLookup = new Map(
    palette.colors.map((c: { code: string; prepared: import('../../miniprogram/engine/color').PreparedColor }) => [c.code, c.prepared] as [string, import('../../miniprogram/engine/color').PreparedColor])
  );

  for (const fixture of GOLDEN_FIXTURES) {
    const source = fixture.generate();

    for (const size of BENCHMARK_SIZES) {
      for (const preset of BENCHMARK_PRESETS) {
        const params = resolvePreset(preset);
        const start = performance.now();

        const result: PatternResult = generatePattern(source, {
          width: size,
          height: size,
          paletteId: PALETTE_ID,
          matcherStrategy: 'oklab',
          maxColors: params.maxColors,
          mergeSimilarColors: params.mergeSimilarColors,
          mergeThreshold: params.mergeThreshold,
          cleanupLevel: params.cleanupLevel,
          detailLevel: params.detailLevel,
          protectEdges: params.protectEdges,
        });

        const elapsedMs = performance.now() - start;

        const craftability = computeCraftabilityDiagnostics(
          result.grid,
          colorLookup,
          'oklab'
        );

        runs.push({
          fixtureId: fixture.id,
          fixtureName: fixture.name,
          category: fixture.category,
          size,
          preset,
          meanMatchDistance: result.diagnostics.meanMatchDistance,
          uniqueColors: result.uniqueColors,
          totalBeads: result.totalBeads,
          craftability,
          elapsedMs,
        });
      }
    }
  }

  return {
    runs,
    fixtureCount: GOLDEN_FIXTURES.length,
    totalRuns: runs.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Run a single fixture across all sizes and presets.
 * Useful for targeted regression checks.
 */
export function runFixtureBenchmark(fixtureId: string): BenchmarkRun[] {
  const fixture = GOLDEN_FIXTURES.find((f) => f.id === fixtureId);
  if (!fixture) throw new Error(`Unknown fixture: ${fixtureId}`);

  const palette = getPreparedPalette(PALETTE_ID);
  const colorLookup = new Map(
    palette.colors.map((c: { code: string; prepared: import('../../miniprogram/engine/color').PreparedColor }) => [c.code, c.prepared] as [string, import('../../miniprogram/engine/color').PreparedColor])
  );

  const source = fixture.generate();
  const runs: BenchmarkRun[] = [];

  for (const size of BENCHMARK_SIZES) {
    for (const preset of BENCHMARK_PRESETS) {
      const params = resolvePreset(preset);
      const start = performance.now();

      const result = generatePattern(source, {
        width: size,
        height: size,
        paletteId: PALETTE_ID,
        matcherStrategy: 'oklab',
        maxColors: params.maxColors,
        mergeSimilarColors: params.mergeSimilarColors,
        mergeThreshold: params.mergeThreshold,
        cleanupLevel: params.cleanupLevel,
        detailLevel: params.detailLevel,
        protectEdges: params.protectEdges,
      });

      const elapsedMs = performance.now() - start;
      const craftability = computeCraftabilityDiagnostics(
        result.grid,
        colorLookup,
        'oklab'
      );

      runs.push({
        fixtureId: fixture.id,
        fixtureName: fixture.name,
        category: fixture.category,
        size,
        preset,
        meanMatchDistance: result.diagnostics.meanMatchDistance,
        uniqueColors: result.uniqueColors,
        totalBeads: result.totalBeads,
        craftability,
        elapsedMs,
      });
    }
  }

  return runs;
}

/**
 * Print a summary table of the benchmark report.
 */
export function printBenchmarkSummary(report: BenchmarkReport): void {
  // Group by size × preset
  const groups = new Map<string, BenchmarkRun[]>();
  for (const run of report.runs) {
    const key = `${run.size}×${run.size} ${run.preset}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(run);
  }

  console.log('\n=== Golden Benchmark Summary ===');
  console.log(`Fixtures: ${report.fixtureCount} | Total runs: ${report.totalRuns}\n`);

  for (const [key, runs] of groups) {
    const avgColors = runs.reduce((s, r) => s + r.uniqueColors, 0) / runs.length;
    const avgDist = runs.reduce((s, r) => s + r.meanMatchDistance, 0) / runs.length;
    const avgIsolated = runs.reduce((s, r) => s + r.craftability.isolatedPixelCount, 0) / runs.length;
    const avgMs = runs.reduce((s, r) => s + r.elapsedMs, 0) / runs.length;

    console.log(
      `  ${key.padEnd(20)} | avgColors=${avgColors.toFixed(0).padStart(3)} | avgDist=${avgDist.toFixed(4)} | avgIsolated=${avgIsolated.toFixed(0).padStart(3)} | avgMs=${avgMs.toFixed(0)}ms`
    );
  }
}
