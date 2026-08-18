# bead-miniapp

A WeChat Mini Program for converting images into practical perler bead patterns.

## Product direction

- Mini Program first
- Local first (no server required for MVP)
- Algorithm first
- Bead Engine isolated from Mini Program runtime

## Core flow

Image → Resize → Color Processing → Brand Palette Mapping → Pattern Optimization → Bead Grid

## Current stage

M0 — Bead Engine Baseline

The current baseline covers:

- image normalization and deterministic grid sampling
- sRGB / CIELAB / OKLab color conversion
- RGB / ΔE76 / CIEDE2000 / OKLab distance strategies
- Artkal C-2.6mm official digital RGB palette registry
- brand-palette matching
- `generatePattern()` end-to-end output
- unit tests and a lightweight benchmark harness

## Development

Requirements:

- Node.js 22+
- npm

Install dependencies:

```bash
npm install
```

Run type checking and the test suite:

```bash
npm run check
```

Run tests only:

```bash
npm test
```

The Bead Engine lives under `miniprogram/engine` and must not depend on `wx.*`, `Page`, `Component`, or other WeChat runtime APIs.

## Repository principles

- Code contains implementation, tests, and only necessary operational documentation.
- Design decisions, research, rejected alternatives, and experiments are tracked in GitHub Issues.
- The engine should avoid direct dependency on WeChat APIs so it can be tested outside WeChat Developer Tools.
