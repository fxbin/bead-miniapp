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

Focus on:

- image preprocessing
- palette modeling
- perceptual color matching
- bead grid generation
- benchmark-driven optimization

## Repository principles

- Code contains implementation and tests.
- Design decisions and experiments are tracked in GitHub Issues.
- The engine should avoid direct dependency on WeChat APIs.
