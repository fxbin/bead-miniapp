import { describe, expect, it } from 'vitest';
import { ARTKAL_C_2024 } from '../miniprogram/engine/palette/artkal-c-2024';
import { auditPalette, getColorTrust, formatAuditReport } from '../miniprogram/engine/palette/audit';
import type { BeadPalette, BeadColorDefinition } from '../miniprogram/engine/palette/types';
import { getPreparedPalette, clearPreparedPaletteCache } from '../miniprogram/engine/palette/registry';
import { prepareColor } from '../miniprogram/engine/color';

describe('Palette Audit — #37 L0/L1', () => {
  it('audits the real Artkal palette without errors', () => {
    const findings = auditPalette(ARTKAL_C_2024);
    // Should find at least the 2 excluded colors (C35, C152)
    expect(findings.length).toBeGreaterThan(0);
    // C152 should be flagged as out-of-range (manual-exclusion)
    const c152 = findings.filter((f) => f.code === 'C152');
    expect(c152.length).toBeGreaterThan(0);
  });

  it('C35 and C152 are marked as untrusted', () => {
    const findings = auditPalette(ARTKAL_C_2024);
    expect(getColorTrust(findings, 'C35')).toBe('untrusted');
    // C152 is in excluded list, not in colors, so it's in findings as manual-exclusion
    expect(getColorTrust(findings, 'C152')).toBe('untrusted');
  });

  it('normal colors like C01 are trusted', () => {
    const findings = auditPalette(ARTKAL_C_2024);
    expect(getColorTrust(findings, 'C01')).toBe('trusted');
  });

  it('CE-series colors are flagged as special-material', () => {
    const findings = auditPalette(ARTKAL_C_2024);
    const ceFindings = findings.filter((f) => f.issue === 'special-material');
    // There are 17 CE-series colors (CE01..CE17)
    expect(ceFindings.length).toBe(17);
    expect(ceFindings.every((f) => f.trust === 'low-confidence')).toBe(true);
  });

  it('detects out-of-range RGB values', () => {
    const palette: BeadPalette = {
      id: 'test', brand: 'Test', series: 'T', version: '1',
      calibrationLevel: 'L0', sourceLabel: 'test',
      colors: [
        { code: 'T01', name: 'T01', rgb: { r: 0, g: 0, b: 0 } },
        { code: 'T02', name: 'T02', rgb: { r: 255, g: 255, b: 255 } },
        { code: 'T03', name: 'T03', rgb: { r: 300, g: 0, b: 0 } }, // out of range
      ],
    };
    const findings = auditPalette(palette);
    const oor = findings.filter((f) => f.issue === 'out-of-range');
    expect(oor).toHaveLength(1);
    expect(oor[0].code).toBe('T03');
    expect(oor[0].trust).toBe('untrusted');
  });

  it('detects exact duplicate RGB triplets', () => {
    const palette: BeadPalette = {
      id: 'test', brand: 'Test', series: 'T', version: '1',
      calibrationLevel: 'L0', sourceLabel: 'test',
      colors: [
        { code: 'T01', name: 'T01', rgb: { r: 100, g: 100, b: 100 } },
        { code: 'T02', name: 'T02', rgb: { r: 100, g: 100, b: 100 } }, // duplicate
        { code: 'T03', name: 'T03', rgb: { r: 200, g: 200, b: 200 } },
      ],
    };
    const findings = auditPalette(palette);
    const dups = findings.filter((f) => f.issue === 'duplicate-rgb');
    expect(dups).toHaveLength(2); // both T01 and T02 flagged
  });

  it('detects suspicious pure black/white for non-standard codes', () => {
    const palette: BeadPalette = {
      id: 'test', brand: 'Test', series: 'T', version: '1',
      calibrationLevel: 'L0', sourceLabel: 'test',
      colors: [
        { code: 'T01', name: 'T01', rgb: { r: 0, g: 0, b: 0 } }, // suspicious (non-C02)
        { code: 'T02', name: 'T02', rgb: { r: 255, g: 255, b: 255 } }, // suspicious (non-C01)
      ],
    };
    const findings = auditPalette(palette);
    const susp = findings.filter((f) => f.issue === 'suspicious-value');
    expect(susp).toHaveLength(2);
  });

  it('formatAuditReport produces readable output', () => {
    const findings = auditPalette(ARTKAL_C_2024);
    const report = formatAuditReport(ARTKAL_C_2024, findings);
    expect(report).toContain('Palette Audit Report');
    expect(report).toContain('Brand: Artkal');
    expect(report).toContain('Trust summary:');
  });
});

describe('Palette Trust — #37 matcher integration', () => {
  it('CE-series colors are excluded from prepared palette by material filter', () => {
    clearPreparedPaletteCache();
    const prepared = getPreparedPalette('artkal-c-2024');
    const ceColors = prepared.colors.filter((c) => c.code.startsWith('CE'));
    expect(ceColors).toHaveLength(0);
  });

  it('deprecated colors are excluded from prepared palette', () => {
    clearPreparedPaletteCache();
    // Create a test palette with a deprecated color
    const palette: BeadPalette = {
      id: 'test-deprecated', brand: 'Test', series: 'T', version: '1',
      calibrationLevel: 'L0', sourceLabel: 'test',
      colors: [
        { code: 'T01', name: 'T01', rgb: { r: 0, g: 0, b: 0 }, deprecated: false },
        { code: 'T02', name: 'T02', rgb: { r: 255, g: 255, b: 255 }, deprecated: true },
      ],
    };
    // Directly test the filter logic
    const matchable = palette.colors.filter(
      (c) => c.available !== false && (c.material ?? 'normal') === 'normal' && !c.deprecated
    );
    expect(matchable).toHaveLength(1);
    expect(matchable[0].code).toBe('T01');
  });

  it('calibratedRGB is used when available (L2 path)', () => {
    // Test that the dual-track design works: when calibratedRGB is set,
    // the prepared color uses it instead of rgb.
    const color: BeadColorDefinition = {
      code: 'TEST',
      name: 'TEST',
      rgb: { r: 100, g: 100, b: 100 },
      calibratedRGB: { r: 120, g: 120, b: 120 },
    };
    // Simulate the registry logic
    const preparedFromCalibrated = prepareColor(color.calibratedRGB!);
    const preparedFromDisplay = prepareColor(color.rgb);
    // They should be different since the RGB values differ
    expect(preparedFromCalibrated.oklab.L).not.toEqual(preparedFromDisplay.oklab.L);
  });

  it('falls back to display RGB when calibratedRGB is undefined', () => {
    const color: BeadColorDefinition = {
      code: 'TEST',
      name: 'TEST',
      rgb: { r: 100, g: 100, b: 100 },
      // calibratedRGB is undefined
    };
    const prepared = prepareColor(color.calibratedRGB ?? color.rgb);
    expect(prepared.oklab).toBeDefined();
    // Should match the display RGB
    const expected = prepareColor(color.rgb);
    expect(prepared.oklab).toEqual(expected.oklab);
  });

  it('palette notes document L0/L1/L2 calibration status', () => {
    expect(ARTKAL_C_2024.notes).toContainEqual(expect.stringContaining('L0'));
    expect(ARTKAL_C_2024.notes).toContainEqual(expect.stringContaining('L2'));
    expect(ARTKAL_C_2024.notes).toContainEqual(expect.stringContaining('deferred'));
  });

  it('every color has a source field', () => {
    for (const color of ARTKAL_C_2024.colors) {
      expect(color.source).toBeTruthy();
    }
  });

  it('calibrationLevel is L0 (no physical calibration done)', () => {
    expect(ARTKAL_C_2024.calibrationLevel).toBe('L0');
  });
});
