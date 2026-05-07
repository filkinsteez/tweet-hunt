import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import type { BirdColor, GameMode, TargetEntity } from "./types";

export const NES_WIDTH = 256;
export const NES_HEIGHT = 240;
export const FPS = 60;
export const FIXED_STEP_MS = 1000 / FPS;

export type RngState = [number, number, number, number];
export type BoundaryType = "top" | "bottom" | "left" | "right";

export const SPEED_TABLE = [
  1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 2, 2, 1,
  2, 2, 2, 2, 3, 2, 3, 2, 3, 3, 3, 3, 4, 3, 4, 3,
  4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7
] as const;

export const MOTION_PATTERNS: Record<number, Array<[dy: number, dx: number]>> = {
  0: [[-1, 0]],
  1: [[-1, 1], [-1, 0], [-1, 0], [-1, 1], [-1, 0], [0, 0]],
  2: [[-1, 1], [-1, 1], [0, 0]],
  3: [[0, 1], [-1, 1], [0, 1], [-1, 1], [0, 1], [0, 0]],
  4: [[0, 1]],
  5: [[0, 1], [1, 1], [0, 1], [1, 1], [0, 1], [0, 0]],
  6: [[1, 1], [1, 1], [0, 0]],
  7: [[1, 1], [1, 0], [1, 0], [1, 1], [1, 0], [0, 0]],
  8: [[1, 0]],
  9: [[1, -1], [1, 0], [1, 0], [1, -1], [1, 0], [0, 0]],
  10: [[1, -1], [1, -1], [0, 0]],
  11: [[0, -1], [1, -1], [0, -1], [1, -1], [0, -1], [0, 0]],
  12: [[0, -1]],
  13: [[0, -1], [-1, -1], [0, -1], [-1, -1], [0, -1], [0, 0]],
  14: [[-1, -1], [-1, -1], [0, 0]],
  15: [[-1, -1], [-1, 0], [-1, 0], [-1, -1], [-1, 0], [0, 0]],
  16: [[2, 1], [2, -1]],
  17: [[-1, -2]],
  18: [[-2, -1]],
  19: [[-2, 0]],
  20: [[-2, 1]],
  21: [[-1, 2]]
};

export const GAME_A_LAUNCH_PATHS: Record<number, [startX: number, duration: number, motionCode: number]> = {
  0x10: [0x40, 0xe0, 0x01],
  0x11: [0x80, 0xe0, 0x02],
  0x12: [0xd0, 0xe0, 0x0e],
  0x13: [0x38, 0xe0, 0x01],
  0x14: [0xa0, 0xe0, 0x0d],
  0x15: [0x30, 0xe0, 0x03],
  0x16: [0xb0, 0xe0, 0x0e],
  0x17: [0x90, 0xe0, 0x0f],
  0x18: [0x40, 0xe0, 0x03],
  0x19: [0x80, 0xe0, 0x03],
  0x1a: [0xc8, 0xe0, 0x0e],
  0x1b: [0x50, 0xe0, 0x0f],
  0x1c: [0xb8, 0xe0, 0x0d],
  0x1d: [0x20, 0xe0, 0x03],
  0x1e: [0x48, 0xe0, 0x01],
  0x1f: [0xb8, 0xe0, 0x0f]
};

export const GAME_B_PATHS: Record<number, number[]> = {
  0: [0x9c, 0x18, 0x14, 0x10, 0x01, 0x10, 0x02, 0x20, 0x03, 0x08, 0x02, 0x08, 0x01, 0x18, 0x00, 0x10, 0x0e, 0x08, 0x0d, 0x20, 0x0c, 0x08, 0x0d, 0x08, 0x0c, 0xb0, 0x0b, 0x80, 0x03, 0x40, 0x02, 0xff, 0x08, 0x00],
  1: [0x88, 0x10, 0x12, 0x28, 0x0f, 0x08, 0x00, 0x10, 0x01, 0x08, 0x02, 0x48, 0x03, 0x20, 0x04, 0x70, 0x0c, 0x30, 0x0d, 0x30, 0x0e, 0xff, 0x08, 0x00],
  2: [0x90, 0x20, 0x12, 0x60, 0x0d, 0x90, 0x03, 0x78, 0x02, 0xff, 0x08, 0x00],
  3: [0x78, 0x20, 0x13, 0x40, 0x0f, 0x10, 0x0e, 0x20, 0x0d, 0x18, 0x0b, 0x20, 0x0a, 0x50, 0x06, 0x28, 0x04, 0x38, 0x03, 0x78, 0x02, 0xff, 0x08, 0x00],
  4: [0x80, 0x10, 0x12, 0x20, 0x0d, 0x08, 0x0e, 0x08, 0x0f, 0x20, 0x03, 0x10, 0x02, 0x08, 0x0e, 0x20, 0x0d, 0x08, 0x0e, 0x08, 0x0f, 0x08, 0x01, 0x08, 0x03, 0x30, 0x04, 0x40, 0x05, 0x80, 0x0b, 0x30, 0x0e, 0x60, 0x0f, 0xff, 0x08, 0x00],
  5: [0xb8, 0x08, 0x14, 0x10, 0x04, 0x08, 0x03, 0x08, 0x02, 0x08, 0x01, 0x08, 0x00, 0x08, 0x0e, 0x08, 0x0d, 0x08, 0x0c, 0x50, 0x0b, 0x60, 0x0c, 0x10, 0x0d, 0x40, 0x02, 0x70, 0x01, 0xff, 0x08, 0x00],
  6: [0x70, 0x18, 0x12, 0x40, 0x0d, 0x10, 0x0f, 0x10, 0x02, 0x30, 0x04, 0x20, 0x05, 0x40, 0x03, 0x20, 0x04, 0x20, 0x03, 0x18, 0x02, 0x20, 0x01, 0xff, 0x08, 0x00],
  7: [0xb0, 0x10, 0x14, 0x28, 0x02, 0x18, 0x01, 0x30, 0x00, 0x10, 0x0f, 0x50, 0x0b, 0x60, 0x0c, 0x20, 0x0b, 0x70, 0x04, 0x80, 0x05, 0xff, 0x08, 0x00],
  8: [0x5a, 0x08, 0x13, 0x10, 0x02, 0x20, 0x0d, 0x10, 0x03, 0x10, 0x04, 0x10, 0x03, 0x58, 0x0d, 0x28, 0x03, 0x48, 0x04, 0x10, 0x03, 0x48, 0x0d, 0x80, 0x03, 0xff, 0x08, 0x00],
  9: [0x46, 0x20, 0x12, 0x20, 0x0e, 0x38, 0x04, 0x18, 0x02, 0x10, 0x04, 0x20, 0x06, 0x08, 0x05, 0x18, 0x04, 0x18, 0x02, 0x40, 0x01, 0x40, 0x00, 0xff, 0x08, 0x00],
  10: [0xd0, 0x2a, 0x14, 0x30, 0x0c, 0x20, 0x0b, 0x20, 0x0c, 0x38, 0x0b, 0x48, 0x0c, 0x40, 0x02, 0x30, 0x0c, 0xff, 0x08, 0x00],
  11: [0x70, 0x10, 0x12, 0x10, 0x0d, 0x20, 0x0e, 0x10, 0x0f, 0x10, 0x00, 0x30, 0x02, 0x10, 0x04, 0x10, 0x05, 0x60, 0x05, 0x20, 0x0b, 0x40, 0x0c, 0x08, 0x0d, 0x70, 0x03, 0x30, 0x02, 0x18, 0x00, 0xff, 0x08, 0x00],
  12: [0xc0, 0x18, 0x12, 0x10, 0x0d, 0x40, 0x0b, 0x38, 0x0d, 0x08, 0x0b, 0x08, 0x0c, 0x10, 0x0d, 0x70, 0x03, 0x40, 0x02, 0x40, 0x01, 0xff, 0x08, 0x00],
  13: [0x90, 0x18, 0x14, 0x20, 0x02, 0x28, 0x0d, 0x20, 0x0b, 0x20, 0x0b, 0x08, 0x0c, 0x10, 0x0d, 0x20, 0x03, 0x20, 0x05, 0x20, 0x04, 0x10, 0x02, 0x10, 0x03, 0x70, 0x0d, 0x40, 0x04, 0x50, 0x03, 0x20, 0x02, 0xff, 0x08, 0x00],
  14: [0x58, 0x1c, 0x14, 0x24, 0x02, 0x08, 0x00, 0x48, 0x0c, 0x38, 0x0e, 0x50, 0x07, 0x30, 0x05, 0x30, 0x04, 0x28, 0x0d, 0x20, 0x02, 0x80, 0x01, 0xff, 0x08, 0x00],
  15: [0x50, 0x20, 0x12, 0x20, 0x0d, 0x40, 0x03, 0x30, 0x0c, 0x40, 0x03, 0x30, 0x04, 0x38, 0x05, 0x08, 0x0b, 0x28, 0x0c, 0x08, 0x0d, 0x40, 0x03, 0x4a, 0x04, 0xff, 0x08, 0x00]
};

export const CLAY_PATHS = [
  [0x00, 0x00, 0xc0, 0x15, 0x1e, 0x2c],
  [0x01, 0x00, 0xc0, 0x0a, 0x1e, 0x30],
  [0x03, 0x00, 0xd0, 0x10, 0x1e, 0x25],
  [0x04, 0x00, 0xc0, 0x00, 0x1c, 0x30],
  [0x06, 0x00, 0xc0, 0x0f, 0x1c, 0x30],
  [0x08, 0x00, 0xc0, 0xf6, 0x1c, 0x30],
  [0x09, 0x00, 0xc0, 0x0c, 0x1c, 0x30],
  [0x0a, 0x00, 0xc0, 0xf4, 0x1c, 0x30],
  [0x0c, 0x00, 0xc0, 0xf4, 0x1e, 0x2d],
  [0x0e, 0x00, 0xc0, 0x08, 0x1c, 0x30],
  [0x0a, 0x00, 0xc0, 0x00, 0x1d, 0x30],
  [0x11, 0x00, 0xb8, 0xee, 0x20, 0x33],
  [0x13, 0x00, 0xc8, 0xf0, 0x1c, 0x2a],
  [0x04, 0x80, 0xc8, 0xf7, 0x1c, 0x2d],
  [0x0a, 0x80, 0xc8, 0x0b, 0x1c, 0x2d],
  [0x0f, 0x80, 0xc6, 0xf3, 0x21, 0x26]
] as const;

export const CLAY_SPEED_INDEX_BY_ROW_AND_DISTANCE_CLASS = [
  0x14, 0x14, 0x10, 0x10, 0x10, 0x08, 0x04, 0x00,
  0x18, 0x14, 0x14, 0x10, 0x0c, 0x08, 0x04, 0x00,
  0x1c, 0x18, 0x18, 0x14, 0x10, 0x0c, 0x08, 0x04,
  0x20, 0x1c, 0x18, 0x14, 0x10, 0x0c, 0x08, 0x04,
  0x24, 0x20, 0x1c, 0x18, 0x14, 0x0c, 0x08, 0x04,
  0x28, 0x24, 0x20, 0x1c, 0x14, 0x10, 0x0c, 0x08,
  0x2c, 0x28, 0x24, 0x20, 0x18, 0x10, 0x0c, 0x08
] as const;

export const CLAY_IMAGE_BY_DISTANCE = [
  0x18, 0x18, 0x19, 0x1a, 0x1a, 0x1b, 0x1c, 0x1d,
  0x1e, 0x1e, 0x1f, 0x1f, 0x20, 0x20, 0x21, 0x21,
  0x22, 0x22, 0x22, 0x22, 0x23, 0x23, 0x23, 0x23
] as const;

const DUCK_ZAPPER_SHAPES: Record<number, Array<[dy: number, dx: number]>> = {
  9: [[-16, -16], [-16, -8], [-16, 0], [-16, 8], [-8, -16], [-8, -8], [-8, 0], [-8, 8], [0, -16], [0, -8], [0, 0], [0, 8], [8, -16], [8, -8], [8, 0], [8, 8]],
  10: [[-12, -11], [-12, -3], [-12, 3], [-4, -11], [-4, -3], [-4, 3], [4, -11], [4, -3], [4, 3]],
  11: [[-11, -9], [-11, -1], [-11, 1], [-3, -9], [-3, -1], [-3, 1], [3, -9], [3, -1], [3, 1]]
};

const CLAY_ZAPPER_OFFSETS: Record<number, Array<[dy: number, dx: number]>> = {
  0: [[-12, -12], [-12, -4], [-12, 4], [-4, -12], [-4, -4], [-4, 4], [4, -12], [4, -4], [4, 4]],
  1: [[-9, -11], [-9, -3], [-9, 3], [-1, -11], [-1, -3], [-1, 3], [1, -11], [1, -3], [1, 3]],
  2: [[-7, -9], [-7, -1], [-7, 1], [-1, -9], [-1, -1], [-1, 1]],
  3: [[-6, -8], [-6, 0], [-2, -8], [-2, 0]],
  4: [[-6, -6], [-6, -2], [-2, -6], [-2, -2]],
  5: [[-4, -4]]
};

const CLAY_ZAPPER_SHAPES = [0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] as const;

export function createRng(seed = 0x5f): RngState {
  const first = seed === 0 ? 0x5f : seed & 0xff;
  return [first, 0xa7, 0x4d, 0x1b];
}

export function rngNext(state: RngState) {
  const feedback = ((state[0] & 0x02) ^ (state[1] & 0x02)) !== 0;
  let carry = feedback ? 1 : 0;
  for (let index = 0; index < 4; index += 1) {
    const old = state[index];
    state[index] = ((carry << 7) | (old >> 1)) & 0xff;
    carry = old & 0x01;
  }
  return state[0];
}

export function canvasToNesX(x: number) {
  return Math.floor((x / CANVAS_WIDTH) * NES_WIDTH);
}

export function canvasToNesY(y: number) {
  return Math.floor((y / CANVAS_HEIGHT) * NES_HEIGHT);
}

export function nesToCanvasX(x: number) {
  return (x / NES_WIDTH) * CANVAS_WIDTH;
}

export function nesToCanvasY(y: number) {
  return (y / NES_HEIGHT) * CANVAS_HEIGHT;
}

export function syncCanvasPosition(target: TargetEntity) {
  target.x = nesToCanvasX(target.nesX ?? canvasToNesX(target.x));
  target.y = nesToCanvasY(target.nesY ?? canvasToNesY(target.y));
}

export function passLineForRoundSpec(roundNumber: number) {
  if (roundNumber <= 10) return 6;
  if (roundNumber <= 12) return 7;
  if (roundNumber <= 14) return 8;
  if (roundNumber <= 19) return 9;
  return 10;
}

export function duckSpeedIndexForRound(roundNumber: number) {
  if (roundNumber <= 1) return 0x10;
  if (roundNumber <= 3) return 0x14;
  if (roundNumber <= 5) return 0x18;
  if (roundNumber <= 7) return 0x1c;
  if (roundNumber <= 9) return 0x20;
  if (roundNumber <= 11) return 0x24;
  return 0x28;
}

export function gameBDuckSpeedIndex(roundNumber: number, color: BirdColor) {
  const row =
    roundNumber <= 1 ? [0x04, 0x08, 0x0c] :
      roundNumber <= 3 ? [0x08, 0x0c, 0x10] :
        roundNumber <= 4 ? [0x0c, 0x10, 0x14] :
          roundNumber <= 6 ? [0x10, 0x14, 0x18] :
            roundNumber <= 8 ? [0x14, 0x1c, 0x1c] :
              roundNumber <= 9 ? [0x18, 0x1c, 0x1c] :
                [0x1c, 0x1c, 0x20];
  return row[colorIndex(color)];
}

export function flyAwayTimerForRound(roundNumber: number) {
  const extraScreenTimeFrames = 18;
  if (roundNumber <= 10) return 0x7d + extraScreenTimeFrames;
  if (roundNumber <= 19) return 0x5d + extraScreenTimeFrames;
  return 0x3e + extraScreenTimeFrames;
}

export function duckZapperShapeForRound(roundNumber: number) {
  if (roundNumber <= 23) return 9;
  if (roundNumber <= 26) return 10;
  return 11;
}

export function duckScoreForRound(roundNumber: number, color: BirdColor) {
  const scores = roundNumber <= 5 ? [500, 1000, 1500] : roundNumber <= 10 ? [800, 1600, 2400] : [1000, 2000, 3000];
  return scores[colorIndex(color)];
}

export function clayScoreForRound(roundNumber: number) {
  if (roundNumber <= 5) return 1000;
  if (roundNumber <= 10) return 1500;
  return 2000;
}

export function perfectBonusForRound(roundNumber: number) {
  if (roundNumber <= 10) return 10000;
  if (roundNumber <= 15) return 15000;
  if (roundNumber <= 20) return 20000;
  return 30000;
}

export function readSpeedAndAdvance(target: TargetEntity) {
  const cycleStart = (target.speedIndex ?? 0x10) & 0xfc;
  const cycleOffset = (target.speedIndex ?? 0x10) & 0x03;
  const steps = SPEED_TABLE[cycleStart + cycleOffset] ?? 1;
  target.speedIndex = cycleStart + ((cycleOffset + 1) & 3);
  return steps;
}

export function setMotionCode(target: TargetEntity, motionCode: number) {
  target.motionCode = motionCode & 0x1f;
  target.motionPatternIndex = 0;
  const dx = representativeDx(target.motionCode);
  if (dx > 0) target.direction = 1;
  if (dx < 0) target.direction = -1;
  target.flight = motionCodeToFlight(target.motionCode);
}

export function applyNextMotionMicroDelta(target: TargetEntity) {
  const pattern = MOTION_PATTERNS[target.motionCode ?? 0] ?? MOTION_PATTERNS[0];
  const index = target.motionPatternIndex ?? 0;
  const [dy, dx] = pattern[index % pattern.length];
  target.nesX = (target.nesX ?? canvasToNesX(target.x)) + dx;
  target.nesY = (target.nesY ?? canvasToNesY(target.y)) + dy;
  target.motionPatternIndex = (index + 1) % pattern.length;
  if (dx > 0) target.direction = 1;
  if (dx < 0) target.direction = -1;
  target.flight = motionCodeToFlight(target.motionCode ?? 0);
  syncCanvasPosition(target);
}

export function chooseBoundaryMotion(target: TargetEntity, boundaryType: BoundaryType, rng: RngState) {
  let boundaryCode = 0;
  let sideBase = 0;
  const motionCode = target.motionCode ?? 0;

  if (boundaryType === "top") {
    target.nesY = (target.nesY ?? 0) + 1;
    boundaryCode = 0;
    sideBase = motionCode & 0x08;
  } else if (boundaryType === "bottom") {
    target.nesY = (target.nesY ?? 0) - 1;
    boundaryCode = 2;
    sideBase = motionCode & 0x08;
  } else if (boundaryType === "left") {
    target.nesX = (target.nesX ?? 0) + 1;
    boundaryCode = 4;
    sideBase = 0;
  } else {
    target.nesX = (target.nesX ?? 0) - 1;
    boundaryCode = 2;
    sideBase = 0x08;
  }

  const base = ((motionCode & 0x07) ^ 0x07) | sideBase;
  let randomOffset = rngNext(rng) & 0x03;
  if (randomOffset === 3) randomOffset = 2;
  let candidate = base + randomOffset;

  if (candidate === 0) candidate += boundaryCode === 2 ? -1 : 1;
  else if (candidate === 4) candidate += boundaryCode === 0 ? 1 : boundaryCode === 2 ? -1 : randomPlusMinusOne(rng);
  else if (candidate === 8) candidate += boundaryCode === 0 ? randomPlusMinusOne(rng) : -1;
  else if (candidate === 12) candidate += boundaryCode === 0 ? -1 : 1;

  setMotionCode(target, candidate & 0x0f);
  syncCanvasPosition(target);
}

export function pointHitsZapperShape(pointX: number, pointY: number, targetX: number, targetY: number, shapeId: number) {
  const offsets = DUCK_ZAPPER_SHAPES[shapeId] ?? CLAY_ZAPPER_OFFSETS[shapeId];
  if (!offsets) return false;

  return offsets.some(([dy, dx]) => {
    const rectX = targetX + dx;
    const rectY = targetY + dy;
    return pointX >= rectX && pointX < rectX + 8 && pointY >= rectY && pointY < rectY + 8;
  });
}

export function clayZapperShape(roundNumber: number, imageIndex: number) {
  const difficultyOffset = roundNumber <= 11 ? 0 : roundNumber <= 22 ? 3 : 6;
  return CLAY_ZAPPER_SHAPES[Math.min(difficultyOffset + imageIndex, CLAY_ZAPPER_SHAPES.length - 1)];
}

export function clayRowOffset(roundNumber: number) {
  if (roundNumber <= 1) return 0x00;
  if (roundNumber <= 2) return 0x08;
  if (roundNumber <= 3) return 0x10;
  if (roundNumber <= 5) return 0x18;
  if (roundNumber <= 7) return 0x20;
  if (roundNumber <= 9) return 0x28;
  return 0x30;
}

export function initializeClayMemory(path: readonly number[]) {
  const memory = Array.from({ length: 15 }, () => 0);
  memory[4] = path[0];
  memory[3] = path[1];
  memory[10] = path[2];
  memory[2] = path[3];
  memory[7] = path[4];
  memory[12] = path[5];
  return memory;
}

export function updateClayFixedPoint(memory: number[]) {
  for (const base of [10, 5, 0]) {
    const acc = memory[base];
    const signAcc = signByte(acc);
    const sum1 = acc + memory[base + 1];
    const carry1 = sum1 > 0xff ? 1 : 0;
    memory[base + 1] = sum1 & 0xff;
    const sum2 = signAcc + memory[base + 2] + carry1;
    memory[base + 2] = sum2 & 0xff;
    const signVelHigh = signByte(memory[base + 2]);
    const carryFromVelLowShift = memory[base + 1] & 0x80 ? 1 : 0;
    memory[base + 1] = (memory[base + 1] << 1) & 0xff;
    const sum3 = memory[base + 2] + memory[base + 3] + carryFromVelLowShift;
    const carry3 = sum3 > 0xff ? 1 : 0;
    memory[base + 3] = sum3 & 0xff;
    memory[base + 4] = (signVelHigh + memory[base + 4] + carry3) & 0xff;
  }
}

export function projectClay(memory: number[]) {
  const z = Math.max(1, memory[9]);
  const rawX = signed16((memory[4] << 8) | memory[3]);
  const rawY = signed16((memory[14] << 8) | memory[13]);
  return {
    x: 128 + (rawX * 108) / (z + 32),
    y: 176 - (rawY * 80) / (z + 32)
  };
}

export function clayDistanceClass(memory: number[]) {
  if (signedByte(memory[12]) < 0) return 7;
  return Math.min(memory[9] >> 2, 7);
}

export function clayImageIndex(memory: number[]) {
  return Math.min(memory[9] >> 1, 23);
}

export function targetCleared(target: TargetEntity) {
  target.status = "escaped";
  target.mechanicsState = "clear";
}

export function motionCodeToFlight(motionCode: number): "side" | "diag" {
  const vertical = Math.abs(representativeDy(motionCode));
  const horizontal = Math.abs(representativeDx(motionCode));
  return vertical > 0 && horizontal > 0 ? "diag" : "side";
}

export function targetColorForIndex(index: number): BirdColor {
  return index === 2 ? "red" : index === 1 ? "blue" : "green";
}

export function colorIndex(color: BirdColor) {
  if (color === "red") return 2;
  if (color === "blue") return 1;
  return 0;
}

function representativeDx(motionCode: number) {
  const pattern = MOTION_PATTERNS[motionCode] ?? MOTION_PATTERNS[0];
  return pattern.reduce((sum, [, dx]) => sum + dx, 0);
}

function representativeDy(motionCode: number) {
  const pattern = MOTION_PATTERNS[motionCode] ?? MOTION_PATTERNS[0];
  return pattern.reduce((sum, [dy]) => sum + dy, 0);
}

function randomPlusMinusOne(rng: RngState) {
  return (rngNext(rng) & 0x80) !== 0 ? 1 : -1;
}

function signedByte(value: number) {
  return value & 0x80 ? value - 0x100 : value;
}

function signByte(value: number) {
  return value & 0x80 ? 0xff : 0x00;
}

function signed16(value: number) {
  return value & 0x8000 ? value - 0x10000 : value;
}

export function modeReleaseDelay(mode: GameMode) {
  return mode === "C" ? 0x80 : 0x30;
}
