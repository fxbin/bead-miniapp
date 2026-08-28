# bead-miniapp

A WeChat Mini Program for converting images into practical perler bead patterns — **拼豆图纸**.

## Product direction

- Mini Program first
- Local first (no server required — all processing on device)
- Algorithm first (deterministic image & color algorithms, not generative AI)
- Bead Engine isolated from Mini Program runtime (pure TypeScript, no `wx.*` dependency)
- Real brand palette constraint (Artkal C-2.6mm)

## Current stage

**v0.2 — Real Craft Validation**

Focus on proving the product through:
- Golden benchmark dataset and visual regression harness
- Brand palette trust model (L0/L1 audit, L2-ready)
- Preset recalibration driven by benchmark data
- Real photo input robustness (EXIF, extreme ratio, memory guards)
- Small-screen and safe-area adaptation
- Privacy/permission compliance for WeChat platform
- Usability test and external craft validation frameworks

## Core flow

```
Photo → Image Adapter (downsample + EXIF) → Bead Engine:
  Resize → Palette Matching (OKLab) → Similar Color Merge → Edge Protection → Small Region Cleanup
→ Bead Grid → Preview (Canvas) → Edit → Export (Craft Sheet)
```

## Architecture

```
miniprogram/
  adapter/      — WeChat Canvas ↔ Engine bridge (imageAdapter.ts)
  engine/       — Pure TypeScript bead pattern engine (no wx.* dependency)
    color/      — RGB → OKLab → perceptual distance
    palette/    — Artkal C-2024 palette, matcher, audit, trust model
    image/      — Resize, normalize, sampling
    merge/      — Similar color fusion
    cleanup/    — Isolated pixel & tiny region removal
    edge/       — Edge protection mask
    preset/     — Easy / Balanced / Fidelity presets + diagnostics
  pages/        — index, generate, preview, export
tests/          — Unit tests + benchmark + regression + QA frameworks
```

## Three presets

| Preset | maxColors | mergeThreshold | cleanupLevel | Target |
|--------|-----------|-----------------|---------------|--------|
| 易拼 (easy) | 16 | 0.10 | 3 (aggressive) | Fewer colors, less fragments, lower craft burden |
| 平衡 (balanced) | 32 | 0.06 | 2 (medium) | Default: balance of fidelity and craftability |
| 高还原 (fidelity) | ∞ | — | 1 (minimal) | Maximum detail, more isolated pixels |

Benchmark evidence (golden dataset, 20 fixtures × 3 sizes × 3 presets = 180 runs):

```
32×32 easy=2  balanced=3  fidelity=4  unique colors (clear separation)
64×64 easy=2  balanced=3  fidelity=4  (consistent across sizes)
```

## Key features

- **OKLab perceptual color matching** — not RGB distance, but human-perceived color difference
- **Similar color merge** — fuses near-duplicate palette entries to reduce craft burden
- **Edge protection** — preserves high-contrast contours during cleanup
- **Small region cleanup** — removes isolated pixels and tiny fragments (BFS connected components)
- **EXIF orientation** — handles all 8 standard EXIF orientations
- **Memory safety** — downsamples to 512px max, rejects >50MP and >10:1 ratio images
- **Canvas DPR** — sharp rendering on high-DPR displays
- **Safe area** — respects `env(safe-area-inset-bottom)` on iPhone X+
- **Privacy** — zero network calls, all processing local, `__usePrivacyCheck__` enabled

## Known limitations

- **Palette: L0 only** — official digital RGB values, no physical color calibration (L2 deferred, requires same-brand physical samples)
- **Single brand** — only Artkal C-2.6mm supported (multi-brand is a non-goal for v0.2)
- **No cloud sync** — patterns are not saved across sessions (by design, local-first)
- **Real device QA** — code-level guards are complete; iOS/Android visual QA requires manual verification
- **External craft validation** — framework ready; actual external testing is a human task

## Demo storyline (for competition)

```
Real photo → Local algorithm → Brand bead pattern → Color codes/counts → Real craft sheet
```

Key points:
1. No server needed — runs entirely on the phone
2. Photos processed locally on device
3. Not generative AI — deterministic image and color algorithms
4. Real brand palette constraint (Artkal C)
5. Similar color merge, cleanup, edge protection
6. Output is a craft-ready sheet for real bead assembly

## Repository principles

- Code contains implementation and tests
- Design decisions and experiments are tracked in GitHub Issues
- The engine avoids direct dependency on WeChat APIs (`wx.*`)
- All algorithm changes must pass golden benchmark regression
- All UI changes should be verified on real devices or clearly marked for manual verification
- No scope creep beyond the current Epic

## Testing

```bash
npm run check    # typecheck + tests (118 tests)
npm run test     # tests only
npm run test:watch  # watch mode
```

Test coverage:
- Unit tests (color, image, merge, cleanup, edge, palette, preset, engine)
- Golden benchmark (20 fixtures × 3 sizes × 3 presets)
- Regression comparison harness
- Palette audit
- Image adapter robustness
- Preset recalibration verification
