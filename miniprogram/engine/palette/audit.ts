/**
 * Palette Audit & Trust Modeling — Issue #37
 *
 * Audits a BeadPalette for data quality issues, assigns trust levels,
 * and provides an audit report that can be used by the matcher to
 * downrank or exclude unreliable colors.
 */

import { preparedColorDistance } from '../color';
import type { ColorDistanceStrategy, PreparedColor } from '../color';
import { prepareColor } from '../color';
import type { BeadPalette, BeadColorDefinition, ColorAuditFinding, ColorTrustLevel } from './types';

// ---------------------------------------------------------------------------
// Audit logic
// ---------------------------------------------------------------------------

const NEAR_DUPLICATE_THRESHOLD = 0.015; // OKLab distance below which two colors are near-duplicates

/**
 * Audit a palette for data quality issues.
 *
 * Checks:
 * 1. Out-of-range RGB values (>255 or <0)
 * 2. Duplicate RGB triplets (different codes, same color)
 * 3. Near-duplicate colors (perceptually indistinguishable)
 * 4. Special materials (metallic, transparent, etc.)
 * 5. Manually excluded colors (from palette.excluded)
 * 6. Suspicious values (e.g. pure 0/0/0 for non-black, or 255/255/255 for non-white)
 */
export function auditPalette(palette: BeadPalette): ColorAuditFinding[] {
  const findings: ColorAuditFinding[] = [];

  // Check excluded colors
  for (const ex of palette.excluded ?? []) {
    findings.push({
      code: ex.code,
      issue: 'manual-exclusion',
      detail: ex.reason,
      trust: 'untrusted',
    });
  }

  // Check each color entry
  const rgbMap = new Map<string, string[]>(); // "r,g,b" -> [codes]
  const preparedMap: { code: string; prepared: PreparedColor; def: BeadColorDefinition }[] = [];

  for (const color of palette.colors) {
    const { r, g, b } = color.rgb;

    // 1. Out-of-range
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      findings.push({
        code: color.code,
        issue: 'out-of-range',
        detail: `RGB (${r},${g},${b}) has values outside 0..255`,
        trust: 'untrusted',
      });
      continue;
    }

    // 2. Track duplicates
    const key = `${r},${g},${b}`;
    if (!rgbMap.has(key)) rgbMap.set(key, []);
    rgbMap.get(key)!.push(color.code);

    // 4. Special material
    const material = color.material ?? 'normal';
    if (material !== 'normal') {
      findings.push({
        code: color.code,
        issue: 'special-material',
        detail: `Material: ${material}`,
        trust: 'low-confidence',
      });
    }

    // 5. Suspicious values: check if non-black/non-white colors have pure black/white RGB
    if (color.code !== 'C01' && color.code !== 'C02') {
      if (r === 0 && g === 0 && b === 0) {
        findings.push({
          code: color.code,
          issue: 'suspicious-value',
          detail: 'Pure black RGB (0,0,0) for a non-black color code',
          trust: 'low-confidence',
        });
      }
      if (r === 255 && g === 255 && b === 255) {
        findings.push({
          code: color.code,
          issue: 'suspicious-value',
          detail: 'Pure white RGB (255,255,255) for a non-white color code',
          trust: 'low-confidence',
        });
      }
    }

    // Track for near-duplicate check
    preparedMap.push({ code: color.code, prepared: prepareColor(color.rgb), def: color });
  }

  // 2. Report exact duplicates
  for (const [rgb, codes] of rgbMap) {
    if (codes.length > 1) {
      for (const code of codes) {
        findings.push({
          code,
          issue: 'duplicate-rgb',
          detail: `Shares RGB (${rgb}) with: ${codes.filter((c) => c !== code).join(', ')}`,
          trust: 'low-confidence',
        });
      }
    }
  }

  // 3. Near-duplicate detection (pairwise, O(n²) but n ~172 is fine)
  for (let i = 0; i < preparedMap.length; i++) {
    for (let j = i + 1; j < preparedMap.length; j++) {
      const a = preparedMap[i];
      const b = preparedMap[j];
      const dist = preparedColorDistance(a.prepared, b.prepared, 'oklab');
      if (dist < NEAR_DUPLICATE_THRESHOLD) {
        findings.push({
          code: a.code,
          issue: 'near-duplicate',
          detail: `Perceptually indistinguishable from ${b.code} (distance=${dist.toFixed(6)})`,
          trust: 'low-confidence',
        });
        findings.push({
          code: b.code,
          issue: 'near-duplicate',
          detail: `Perceptually indistinguishable from ${a.code} (distance=${dist.toFixed(6)})`,
          trust: 'low-confidence',
        });
      }
    }
  }

  return findings;
}

/**
 * Get the trust level for a specific color code from audit findings.
 * Defaults to 'trusted' if no findings exist for the code.
 */
export function getColorTrust(
  findings: ColorAuditFinding[],
  code: string
): ColorTrustLevel {
  const colorFindings = findings.filter((f) => f.code === code);
  if (colorFindings.length === 0) return 'trusted';
  if (colorFindings.some((f) => f.trust === 'untrusted')) return 'untrusted';
  if (colorFindings.some((f) => f.trust === 'low-confidence')) return 'low-confidence';
  return 'trusted';
}

/**
 * Generate a human-readable audit report.
 */
export function formatAuditReport(palette: BeadPalette, findings: ColorAuditFinding[]): string {
  const lines: string[] = [];
  lines.push(`=== Palette Audit Report: ${palette.id} ===`);
  lines.push(`Brand: ${palette.brand} ${palette.series}`);
  lines.push(`Version: ${palette.version}`);
  lines.push(`Calibration: ${palette.calibrationLevel}`);
  lines.push(`Total colors: ${palette.colors.length}`);
  lines.push(`Excluded: ${palette.excluded?.length ?? 0}`);
  lines.push('');

  const byIssue = new Map<string, ColorAuditFinding[]>();
  for (const f of findings) {
    if (!byIssue.has(f.issue)) byIssue.set(f.issue, []);
    byIssue.get(f.issue)!.push(f);
  }

  if (findings.length === 0) {
    lines.push('No issues found. ✅');
  } else {
    lines.push(`Findings: ${findings.length}`);
    for (const [issue, items] of byIssue) {
      lines.push(`  ${issue}: ${items.length}`);
      for (const item of items.slice(0, 5)) {
        lines.push(`    [${item.trust}] ${item.code}: ${item.detail}`);
      }
      if (items.length > 5) {
        lines.push(`    ... and ${items.length - 5} more`);
      }
    }
  }

  // Trust summary
  const trusted = palette.colors.filter((c) => getColorTrust(findings, c.code) === 'trusted').length;
  const lowConf = palette.colors.filter((c) => getColorTrust(findings, c.code) === 'low-confidence').length;
  const untrusted = palette.colors.filter((c) => getColorTrust(findings, c.code) === 'untrusted').length;
  lines.push('');
  lines.push(`Trust summary: ${trusted} trusted, ${lowConf} low-confidence, ${untrusted} untrusted`);

  return lines.join('\n');
}
