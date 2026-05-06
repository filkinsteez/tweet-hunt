import { BIRD_SCALE, CANVAS_HEIGHT, CANVAS_WIDTH, DOG_SCALE, HIT_REACTION_DURATION_MS } from "./constants";
import { frameAt, spriteAtlas, type AnimationName, type FrameName } from "./atlas";
import type { BirdColor, TargetEntity } from "./types";

export type FlyFrameImages = {
  image: HTMLImageElement;
  columns: number;
  rows: number;
};

const DOG_POSES = {
  walk: { x: 96, y: CANVAS_HEIGHT - 255 },
  flush: { x: 330, y: CANVAS_HEIGHT - 306 },
  laugh: { x: 430, y: CANVAS_HEIGHT - 365 },
  one: { x: 410, y: CANVAS_HEIGHT - 365 },
  two: { x: 385, y: CANVAS_HEIGHT - 365 }
};

const INTRO_WALK_MS = 3600;
const INTRO_FOUND_MS = 500;
const INTRO_WALK_FPS = 11;
const INTRO_JUMP_UP_FRAMES = 9;
const INTRO_JUMP_FALL_FRAMES = 14;
const INTRO_JUMP_FRAMES = INTRO_JUMP_UP_FRAMES + INTRO_JUMP_FALL_FRAMES;
const INTRO_JUMP_MS = 920;
const FLY_SPRITE_SIZE = 117;
const FLY_ANIMATION_FPS = 12;
const DOG_ONE_BIRD_WIDTH = 132;
const DOG_TWO_BIRD_WIDTH = 168;
const DOG_ONE_BIRD_Y = CANVAS_HEIGHT - 365;
const DOG_TWO_BIRD_Y = CANVAS_HEIGHT - 365;
const DOG_RETRIEVE_Y_NUDGE = 7;
const INTRO_JUMP_Y_OFFSETS = [
  -45,
  -82,
  -112,
  -134,
  -148,
  -156,
  -159,
  -160,
  -160,
  -159,
  -157,
  -153,
  -147,
  -139,
  -128,
  -114,
  -97,
  -78,
  -58,
  -37,
  -16,
  2,
  18
] satisfies number[];

export function clearScene(ctx: CanvasRenderingContext2D, backgroundImage?: HTMLImageElement | null) {
  ctx.imageSmoothingEnabled = false;
  drawBackground(ctx, backgroundImage);
}

export function drawBackground(ctx: CanvasRenderingContext2D, backgroundImage?: HTMLImageElement | null) {
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  ctx.fillStyle = "#63c8ff";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  drawCloud(ctx, 110, 94, 1.2);
  drawCloud(ctx, 630, 78, 1.05);
  drawCloud(ctx, 780, 170, 0.75);

  ctx.fillStyle = "#2bb44a";
  ctx.fillRect(0, CANVAS_HEIGHT - 132, CANVAS_WIDTH, 132);
  ctx.fillStyle = "#1f9239";
  for (let x = 0; x < CANVAS_WIDTH; x += 22) {
    ctx.fillRect(x, CANVAS_HEIGHT - 132 + ((x / 22) % 2) * 7, 12, 132);
  }

  ctx.fillStyle = "#145d29";
  ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);
}

export function drawMidground(ctx: CanvasRenderingContext2D, midgroundImage?: HTMLImageElement | null) {
  if (midgroundImage) {
    ctx.drawImage(midgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  const grassTop = 425;

  ctx.fillStyle = "#2bb44a";
  ctx.fillRect(0, grassTop, CANVAS_WIDTH, CANVAS_HEIGHT - grassTop);
  ctx.fillStyle = "#1f9239";
  for (let x = 0; x < CANVAS_WIDTH; x += 22) {
    ctx.fillRect(x, grassTop + ((x / 22) % 2) * 7, 12, CANVAS_HEIGHT - grassTop);
  }
}

export function drawTreeLayer(ctx: CanvasRenderingContext2D, treeImage?: HTMLImageElement | null) {
  if (!treeImage) return;

  ctx.drawImage(treeImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function drawForeground(ctx: CanvasRenderingContext2D, foregroundImage?: HTMLImageElement | null) {
  if (!foregroundImage) return;

  ctx.drawImage(foregroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.beginPath();
  ctx.arc(x, y, 24 * scale, 0, Math.PI * 2);
  ctx.arc(x + 28 * scale, y - 10 * scale, 30 * scale, 0, Math.PI * 2);
  ctx.arc(x + 64 * scale, y, 24 * scale, 0, Math.PI * 2);
  ctx.rect(x - 2 * scale, y, 70 * scale, 24 * scale);
  ctx.fill();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frameName: FrameName,
  x: number,
  y: number,
  scale: number,
  flipX = false
) {
  const [sx, sy, sw, sh] = spriteAtlas.frames[frameName];
  ctx.save();
  if (flipX) {
    ctx.translate(x + sw * scale, y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
  } else {
    ctx.drawImage(image, sx, sy, sw, sh, x, y, sw * scale, sh * scale);
  }
  ctx.restore();
}

export function drawDog(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  timeMs: number,
  state: "walk" | "flush" | "laugh" | "one" | "two",
  yOffset = 0,
  centerX?: number,
  oneBirdImage?: HTMLImageElement | null,
  twoBirdImage?: HTMLImageElement | null
) {
  if (state === "one" && oneBirdImage) {
    drawOneBirdDog(ctx, oneBirdImage, yOffset, centerX);
    return;
  }
  if (state === "two" && twoBirdImage) {
    drawTwoBirdDog(ctx, twoBirdImage, yOffset, centerX);
    return;
  }

  let animation: AnimationName = "dog_walk";
  let { x, y } = DOG_POSES.walk;
  let fps = 7;

  if (state === "flush") {
    animation = "dog_flush";
    ({ x, y } = DOG_POSES.flush);
    fps = 5;
  }

  if (state === "laugh") {
    animation = "dog_laugh";
    ({ x, y } = DOG_POSES.laugh);
    fps = 5;
  }

  if (state === "one") {
    animation = "dog_retrieve_one";
    ({ x, y } = DOG_POSES.one);
  }

  if (state === "two") {
    animation = "dog_retrieve_two";
    ({ x, y } = DOG_POSES.two);
  }

  const frameName = frameAt(animation, timeMs, fps);
  const [, , width] = spriteAtlas.frames[frameName];
  const drawX = centerX === undefined ? x : centerX - (width * DOG_SCALE) / 2;

  drawFrame(ctx, image, frameName, drawX, y + yOffset, DOG_SCALE);
}

function drawOneBirdDog(ctx: CanvasRenderingContext2D, image: HTMLImageElement, yOffset = 0, centerX?: number) {
  const width = DOG_ONE_BIRD_WIDTH;
  const height = (image.naturalHeight / image.naturalWidth) * width;
  const drawX = centerX === undefined ? CANVAS_WIDTH / 2 - width / 2 : centerX - width / 2;

  ctx.drawImage(image, drawX, DOG_ONE_BIRD_Y - DOG_RETRIEVE_Y_NUDGE + yOffset, width, height);
}

function drawTwoBirdDog(ctx: CanvasRenderingContext2D, image: HTMLImageElement, yOffset = 0, centerX?: number) {
  const width = DOG_TWO_BIRD_WIDTH;
  const height = (image.naturalHeight / image.naturalWidth) * width;
  const drawX = centerX === undefined ? CANVAS_WIDTH / 2 - width / 2 : centerX - width / 2;

  ctx.drawImage(image, drawX, DOG_TWO_BIRD_Y - DOG_RETRIEVE_Y_NUDGE + yOffset, width, height);
}

export function drawIntroDog(ctx: CanvasRenderingContext2D, image: HTMLImageElement, elapsedMs: number, timeMs: number) {
  const groundY = CANVAS_HEIGHT - 265;
  const centerDogX = CANVAS_WIDTH / 2 - (53 * DOG_SCALE) / 2;
  const introStartX = 0;
  const introEndX = centerDogX - 85;

  if (elapsedMs < INTRO_WALK_MS) {
    const progress = elapsedMs / INTRO_WALK_MS;
    drawFrame(ctx, image, frameAt("dog_walk", timeMs, INTRO_WALK_FPS), introStartX + progress * (introEndX - introStartX), groundY, DOG_SCALE);
    return;
  }

  if (elapsedMs < INTRO_WALK_MS + INTRO_FOUND_MS) {
    drawFrame(ctx, image, "dog_found", introEndX, groundY - 16, DOG_SCALE);
    return;
  }

  const jumpFrameIndex = introJumpFrameIndex(elapsedMs);
  const jumpProgress = jumpFrameIndex / (INTRO_JUMP_FRAMES - 1);
  const jumpX = introEndX + 48 + jumpProgress * 120;
  const jumpY = groundY + INTRO_JUMP_Y_OFFSETS[jumpFrameIndex];
  const jumpFrame = jumpFrameIndex < INTRO_JUMP_UP_FRAMES ? "dog_jump_01" : "dog_jump_02";
  drawFrame(ctx, image, jumpFrame, jumpX, jumpY, DOG_SCALE);
}

export function isIntroDogBehindGrass(elapsedMs: number) {
  if (elapsedMs < INTRO_WALK_MS + INTRO_FOUND_MS) return false;

  return introJumpFrameIndex(elapsedMs) >= INTRO_JUMP_UP_FRAMES;
}

function introJumpFrameIndex(elapsedMs: number) {
  const jumpElapsedMs = Math.max(elapsedMs - INTRO_WALK_MS - INTRO_FOUND_MS, 0);
  const frameMs = INTRO_JUMP_MS / INTRO_JUMP_FRAMES;
  return Math.min(Math.floor(jumpElapsedMs / frameMs), INTRO_JUMP_FRAMES - 1);
}

function birdAnimationName(color: BirdColor, flight: "side" | "diag", status: TargetEntity["status"]): AnimationName {
  if (status === "hit") return `bird_${color}_fall` as AnimationName;
  return `bird_${color}_${flight}` as AnimationName;
}

function birdFrameName(target: TargetEntity, timeMs: number): FrameName {
  if (target.status === "hit" && timeMs - (target.hitAtMs ?? timeMs) < HIT_REACTION_DURATION_MS) {
    return frameAt(`bird_${target.color}_hit` as AnimationName, timeMs, 12);
  }

  return frameAt(birdAnimationName(target.color, target.flight, target.status), timeMs, 12);
}

export function drawTarget(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  target: TargetEntity,
  timeMs: number,
  flyFrames?: FlyFrameImages | null,
  birdShotImage?: HTMLImageElement | null
) {
  if (target.mechanicsState === "waiting" || target.mechanicsState === "clear") return;

  if (target.kind === "clay") {
    drawClay(ctx, target);
    return;
  }

  if (flyFrames) {
    drawFlyTarget(ctx, flyFrames, target, timeMs, birdShotImage);
    return;
  }

  const frameName = birdFrameName(target, timeMs);
  const [sx, sy, sw, sh] = spriteAtlas.frames[frameName];
  const drawX = target.x - (sw * BIRD_SCALE) / 2;
  const drawY = target.y - (sh * BIRD_SCALE) / 2;
  const flip = target.direction === -1;
  drawFrame(ctx, image, frameName, drawX, drawY, BIRD_SCALE, flip);
}

function drawFlyTarget(
  ctx: CanvasRenderingContext2D,
  frames: FlyFrameImages,
  target: TargetEntity,
  timeMs: number,
  birdShotImage?: HTMLImageElement | null
) {
  const cellWidth = frames.image.naturalWidth / frames.columns;
  const cellHeight = frames.image.naturalHeight / frames.rows;
  const flightRow = flightRowForTarget(target);
  const hitAgeMs = target.status === "hit" ? timeMs - (target.hitAtMs ?? timeMs) : Number.POSITIVE_INFINITY;
  const frameIndex =
    target.status === "hit" && hitAgeMs >= HIT_REACTION_DURATION_MS
      ? 1
      : Math.floor((timeMs / 1000) * FLY_ANIMATION_FPS) % frames.columns;
  const direction = target.direction === -1 ? -1 : 1;
  const fallAgeMs = target.status === "hit" ? Math.max(hitAgeMs - HIT_REACTION_DURATION_MS, 0) : 0;
  const fallRotation = Math.min(fallAgeMs / 500, 1) * direction * 0.8;
  const flightTilt = target.status === "hit" ? fallRotation : Math.max(Math.min(target.vy / 320, 0.25), -0.25);

  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.scale(direction, 1);
  ctx.rotate(flightTilt);
  if (target.status === "hit" && hitAgeMs < HIT_REACTION_DURATION_MS && birdShotImage) {
    ctx.drawImage(
      birdShotImage,
      -FLY_SPRITE_SIZE / 2,
      -FLY_SPRITE_SIZE / 2,
      FLY_SPRITE_SIZE,
      FLY_SPRITE_SIZE
    );
    ctx.restore();
    return;
  }

  ctx.drawImage(
    frames.image,
    frameIndex * cellWidth,
    flightRow * cellHeight,
    cellWidth,
    cellHeight,
    -FLY_SPRITE_SIZE / 2,
    -FLY_SPRITE_SIZE / 2,
    FLY_SPRITE_SIZE,
    FLY_SPRITE_SIZE
  );
  ctx.restore();
}

function flightRowForTarget(target: TargetEntity) {
  if (target.status === "hit") return 0;
  if (target.motionCode === 0 || target.motionCode === 16 || target.motionCode === 19) return Math.min(2, target.flight === "diag" ? 1 : 2);

  if (target.flight === "diag") return 1;
  return 0;
}

function drawClay(ctx: CanvasRenderingContext2D, target: TargetEntity) {
  const shrink = Math.max(0.35, 1 - (target.clayImageIndex ?? 0) / 34);
  const width = 34 * shrink;
  const height = 12 * shrink;

  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.rotate((target.x + target.y) / 70);
  ctx.fillStyle = target.status === "hit" ? "#f8e58b" : "#f06b36";
  ctx.strokeStyle = "#08080c";
  ctx.lineWidth = Math.max(2, 4 * shrink);
  ctx.beginPath();
  ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (target.status === "hit") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-26 * shrink, -24 * shrink, 14 * shrink, 14 * shrink);
    ctx.fillRect(12 * shrink, 16 * shrink, 16 * shrink, 13 * shrink);
  }
  ctx.restore();
}

export function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = "#fff8d7";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.moveTo(x - 28, y);
  ctx.lineTo(x - 8, y);
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + 28, y);
  ctx.moveTo(x, y - 28);
  ctx.lineTo(x, y - 8);
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x, y + 28);
  ctx.stroke();
  ctx.restore();
}
