"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import backgroundAsset from "../../Assets/Sprites/Environment/background.jpg";
import dogTwoBirdAsset from "../../Assets/Sprites/Environment/dog_2bird.png";
import foregroundAsset from "../../Assets/Sprites/Environment/foreground.png";
import chatGptBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_birdsprite_fly.png";
import birdShotAsset from "../../Assets/Sprites/Bird/Bird Misc/bird_shot.png";
import dogOneBirdAsset from "../../Assets/Sprites/Environment/dog_1bird.png";
import midgroundAsset from "../../Assets/Sprites/Environment/midground.png";
import treeAsset from "../../Assets/Sprites/Environment/tree.png";
import ducksHitAsset from "../../Assets/Sprites/UI/UI_ducks_hit.jpg";
import ducksHitAtlasAsset from "../../Assets/Sprites/UI/UI_ducks_hit_atlas.jpg";
import roundAsset from "../../Assets/Sprites/UI/UI_round.jpg";
import roundAtlasAsset from "../../Assets/Sprites/UI/UI_round_atlas.jpg";
import scoreAsset from "../../Assets/Sprites/UI/UI_score.jpg";
import scoreAtlasAsset from "../../Assets/Sprites/UI/UI_score_atlas.jpg";
import shotsAsset from "../../Assets/Sprites/UI/UI_shots.jpg";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DOG_HOLD_DURATION_MS,
  DOG_LOWER_DURATION_MS,
  DOG_POP_DELAY_MS,
  DOG_RETRIEVE_PAUSE_MS,
  DOG_RETRIEVE_TRIGGER_Y,
  DOG_RISE_DURATION_MS,
  HIT_REACTION_DURATION_MS,
  ROUND_INTRO_DURATION_MS,
  RESOLVE_DELAY_MS,
  SHOTS_PER_VOLLEY,
  TARGETS_PER_ROUND,
  modeLabel,
  passLineForRound,
  targetsPerVolley
} from "@/game/constants";
import {
  CLAY_PATHS,
  FIXED_STEP_MS,
  GAME_A_LAUNCH_PATHS,
  GAME_B_PATHS,
  NES_HEIGHT,
  NES_WIDTH,
  applyNextMotionMicroDelta,
  canvasToNesX,
  canvasToNesY,
  chooseBoundaryMotion,
  clayDistanceClass,
  clayImageIndex,
  clayRowOffset,
  clayScoreForRound,
  clayZapperShape,
  createRng,
  duckScoreForRound,
  duckSpeedIndexForRound,
  duckZapperShapeForRound,
  flyAwayTimerForRound,
  gameBDuckSpeedIndex,
  initializeClayMemory,
  modeReleaseDelay,
  nesToCanvasX,
  nesToCanvasY,
  perfectBonusForRound,
  pointHitsZapperShape,
  projectClay,
  readSpeedAndAdvance,
  rngNext,
  setMotionCode,
  syncCanvasPosition,
  targetColorForIndex,
  updateClayFixedPoint,
  type RngState
} from "@/game/duckHuntMechanics";
import {
  clearScene,
  drawCrosshair,
  drawDog,
  drawForeground,
  drawIntroDog,
  drawMidground,
  drawTarget,
  drawTreeLayer,
  isIntroDogBehindGrass,
  type FlyFrameImages
} from "@/game/draw";
import { formatDate, truncate } from "@/game/format";
import type { BirdColor, GameMode, HitRecord, RoundResult, TargetEntity, TweetCandidate } from "@/game/types";

type RuntimePhase = "boot" | "intro" | "active" | "resolve" | "ended";

type RuntimeState = {
  mode: GameMode;
  roundNumber: number;
  phase: RuntimePhase;
  phaseStartedAtMs: number;
  volleyStartedAtMs: number;
  nextTweetIndex: number;
  targetsPresented: number;
  volleyNumber: number;
  targets: TargetEntity[];
  shotsRemaining: number;
  shotsFired: number;
  score: number;
  hits: HitRecord[];
  escapes: RoundResult["escapes"];
  lastVolleyHitCount: number;
  rng: RngState;
  fixedStepAccumulatorMs: number;
  lastFrameAtMs?: number;
  fixedFrameCounter: number;
  releaseDelayFrames: number;
  pendingLaunches: number;
  launchSlotIndex: number;
  lastPathId: number;
  retrieveDogTriggeredAtMs?: number;
  retrieveDogX?: number;
  scoreReveals: Array<{
    id: string;
    x: number;
    y: number;
    points: number;
    expiresAtMs: number;
  }>;
  ended: boolean;
};

type MicroReveal = {
  id: string;
  text: string;
  date: string;
  points: number;
  expiresAt: number;
} | null;

type Props = {
  mode: GameMode;
  roundNumber: number;
  tweets: TweetCandidate[];
  onRoundEnd: (result: RoundResult) => void;
};

const COLORS: BirdColor[] = ["blue", "green", "red"];
const UI_SCALE = 4;

type UiImageKey = "shots" | "hit" | "hitAtlas" | "round" | "roundAtlas" | "score" | "scoreAtlas";

const FOREGROUND_GRASS_TOP_Y = 520;
const BIRD_LAUNCH_Y_MIN = FOREGROUND_GRASS_TOP_Y - 28;
const BIRD_LAUNCH_Y_MAX = FOREGROUND_GRASS_TOP_Y - 14;
const BIRD_FLIGHT_FLOOR_Y = FOREGROUND_GRASS_TOP_Y - 10;
const MIN_BIRD_SCREEN_TIME_MS = 1800;

const HUD_LAYOUT = {
  round: { x: 35, y: CANVAS_HEIGHT - 132 },
  shots: { x: 41, y: CANVAS_HEIGHT - 92 },
  hit: { x: 198, y: CANVAS_HEIGHT - 92 },
  score: { x: 707, y: CANVAS_HEIGHT - 92 }
};

function roundUiX(roundNumber: number) {
  const shotsWidth = 29 * UI_SCALE;
  const roundWidth = (roundNumber < 10 ? 24 : 32) * UI_SCALE;
  return HUD_LAYOUT.shots.x + (shotsWidth - roundWidth) / 2;
}

function createInitialState(mode: GameMode, roundNumber: number): RuntimeState {
  return {
    mode,
    roundNumber,
    phase: "boot",
    phaseStartedAtMs: performance.now(),
    volleyStartedAtMs: performance.now(),
    nextTweetIndex: 0,
    targetsPresented: 0,
    volleyNumber: 0,
    targets: [],
    shotsRemaining: SHOTS_PER_VOLLEY,
    shotsFired: 0,
    score: 0,
    hits: [],
    escapes: [],
    lastVolleyHitCount: 0,
    rng: createRng((roundNumber * 37 + mode.charCodeAt(0) + Math.floor(performance.now()) + Date.now()) & 0xff),
    fixedStepAccumulatorMs: 0,
    lastFrameAtMs: undefined,
    fixedFrameCounter: 0,
    releaseDelayFrames: modeReleaseDelay(mode),
    pendingLaunches: 0,
    launchSlotIndex: 0,
    lastPathId: -1,
    retrieveDogTriggeredAtMs: undefined,
    retrieveDogX: undefined,
    scoreReveals: [],
    ended: false
  };
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function drawUiImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number) {
  ctx.drawImage(image, x, y, image.naturalWidth * UI_SCALE, image.naturalHeight * UI_SCALE);
}

function drawRoundUiImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, roundNumber: number, x: number, y: number) {
  const sourceWidth = roundNumber < 10 ? 24 : image.naturalWidth;
  ctx.drawImage(image, 0, 0, sourceWidth, image.naturalHeight, x, y, sourceWidth * UI_SCALE, image.naturalHeight * UI_SCALE);
}

function drawScoreDigit(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, digit: number, x: number, y: number) {
  const glyphWidth = 8;
  const glyphHeight = 8;
  const sourceX = (digit % 5) * glyphWidth;
  const sourceY = digit >= 5 ? glyphHeight : 0;
  ctx.drawImage(atlas, sourceX, sourceY, glyphWidth, glyphHeight, x, y, glyphWidth * UI_SCALE, glyphHeight * UI_SCALE);
}

function drawScoreNumber(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, score: number) {
  const digits = Math.max(0, score).toString().padStart(6, "0").slice(-6);
  const glyphWidth = 8 * UI_SCALE;
  const x = HUD_LAYOUT.score.x + 4 * UI_SCALE - 4;
  const y = HUD_LAYOUT.score.y + UI_SCALE + 8;

  ctx.fillStyle = "#050508";
  ctx.fillRect(x, y, glyphWidth * 6, 8 * UI_SCALE);
  for (let index = 0; index < digits.length; index += 1) {
    drawScoreDigit(ctx, atlas, Number(digits[index]), x + index * glyphWidth, y);
  }
}

function drawRoundNumber(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, roundNumber: number) {
  const digits = Math.max(1, roundNumber).toString().slice(-2);
  const glyphWidth = 8 * UI_SCALE;
  const x = roundUiX(roundNumber) + 16 * UI_SCALE;
  const y = HUD_LAYOUT.round.y;

  for (let index = 0; index < digits.length; index += 1) {
    drawScoreDigit(ctx, atlas, Number(digits[index]), x + index * glyphWidth, y);
  }
}

function drawHitDucks(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, hits: number) {
  const duckWidth = 8;
  const duckHeight = 8;
  const y = HUD_LAYOUT.hit.y + 3 * UI_SCALE;

  for (let index = 0; index < Math.min(hits, TARGETS_PER_ROUND); index += 1) {
    ctx.drawImage(
      atlas,
      index * duckWidth,
      0,
      duckWidth,
      duckHeight,
      HUD_LAYOUT.hit.x + (35 + index * 8) * UI_SCALE,
      y,
      duckWidth * UI_SCALE,
      duckHeight * UI_SCALE
    );
  }
}

function maskSpentShots(ctx: CanvasRenderingContext2D, shotsRemaining: number) {
  ctx.fillStyle = "#050508";
  for (let index = shotsRemaining; index < SHOTS_PER_VOLLEY; index += 1) {
    ctx.fillRect(HUD_LAYOUT.shots.x + (4 + index * 8) * UI_SCALE, HUD_LAYOUT.shots.y + 3 * UI_SCALE, 5 * UI_SCALE, 9 * UI_SCALE);
  }
}

function drawSpriteHud(ctx: CanvasRenderingContext2D, state: RuntimeState, images: Partial<Record<UiImageKey, HTMLImageElement>>) {
  const shots = images.shots;
  const hit = images.hit;
  const hitAtlas = images.hitAtlas;
  const round = images.round;
  const roundAtlas = images.roundAtlas;
  const score = images.score;
  const scoreAtlas = images.scoreAtlas;
  if (!shots || !hit || !hitAtlas || !round || !roundAtlas || !score || !scoreAtlas) {
    return;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawRoundUiImage(ctx, round, state.roundNumber, roundUiX(state.roundNumber), HUD_LAYOUT.round.y);
  drawUiImage(ctx, shots, HUD_LAYOUT.shots.x, HUD_LAYOUT.shots.y);
  drawUiImage(ctx, hit, HUD_LAYOUT.hit.x, HUD_LAYOUT.hit.y);
  drawUiImage(ctx, score, HUD_LAYOUT.score.x, HUD_LAYOUT.score.y);
  drawRoundNumber(ctx, roundAtlas, state.roundNumber);
  maskSpentShots(ctx, state.shotsRemaining);
  drawHitDucks(ctx, hitAtlas, state.hits.length);
  drawScoreNumber(ctx, scoreAtlas, state.score);
  ctx.restore();
}

function drawScoreReveals(ctx: CanvasRenderingContext2D, state: RuntimeState, timeMs: number) {
  state.scoreReveals = state.scoreReveals.filter((reveal) => reveal.expiresAtMs > timeMs);
  if (state.scoreReveals.length === 0) return;

  ctx.save();
  ctx.font = "16px 'Nintendo NES Font', 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff8d7";

  for (const reveal of state.scoreReveals) {
    const x = reveal.x;
    const y = reveal.y - 16;
    const text = `${reveal.points}`;
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

function createWaitingTarget(mode: GameMode, roundNumber: number, targetIndex: number, tweet: TweetCandidate | undefined): TargetEntity {
  const kind = mode === "C" ? "clay" : "bird";
  const color = targetColorForIndex(targetIndex % COLORS.length);
  const points = kind === "clay" ? clayScoreForRound(roundNumber) : duckScoreForRound(roundNumber, color);

  return {
    id: kind === "clay" ? `clay_${roundNumber}_${targetIndex}` : `tweet_target_${roundNumber}_${targetIndex}_${tweet?.id ?? "mock"}`,
    kind,
    tweet,
    color,
    status: "flying",
    mechanicsState: "waiting",
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT,
    vx: 0,
    vy: 0,
    nesX: NES_WIDTH / 2,
    nesY: NES_HEIGHT,
    radius: 0,
    createdAtMs: performance.now(),
    points,
    direction: 1,
    flight: "side",
    slotIndex: targetIndex % targetsPerVolley(mode),
    shootable: false
  };
}

function launchTarget(state: RuntimeState, target: TargetEntity, now: number) {
  target.status = "flying";
  target.mechanicsState = "flying";
  target.createdAtMs = now;
  target.shootable = true;

  if (target.kind === "clay") {
    const pathId = rngNext(state.rng) % CLAY_PATHS.length;
    const memory = initializeClayMemory(CLAY_PATHS[pathId]);
    const projection = projectClay(memory);
    target.pathId = pathId;
    target.clayMemory = memory;
    target.nesX = projection.x;
    target.nesY = projection.y;
    target.distanceClass = clayDistanceClass(memory);
    target.clayImageIndex = clayImageIndex(memory);
    target.speedIndex = clayRowOffset(state.roundNumber) + (target.distanceClass ?? 0);
    target.zapperShape = clayZapperShape(state.roundNumber, target.clayImageIndex ?? 0);
    target.direction = target.slotIndex === 0 ? -1 : 1;
    syncCanvasPosition(target);
    return;
  }

  target.zapperShape = duckZapperShapeForRound(state.roundNumber);
  target.flyAwayTimer = flyAwayTimerForRound(state.roundNumber);
  target.flyAwayFlag = false;
  target.motionPatternIndex = 0;
  target.fliesBehindTree = (rngNext(state.rng) & 0x01) === 0;

  if (state.mode === "B") {
    const pathId = rngNext(state.rng) & 0x0f;
    const pathData = GAME_B_PATHS[pathId];
    target.pathId = pathId;
    target.pathData = [...pathData];
    target.pathIndex = 1;
    target.segmentTimer = 0;
    target.nesX = pathData[0];
    target.nesY = 0xa8;
    target.speedIndex = gameBDuckSpeedIndex(state.roundNumber, target.color);
    setMotionCode(target, 0);
    syncCanvasPosition(target);
    loadNextGameBSegment(target);
    return;
  }

  const pathKeys = Object.keys(GAME_A_LAUNCH_PATHS).map(Number);
  let pathId = pathKeys[rngNext(state.rng) % pathKeys.length];
  if (pathKeys.length > 1) {
    while (pathId === state.lastPathId) {
      pathId = pathKeys[rngNext(state.rng) % pathKeys.length];
    }
  }
  state.lastPathId = pathId;
  const [startX, launchFrames, motionCode] = GAME_A_LAUNCH_PATHS[pathId];
  target.pathId = pathId;
  target.nesX = startX;
  target.nesY = 0xa8;
  target.launchFlag = true;
  target.segmentTimer = launchFrames;
  target.speedIndex = duckSpeedIndexForRound(state.roundNumber);
  setMotionCode(target, motionCode);
  syncCanvasPosition(target);
}

function loadNextGameBSegment(target: TargetEntity) {
  const pathData = target.pathData;
  if (!pathData || target.pathIndex === undefined) return;

  const duration = pathData[target.pathIndex];
  const motionCode = pathData[target.pathIndex + 1] ?? 0;
  target.pathIndex += 2;

  if (duration === 0xff) {
    target.mechanicsState = "clear";
    return;
  }

  target.segmentTimer = duration;
  setMotionCode(target, motionCode);
}

function startNextVolley(state: RuntimeState, tweets: TweetCandidate[], now: number) {
  const count = Math.min(targetsPerVolley(state.mode), TARGETS_PER_ROUND - state.targetsPresented);
  const targets: TargetEntity[] = [];

  for (let index = 0; index < count; index += 1) {
    const targetIndex = state.targetsPresented + index;
    const tweet = state.mode === "C" ? undefined : tweets[state.nextTweetIndex + index % Math.max(tweets.length, 1)];
    targets.push(createWaitingTarget(state.mode, state.roundNumber, targetIndex, tweet));
  }

  state.phase = "active";
  state.phaseStartedAtMs = now;
  state.volleyStartedAtMs = now;
  state.targets = targets;
  state.targetsPresented += targets.length;
  state.nextTweetIndex += targets.length;
  state.volleyNumber += 1;
  state.shotsRemaining = SHOTS_PER_VOLLEY;
  state.lastVolleyHitCount = 0;
  state.releaseDelayFrames = modeReleaseDelay(state.mode);
  state.pendingLaunches = targets.length;
  state.launchSlotIndex = 0;
  state.retrieveDogTriggeredAtMs = undefined;
  state.retrieveDogX = undefined;
}

function markEscaped(state: RuntimeState, target: TargetEntity, now: number) {
  if (target.status !== "flying" || target.mechanicsState === "waiting") return;
  target.status = "escaped";
  target.mechanicsState = "clear";
  target.escapedAtMs = now;
  state.escapes.push({
    targetId: target.id,
    tweet: target.tweet,
    escapedAtMs: now,
    mode: state.mode
  });
}

function finishRound(state: RuntimeState, onRoundEnd: Props["onRoundEnd"]) {
  if (state.ended) return;
  state.ended = true;
  state.phase = "ended";
  if (state.hits.length === TARGETS_PER_ROUND) {
    state.score += perfectBonusForRound(state.roundNumber);
  }
  const passLine = passLineForRound(state.roundNumber);
  onRoundEnd({
    mode: state.mode,
    roundNumber: state.roundNumber,
    score: state.score,
    hits: state.hits,
    escapes: state.escapes,
    shotsFired: state.shotsFired,
    targetsPresented: state.targetsPresented,
    passLine,
    passed: state.hits.length >= passLine
  });
}

function advanceFixedStep(state: RuntimeState, now: number) {
  if (state.phase !== "active" && state.phase !== "resolve") return;
  state.fixedFrameCounter += 1;

  if (state.phase === "active") {
    advanceLaunchQueue(state, now);
    if (state.shotsRemaining <= 0) {
      for (const target of state.targets) {
        if (target.kind === "bird" && target.mechanicsState === "flying" && !target.flyAwayFlag) {
          target.flyAwayFlag = true;
          setMotionCode(target, 0);
        }
      }
    }
  }

  for (const target of state.targets) {
    if (target.mechanicsState === "hit_pause") {
      target.hitPauseTimer = Math.max((target.hitPauseTimer ?? 0) - 1, 0);
      if (target.hitPauseTimer === 0) {
        state.score += target.points;
        if (target.kind === "bird") {
          state.scoreReveals.push({
            id: `${target.id}_${now}`,
            x: target.x,
            y: target.y,
            points: target.points,
            expiresAtMs: now + 900
          });
        }
        target.mechanicsState = target.kind === "clay" ? "fragmenting" : "falling";
      }
      continue;
    }

    if (target.mechanicsState === "falling") {
      updateFallingDuck(target);
      continue;
    }

    if (target.mechanicsState === "fragmenting") {
      target.hitPauseTimer = Math.max((target.hitPauseTimer ?? 0) - 1, 0);
      if (target.hitPauseTimer === 0) target.mechanicsState = "clear";
      continue;
    }

    if (state.phase !== "active" || target.mechanicsState !== "flying" || target.status !== "flying") continue;

    if (target.kind === "clay") updateClayTarget(state, target);
    else if (state.mode === "B") updateGameBDuck(state, target);
    else updateGameADuck(state, target);
  }

  if (state.phase === "active" && !state.targets.some(isTargetUnresolved)) {
    state.phase = "resolve";
    state.phaseStartedAtMs = now;
  }
}

function advanceLaunchQueue(state: RuntimeState, now: number) {
  if (state.pendingLaunches <= 0) return;

  if (state.releaseDelayFrames > 0) {
    state.releaseDelayFrames -= 1;
    return;
  }

  const target = state.targets[state.launchSlotIndex];
  if (target && target.mechanicsState === "waiting") {
    launchTarget(state, target, now);
  }

  state.pendingLaunches -= 1;
  state.launchSlotIndex += 1;
  state.releaseDelayFrames = state.pendingLaunches > 0 ? (rngNext(state.rng) & 0x3f) + 1 : 0;
}

function updateGameADuck(state: RuntimeState, target: TargetEntity) {
  if (target.launchFlag) {
    if ((target.nesY ?? 0) < 0x88) {
      target.launchFlag = false;
      chooseBoundaryMotion(target, "bottom", state.rng);
    } else {
      moveTargetBySpeedCycle(target);
      return;
    }
  }

  if (!target.flyAwayFlag && (state.fixedFrameCounter & 1) === 1) {
    target.flyAwayTimer = Math.max((target.flyAwayTimer ?? 0) - 1, 0);
    if (target.flyAwayTimer === 0) {
      target.flyAwayFlag = true;
    }
  }

  if (target.flyAwayFlag) {
    updateDuckEscapeBoundary(state, target);
    if (target.status === "escaped") return;
    moveTargetBySpeedCycle(target);
    return;
  }

  redirectAtBoundary(state, target);
  moveTargetBySpeedCycle(target);
}

function updateGameBDuck(state: RuntimeState, target: TargetEntity) {
  if (target.flyAwayFlag) {
    moveTargetBySpeedCycle(target);
    if ((target.nesY ?? 0) < -16) markEscaped(state, target, performance.now());
    return;
  }

  if ((target.segmentTimer ?? 0) <= 0) loadNextGameBSegment(target);
  if (target.mechanicsState === "clear") {
    markEscaped(state, target, performance.now());
    return;
  }

  moveTargetBySpeedCycle(target);
  target.segmentTimer = Math.max((target.segmentTimer ?? 0) - 1, 0);
}

function updateClayTarget(state: RuntimeState, target: TargetEntity) {
  const memory = target.clayMemory;
  if (!memory) return;

  const distanceClass = clayDistanceClass(memory);
  target.distanceClass = distanceClass;
  target.speedIndex = clayRowOffset(state.roundNumber) + distanceClass;
  const steps = readSpeedAndAdvance(target);
  for (let step = 0; step < steps; step += 1) updateClayFixedPoint(memory);

  const projection = projectClay(memory);
  target.nesX = projection.x;
  target.nesY = projection.y;
  target.clayImageIndex = clayImageIndex(memory);
  target.zapperShape = clayZapperShape(state.roundNumber, target.clayImageIndex);
  syncCanvasPosition(target);

  if ((target.nesX ?? 0) < -20 || (target.nesX ?? 0) > NES_WIDTH + 20 || (target.nesY ?? 0) > NES_HEIGHT + 20 || distanceClass >= 7) {
    markEscaped(state, target, performance.now());
  }
}

function updateFallingDuck(target: TargetEntity) {
  target.nesY = (target.nesY ?? canvasToNesY(target.y)) + 3;
  target.nesX = (target.nesX ?? canvasToNesX(target.x)) + target.direction * 0.25;
  target.vy = 260;
  target.vx = target.direction * 55;
  syncCanvasPosition(target);
  if ((target.nesY ?? 0) > NES_HEIGHT + 20) target.mechanicsState = "clear";
}

function redirectAtBoundary(state: RuntimeState, target: TargetEntity) {
  const x = target.nesX ?? 0;
  const y = target.nesY ?? 0;
  if (y < 0x20) chooseBoundaryMotion(target, "top", state.rng);
  else if (y >= 0x90) chooseBoundaryMotion(target, "bottom", state.rng);
  if (x < 0x10) chooseBoundaryMotion(target, "left", state.rng);
  else if (x >= 0xf0) chooseBoundaryMotion(target, "right", state.rng);
}

function updateDuckEscapeBoundary(state: RuntimeState, target: TargetEntity) {
  const x = target.nesX ?? 0;
  const y = target.nesY ?? 0;
  if (y < 0x08 || x < 0x0c || x >= 0xf4) {
    markEscaped(state, target, performance.now());
    return;
  }
  if (y >= 0x90) chooseBoundaryMotion(target, "bottom", state.rng);
}

function moveTargetBySpeedCycle(target: TargetEntity) {
  const steps = readSpeedAndAdvance(target);
  for (let step = 0; step < steps; step += 1) applyNextMotionMicroDelta(target);
}

function isTargetUnresolved(target: TargetEntity) {
  return (
    target.mechanicsState === "waiting" ||
    target.mechanicsState === "flying" ||
    target.mechanicsState === "hit_pause" ||
    target.mechanicsState === "falling" ||
    target.mechanicsState === "fragmenting"
  );
}

export function GameCanvas({ mode, roundNumber, tweets, onRoundEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const flyFramesRef = useRef<FlyFrameImages | null>(null);
  const birdShotImageRef = useRef<HTMLImageElement | null>(null);
  const uiImagesRef = useRef<Partial<Record<UiImageKey, HTMLImageElement>>>({});
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const dogOneBirdImageRef = useRef<HTMLImageElement | null>(null);
  const dogTwoBirdImageRef = useRef<HTMLImageElement | null>(null);
  const treeImageRef = useRef<HTMLImageElement | null>(null);
  const midgroundImageRef = useRef<HTMLImageElement | null>(null);
  const foregroundImageRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef<RuntimeState | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const lastHudUpdateRef = useRef(0);
  const onRoundEndRef = useRef(onRoundEnd);
  const tweetsRef = useRef(tweets);
  const [assetReady, setAssetReady] = useState(false);
  const [microReveal, setMicroReveal] = useState<MicroReveal>(null);

  useEffect(() => {
    onRoundEndRef.current = onRoundEnd;
  }, [onRoundEnd]);

  useEffect(() => {
    tweetsRef.current = tweets;
  }, [tweets]);

  useEffect(() => {
    const image = new Image();
    image.src = "/sprites/tweet_hunt_sheet.png";
    image.onload = () => {
      imageRef.current = image;
      setAssetReady(true);
    };
  }, []);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      flyFramesRef.current = { image, columns: 4, rows: 3 };
    };
    image.src = chatGptBirdFlyAsset.src;

    return () => {
      image.onload = null;
      flyFramesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      birdShotImageRef.current = image;
    };
    image.src = birdShotAsset.src;

    return () => {
      image.onload = null;
      birdShotImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const assets: Array<[UiImageKey, string]> = [
      ["shots", shotsAsset.src],
      ["hit", ducksHitAsset.src],
      ["hitAtlas", ducksHitAtlasAsset.src],
      ["round", roundAsset.src],
      ["roundAtlas", roundAtlasAsset.src],
      ["score", scoreAsset.src],
      ["scoreAtlas", scoreAtlasAsset.src]
    ];
    const images = assets.map(([key, src]) => {
      const image = new Image();
      image.src = src;
      image.onload = () => {
        uiImagesRef.current[key] = image;
      };
      return image;
    });

    return () => {
      for (const image of images) image.onload = null;
      uiImagesRef.current = {};
    };
  }, []);


  useEffect(() => {
    const backgroundImage = new Image();
    backgroundImage.src = backgroundAsset.src;
    backgroundImage.onload = () => {
      backgroundImageRef.current = backgroundImage;
    };

    return () => {
      backgroundImage.onload = null;
      backgroundImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const dogOneBirdImage = new Image();
    dogOneBirdImage.src = dogOneBirdAsset.src;
    dogOneBirdImage.onload = () => {
      dogOneBirdImageRef.current = dogOneBirdImage;
    };

    return () => {
      dogOneBirdImage.onload = null;
      dogOneBirdImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const dogTwoBirdImage = new Image();
    dogTwoBirdImage.src = dogTwoBirdAsset.src;
    dogTwoBirdImage.onload = () => {
      dogTwoBirdImageRef.current = dogTwoBirdImage;
    };

    return () => {
      dogTwoBirdImage.onload = null;
      dogTwoBirdImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const midgroundImage = new Image();
    midgroundImage.src = midgroundAsset.src;
    midgroundImage.onload = () => {
      midgroundImageRef.current = midgroundImage;
    };

    return () => {
      midgroundImage.onload = null;
      midgroundImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const treeImage = new Image();
    treeImage.src = treeAsset.src;
    treeImage.onload = () => {
      treeImageRef.current = treeImage;
    };

    return () => {
      treeImage.onload = null;
      treeImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const foregroundImage = new Image();
    foregroundImage.src = foregroundAsset.src;
    foregroundImage.onload = () => {
      foregroundImageRef.current = foregroundImage;
    };

    return () => {
      foregroundImage.onload = null;
      foregroundImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!assetReady) return undefined;
    const now = performance.now();
    const state = createInitialState(mode, roundNumber);
    state.phase = "intro";
    state.phaseStartedAtMs = now;
    stateRef.current = state;

    return () => {
      stateRef.current = null;
    };
  }, [assetReady, mode, roundNumber]);

  const draw = useCallback((timeMs: number) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const state = stateRef.current;
    if (!canvas || !image || !state) return;
    const introDogElapsedMs = timeMs - state.phaseStartedAtMs;
    const introDogBehindGrass = state.phase === "intro" && isIntroDogBehindGrass(introDogElapsedMs);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearScene(ctx, backgroundImageRef.current);

    if (state.phase === "intro" && timeMs - state.phaseStartedAtMs >= ROUND_INTRO_DURATION_MS) {
      startNextVolley(state, tweetsRef.current, timeMs);
    }

    if (state.phase === "active" || state.phase === "resolve") {
      if (state.lastFrameAtMs === undefined) state.lastFrameAtMs = timeMs;
      state.fixedStepAccumulatorMs += Math.min(timeMs - state.lastFrameAtMs, 250);
      state.lastFrameAtMs = timeMs;
      while (state.fixedStepAccumulatorMs >= FIXED_STEP_MS) {
        advanceFixedStep(state, timeMs);
        state.fixedStepAccumulatorMs -= FIXED_STEP_MS;
      }
    }

    let resolveDogState: "laugh" | "one" | "two" | null = null;
    if (state.phase === "resolve") {
      resolveDogState = "laugh";
      if (state.lastVolleyHitCount === 0) resolveDogState = "laugh";
      else if (state.lastVolleyHitCount === 1) resolveDogState = "one";
      else resolveDogState = "two";
    }
    const retrieveDogState = resolveDogState === "one" || resolveDogState === "two";
    if (state.phase === "resolve" && retrieveDogState && state.retrieveDogTriggeredAtMs === undefined) {
      const birdsBehindGrass = state.targets.filter((target) => target.kind === "bird" && target.status === "hit" && target.y >= DOG_RETRIEVE_TRIGGER_Y);
      if (birdsBehindGrass.length > 0) {
        state.retrieveDogTriggeredAtMs = timeMs;
        const averageX = birdsBehindGrass.reduce((sum, target) => sum + target.x, 0) / birdsBehindGrass.length;
        state.retrieveDogX = Math.min(Math.max(averageX, 90), CANVAS_WIDTH - 90);
      }
    }

    const retrieveDogAgeMs = state.retrieveDogTriggeredAtMs === undefined ? 0 : timeMs - state.retrieveDogTriggeredAtMs;
    const retrieveDogAnimationAgeMs = Math.max(retrieveDogAgeMs - DOG_RETRIEVE_PAUSE_MS, 0);
    const retrieveDogSequenceMs = DOG_RETRIEVE_PAUSE_MS + DOG_RISE_DURATION_MS + DOG_HOLD_DURATION_MS + DOG_LOWER_DURATION_MS;
    const laughDogAgeMs = timeMs - state.phaseStartedAtMs - DOG_POP_DELAY_MS;
    const laughDogSequenceMs = DOG_RISE_DURATION_MS + DOG_HOLD_DURATION_MS + DOG_LOWER_DURATION_MS;
    const shouldShowRetrieveDog =
      retrieveDogState &&
      state.retrieveDogTriggeredAtMs !== undefined &&
      retrieveDogAgeMs >= DOG_RETRIEVE_PAUSE_MS &&
      retrieveDogAgeMs < retrieveDogSequenceMs;
    const shouldShowLaughDog =
      resolveDogState === "laugh" && laughDogAgeMs >= 0 && laughDogAgeMs < laughDogSequenceMs;
    const dogReturnedBehindGrass =
      retrieveDogState &&
      state.retrieveDogTriggeredAtMs !== undefined &&
      retrieveDogAgeMs >= retrieveDogSequenceMs;

    let dogRiseOffset = 0;
    if (shouldShowRetrieveDog) {
      if (retrieveDogAnimationAgeMs < DOG_RISE_DURATION_MS) {
        const progress = retrieveDogAnimationAgeMs / DOG_RISE_DURATION_MS;
        const ease = 1 - (1 - progress) ** 2;
        dogRiseOffset = (1 - ease) * 120;
      } else if (retrieveDogAnimationAgeMs > DOG_RISE_DURATION_MS + DOG_HOLD_DURATION_MS) {
        const progress = (retrieveDogAnimationAgeMs - DOG_RISE_DURATION_MS - DOG_HOLD_DURATION_MS) / DOG_LOWER_DURATION_MS;
        dogRiseOffset = Math.min(progress, 1) ** 2 * 120;
      }
    }
    if (shouldShowLaughDog) {
      if (laughDogAgeMs < DOG_RISE_DURATION_MS) {
        const progress = laughDogAgeMs / DOG_RISE_DURATION_MS;
        const ease = 1 - (1 - progress) ** 2;
        dogRiseOffset = (1 - ease) * 120;
      } else if (laughDogAgeMs > DOG_RISE_DURATION_MS + DOG_HOLD_DURATION_MS) {
        const progress = (laughDogAgeMs - DOG_RISE_DURATION_MS - DOG_HOLD_DURATION_MS) / DOG_LOWER_DURATION_MS;
        dogRiseOffset = Math.min(progress, 1) ** 2 * 120;
      }
    }

    const canAdvanceResolve =
      state.phase === "resolve" &&
      ((retrieveDogState && state.retrieveDogTriggeredAtMs !== undefined && retrieveDogAgeMs >= retrieveDogSequenceMs) ||
        (!retrieveDogState &&
          ((resolveDogState === "laugh" && laughDogAgeMs >= laughDogSequenceMs) ||
            (resolveDogState !== "laugh" && timeMs - state.phaseStartedAtMs > RESOLVE_DELAY_MS))));

    if (canAdvanceResolve) {
      if (state.targetsPresented >= TARGETS_PER_ROUND) {
        finishRound(state, onRoundEndRef.current);
      } else {
        startNextVolley(state, tweetsRef.current, timeMs);
      }
    }

    drawScoreReveals(ctx, state, timeMs);

    for (const target of state.targets) {
      if (target.status !== "escaped" && target.fliesBehindTree) {
        drawTarget(ctx, image, target, timeMs, flyFramesRef.current, birdShotImageRef.current);
      }
    }

    drawTreeLayer(ctx, treeImageRef.current);

    for (const target of state.targets) {
      if (target.status !== "escaped" && !target.fliesBehindTree) {
        drawTarget(ctx, image, target, timeMs, flyFramesRef.current, birdShotImageRef.current);
      }
    }

    if ((shouldShowRetrieveDog || shouldShowLaughDog) && resolveDogState) {
      drawDog(
        ctx,
        image,
        timeMs,
        resolveDogState,
        dogRiseOffset,
        shouldShowRetrieveDog ? state.retrieveDogX : undefined,
        dogOneBirdImageRef.current,
        mode === "B" ? dogTwoBirdImageRef.current : null
      );
    }
    if (introDogBehindGrass) {
      drawIntroDog(ctx, image, introDogElapsedMs, timeMs);
    }

    drawMidground(ctx, midgroundImageRef.current);
    drawForeground(ctx, foregroundImageRef.current);

    if (state.phase === "intro" && !introDogBehindGrass) {
      drawIntroDog(ctx, image, introDogElapsedMs, timeMs);
    }
    if (state.phase === "active") drawCrosshair(ctx, mouseRef.current.x, mouseRef.current.y);
    drawSpriteHud(ctx, state, uiImagesRef.current);

    if (dogReturnedBehindGrass) {
      setMicroReveal(null);
    } else if (timeMs - lastHudUpdateRef.current > 90) {
      lastHudUpdateRef.current = timeMs;
      setMicroReveal((current) => (current && current.expiresAt < timeMs ? null : current));
    }
  }, []);

  useEffect(() => {
    if (!assetReady) return undefined;

    const tick = (timeMs: number) => {
      draw(timeMs);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [assetReady, draw]);

  function resolveCanvasPosition(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT
    };
  }

  function handleMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
    mouseRef.current = resolveCanvasPosition(event);
  }

  function handleShot(event: React.MouseEvent<HTMLCanvasElement>) {
    const state = stateRef.current;
    if (!state || state.phase !== "active" || state.shotsRemaining <= 0) return;

    const point = resolveCanvasPosition(event);
    const nesPoint = { x: canvasToNesX(point.x), y: canvasToNesY(point.y) };
    state.shotsRemaining -= 1;
    state.shotsFired += 1;

    const hit = state.targets.find((target) => {
      if (target.status !== "flying" || target.mechanicsState !== "flying" || !target.shootable) return false;
      return pointHitsZapperShape(
        nesPoint.x,
        nesPoint.y,
        target.nesX ?? canvasToNesX(target.x),
        target.nesY ?? canvasToNesY(target.y),
        target.zapperShape ?? (target.kind === "clay" ? clayZapperShape(state.roundNumber, target.clayImageIndex ?? 0) : duckZapperShapeForRound(state.roundNumber))
      );
    });

    if (!hit) return;

    const now = performance.now();
    hit.status = "hit";
    hit.mechanicsState = "hit_pause";
    hit.shootable = false;
    hit.hitPauseTimer = hit.kind === "clay" ? 18 : Math.ceil(HIT_REACTION_DURATION_MS / FIXED_STEP_MS);
    hit.hitAtMs = now;
    hit.vx = hit.direction * 55;
    hit.vy = 260;
    state.lastVolleyHitCount += 1;

    const record: HitRecord = {
      targetId: hit.id,
      tweet: hit.tweet,
      points: hit.points,
      hitOrder: state.hits.length + 1,
      hitAtMs: now,
      mode: state.mode
    };
    state.hits.push(record);

    if (hit.tweet) {
      setMicroReveal({
        id: `${hit.id}_${now}`,
        text: truncate(hit.tweet.text, 140),
        date: formatDate(hit.tweet.createdAt),
        points: hit.points,
        expiresAt: now + 3400
      });
    } else if (mode === "C") {
      setMicroReveal({
        id: `${hit.id}_${now}`,
        text: "Clay tweet shattered. No live tweet affected.",
        date: "practice target",
        points: hit.points,
        expiresAt: now + 3150
      });
    }
  }

  return (
    <div className="canvas-wrap" aria-label={`${modeLabel(mode)} playfield`}>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseMove={handleMouseMove}
        onClick={handleShot}
      />
      {microReveal ? (
        <div className="hud-overlay" aria-hidden="true">
          <div className="micro-reveal">
            <p>{microReveal.text}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
