import { describe, expect, it } from 'vitest';
import {
  calculateDownsample,
  validateImageDimensions,
  ImageAdapterError,
} from '../miniprogram/adapter/imageAdapter';

describe('Image Adapter Robustness — #51', () => {
  describe('calculateDownsample', () => {
    it('no downsample for small images', () => {
      const result = calculateDownsample(200, 200);
      expect(result.needsDownsample).toBe(false);
      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    });

    it('downsamples large images preserving aspect ratio', () => {
      const result = calculateDownsample(2000, 1000);
      expect(result.needsDownsample).toBe(true);
      expect(result.width).toBeLessThanOrEqual(512);
      expect(result.height).toBeLessThanOrEqual(512);
      // Aspect ratio preserved
      const ratio = result.width / result.height;
      expect(ratio).toBeCloseTo(2, 1);
    });

    it('handles extreme dimensions without producing 0', () => {
      const result = calculateDownsample(100000, 1);
      expect(result.width).toBeGreaterThanOrEqual(1);
      expect(result.height).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateImageDimensions', () => {
    it('accepts normal dimensions', () => {
      expect(() => validateImageDimensions(4000, 3000)).not.toThrow();
      expect(() => validateImageDimensions(512, 512)).not.toThrow();
    });

    it('rejects zero or negative dimensions', () => {
      expect(() => validateImageDimensions(0, 100)).toThrow(ImageAdapterError);
      expect(() => validateImageDimensions(100, 0)).toThrow(ImageAdapterError);
      expect(() => validateImageDimensions(-1, 100)).toThrow(ImageAdapterError);
    });

    it('rejects non-finite dimensions', () => {
      expect(() => validateImageDimensions(NaN, 100)).toThrow(ImageAdapterError);
      expect(() => validateImageDimensions(Infinity, 100)).toThrow(ImageAdapterError);
    });

    it('rejects images exceeding 50MP', () => {
      // 8000 x 7000 = 56MP
      expect(() => validateImageDimensions(8000, 7000)).toThrow(ImageAdapterError);
      const err = (() => {
        try { validateImageDimensions(8000, 7000); } catch (e) { return e as ImageAdapterError; }
      })();
      expect(err?.type).toBe('too-large');
      expect(err?.message).toContain('过大');
    });

    it('rejects extreme aspect ratios (>10:1)', () => {
      expect(() => validateImageDimensions(5000, 400)).toThrow(ImageAdapterError);
      const err = (() => {
        try { validateImageDimensions(5000, 400); } catch (e) { return e as ImageAdapterError; }
      })();
      expect(err?.type).toBe('extreme-ratio');
      expect(err?.message).toContain('长宽比');
    });

    it('accepts 10:1 ratio boundary', () => {
      // 4000 x 400 = 10:1 exactly
      expect(() => validateImageDimensions(4000, 400)).not.toThrow();
    });
  });

  describe('ImageAdapterError', () => {
    it('creates error with type and message', () => {
      const err = new ImageAdapterError('format-unsupported', 'test message');
      expect(err.type).toBe('format-unsupported');
      expect(err.message).toBe('test message');
      expect(err.name).toBe('ImageAdapterError');
      expect(err instanceof Error).toBe(true);
    });

    it('all error types are distinct', () => {
      const types = ['format-unsupported', 'too-large', 'extreme-ratio', 'decode-failed', 'canvas-failed', 'unknown'];
      const set = new Set(types);
      expect(set.size).toBe(types.length);
    });
  });
});
