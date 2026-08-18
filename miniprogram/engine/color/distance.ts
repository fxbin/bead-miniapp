import type { LabColor, OKLabColor, RGBColor } from './types';

function squared(value: number): number {
  return value * value;
}

export function rgbDistance(left: RGBColor, right: RGBColor): number {
  return Math.sqrt(
    squared(left.r - right.r) +
      squared(left.g - right.g) +
      squared(left.b - right.b)
  );
}

export function deltaE76(left: LabColor, right: LabColor): number {
  return Math.sqrt(
    squared(left.L - right.L) +
      squared(left.a - right.a) +
      squared(left.b - right.b)
  );
}

export function oklabDistance(left: OKLabColor, right: OKLabColor): number {
  return Math.sqrt(
    squared(left.L - right.L) +
      squared(left.a - right.a) +
      squared(left.b - right.b)
  );
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function hueDegrees(b: number, aPrime: number): number {
  if (aPrime === 0 && b === 0) {
    return 0;
  }

  const angle = radiansToDegrees(Math.atan2(b, aPrime));
  return angle >= 0 ? angle : angle + 360;
}

/**
 * CIEDE2000 (kL = kC = kH = 1).
 * Implementation follows the Sharma/Wu/Dalal reference formulation.
 */
export function deltaE2000(left: LabColor, right: LabColor): number {
  const L1 = left.L;
  const a1 = left.a;
  const b1 = left.b;
  const L2 = right.L;
  const a2 = right.a;
  const b2 = right.b;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const meanC = (C1 + C2) / 2;
  const meanC7 = Math.pow(meanC, 7);
  const twentyFive7 = Math.pow(25, 7);
  const G = 0.5 * (1 - Math.sqrt(meanC7 / (meanC7 + twentyFive7)));

  const a1Prime = (1 + G) * a1;
  const a2Prime = (1 + G) * a2;
  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);
  const h1Prime = hueDegrees(b1, a1Prime);
  const h2Prime = hueDegrees(b2, a2Prime);

  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;

  let deltaHAngle = 0;
  if (C1Prime * C2Prime !== 0) {
    const rawHueDelta = h2Prime - h1Prime;
    if (Math.abs(rawHueDelta) <= 180) {
      deltaHAngle = rawHueDelta;
    } else if (rawHueDelta > 180) {
      deltaHAngle = rawHueDelta - 360;
    } else {
      deltaHAngle = rawHueDelta + 360;
    }
  }

  const deltaHPrime =
    2 * Math.sqrt(C1Prime * C2Prime) * Math.sin(degreesToRadians(deltaHAngle / 2));

  const meanLPrime = (L1 + L2) / 2;
  const meanCPrime = (C1Prime + C2Prime) / 2;

  let meanHPrime = h1Prime + h2Prime;
  if (C1Prime * C2Prime !== 0) {
    const hueDifference = Math.abs(h1Prime - h2Prime);
    if (hueDifference <= 180) {
      meanHPrime = (h1Prime + h2Prime) / 2;
    } else if (h1Prime + h2Prime < 360) {
      meanHPrime = (h1Prime + h2Prime + 360) / 2;
    } else {
      meanHPrime = (h1Prime + h2Prime - 360) / 2;
    }
  }

  const T =
    1 -
    0.17 * Math.cos(degreesToRadians(meanHPrime - 30)) +
    0.24 * Math.cos(degreesToRadians(2 * meanHPrime)) +
    0.32 * Math.cos(degreesToRadians(3 * meanHPrime + 6)) -
    0.2 * Math.cos(degreesToRadians(4 * meanHPrime - 63));

  const deltaTheta =
    30 * Math.exp(-squared((meanHPrime - 275) / 25));
  const meanCPrime7 = Math.pow(meanCPrime, 7);
  const RC = 2 * Math.sqrt(meanCPrime7 / (meanCPrime7 + twentyFive7));

  const lightnessDelta = meanLPrime - 50;
  const SL = 1 + (0.015 * lightnessDelta * lightnessDelta) /
    Math.sqrt(20 + lightnessDelta * lightnessDelta);
  const SC = 1 + 0.045 * meanCPrime;
  const SH = 1 + 0.015 * meanCPrime * T;
  const RT = -Math.sin(degreesToRadians(2 * deltaTheta)) * RC;

  const lightnessTerm = deltaLPrime / SL;
  const chromaTerm = deltaCPrime / SC;
  const hueTerm = deltaHPrime / SH;

  return Math.sqrt(
    lightnessTerm * lightnessTerm +
      chromaTerm * chromaTerm +
      hueTerm * hueTerm +
      RT * chromaTerm * hueTerm
  );
}
