export type RosaryPoint = {
  x: number;
  y: number;
};

export type TasbeehGeometry = {
  canvasWidth: number;
  canvasHeight: number;
  beadCount: number;
  beadSize: number;
  ringSize: number;
  ringHeight: number;
  ringStrokeWidth: number;
  radius: number;
  radiusY: number;
  centerX: number;
  centerY: number;
  rotationDeg: number;
  baseAngles: number[];
  followSpeed: number;
};

type TasbeehGeometryOptions = {
  canvasHeight?: number;
  ringScale?: number;
  ringHeightScale?: number;
  beadCount?: number;
  beadScale?: number;
  centerXRatio?: number;
  centerYRatio?: number;
  rotationDeg?: number;
  startAngle?: number;
  bigGap?: number;
  bigGapAfter?: number;
};

const TASBEEH_BEAD_COUNT = 18;
const START_ANGLE = 205;
const BIG_GAP = 80;
const BIG_GAP_AFTER = 5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeRosaryAngle = (angle: number) => {
  'worklet';

  const wrapped = angle % 360;
  return wrapped >= 0 ? wrapped : wrapped + 360;
};

export const shortestAngleDelta = (from: number, to: number) => {
  'worklet';

  const start = normalizeRosaryAngle(from);
  const end = normalizeRosaryAngle(to);
  let delta = end - start;

  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;

  return delta;
};

const createBaseAngles = (
  beadCount: number,
  startAngle: number,
  bigGap: number,
  bigGapAfter: number,
) => {
  const angles: number[] = [];
  const smallGap = (360 - bigGap) / (beadCount - 1);
  let angle = startAngle;

  for (let index = 0; index < beadCount; index += 1) {
    angles.push(normalizeRosaryAngle(angle));

    if (index < beadCount - 1) {
      angle += index === bigGapAfter ? bigGap : smallGap;
    }
  }

  return angles;
};

export const getBeadAngleForStep = (
  identityIndex: number,
  step: number,
  baseAngles: number[],
  beadCount: number,
  stepDirection: 1 | -1 = -1,
) => {
  'worklet';

  const slotIndex = ((identityIndex + step * stepDirection) % beadCount + beadCount) % beadCount;
  return baseAngles[slotIndex] ?? 0;
};

export const getAnglesForStep = (
  step: number,
  baseAngles: number[],
  beadCount: number,
  stepDirection: 1 | -1 = -1,
) => {
  'worklet';

  const angles = new Array<number>(beadCount);

  for (let index = 0; index < beadCount; index += 1) {
    angles[index] = getBeadAngleForStep(index, step, baseAngles, beadCount, stepDirection);
  }

  return angles;
};

export const getRosaryPointAtAngle = (
  angleDeg: number,
  geometry: TasbeehGeometry,
): RosaryPoint => {
  'worklet';

  const rad = (angleDeg * Math.PI) / 180;

  return {
    x: geometry.centerX + geometry.radius * Math.cos(rad),
    y: geometry.centerY + geometry.radiusY * Math.sin(rad),
  };
};

export const buildTasbeehGeometry = (
  availableWidth: number,
  options: TasbeehGeometryOptions = {},
): TasbeehGeometry => {
  const canvasSize = clamp(availableWidth, 280, 420);
  const canvasHeight = options.canvasHeight ?? canvasSize;
  const beadCount = options.beadCount ?? TASBEEH_BEAD_COUNT;
  const ringSize = canvasSize * (options.ringScale ?? (520 / 760));
  const ringHeight = ringSize * (options.ringHeightScale ?? 1);
  const beadScale = options.beadScale ?? 1;
  const centerX = canvasSize * (options.centerXRatio ?? 0.5);
  const centerY = canvasHeight * (options.centerYRatio ?? 0.5);
  const rotationDeg = options.rotationDeg ?? 0;
  const startAngle = options.startAngle ?? START_ANGLE;
  const bigGap = options.bigGap ?? BIG_GAP;
  const bigGapAfter = options.bigGapAfter ?? BIG_GAP_AFTER;

  return {
    canvasWidth: canvasSize,
    canvasHeight,
    beadCount,
    beadSize: clamp(ringSize * (56 / 520) * beadScale, 30, 56),
    ringSize,
    ringHeight,
    ringStrokeWidth: clamp(ringSize * (4 / 520), 2.5, 4),
    radius: ringSize / 2,
    radiusY: ringHeight / 2,
    centerX,
    centerY,
    rotationDeg,
    baseAngles: createBaseAngles(beadCount, startAngle, bigGap, bigGapAfter),
    followSpeed: 0.18,
  };
};
