import { BIRD_SCALE, CANVAS_HEIGHT, CANVAS_WIDTH, DOG_SCALE } from "./constants";
import { frameAt, spriteAtlas, type AnimationName, type FrameName } from "./atlas";
import type { BirdColor, TargetEntity } from "./types";

export function clearScene(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = false;
  drawBackground(ctx);
}

export function drawBackground(ctx: CanvasRenderingContext2D) {
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

export function drawDog(ctx: CanvasRenderingContext2D, image: HTMLImageElement, timeMs: number, state: "walk" | "flush" | "laugh" | "one" | "two") {
  let animation: AnimationName = "dog_walk";
  let x = 96;
  let y = CANVAS_HEIGHT - 255;
  let fps = 7;

  if (state === "flush") {
    animation = "dog_flush";
    x = 330;
    y = CANVAS_HEIGHT - 306;
    fps = 5;
  }

  if (state === "laugh") {
    animation = "dog_laugh";
    x = 430;
    y = CANVAS_HEIGHT - 232;
    fps = 5;
  }

  if (state === "one") {
    animation = "dog_retrieve_one";
    x = 410;
    y = CANVAS_HEIGHT - 238;
  }

  if (state === "two") {
    animation = "dog_retrieve_two";
    x = 385;
    y = CANVAS_HEIGHT - 238;
  }

  drawFrame(ctx, image, frameAt(animation, timeMs, fps), x, y, DOG_SCALE);
}

function birdAnimationName(color: BirdColor, flight: "side" | "diag" | "up", status: TargetEntity["status"]): AnimationName {
  if (status === "hit") return `bird_${color}_fall` as AnimationName;
  return `bird_${color}_${flight}` as AnimationName;
}

export function drawTarget(ctx: CanvasRenderingContext2D, image: HTMLImageElement, target: TargetEntity, timeMs: number) {
  if (target.kind === "clay") {
    drawClay(ctx, target);
    return;
  }

  const animation = birdAnimationName(target.color, target.flight, target.status);
  const frameName = target.status === "hit" && (timeMs - (target.hitAtMs ?? timeMs)) < 220
    ? (`bird_${target.color}_hit_01` as FrameName)
    : frameAt(animation, timeMs, 12);

  const [sx, sy, sw, sh] = spriteAtlas.frames[frameName];
  const drawX = target.x - (sw * BIRD_SCALE) / 2;
  const drawY = target.y - (sh * BIRD_SCALE) / 2;
  const flip = target.direction === -1;
  drawFrame(ctx, image, frameName, drawX, drawY, BIRD_SCALE, flip);
}

function drawClay(ctx: CanvasRenderingContext2D, target: TargetEntity) {
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.rotate((target.x + target.y) / 70);
  ctx.fillStyle = target.status === "hit" ? "#f8e58b" : "#f06b36";
  ctx.strokeStyle = "#08080c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (target.status === "hit") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-26, -24, 14, 14);
    ctx.fillRect(12, 16, 16, 13);
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
