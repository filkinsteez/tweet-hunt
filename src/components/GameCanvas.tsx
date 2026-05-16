"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import crtAsset from "../../Assets/CRT/crt_edited.png";
import backgroundAsset from "../../Assets/Sprites/Environment/background.jpg";
import dogTwoBirdAsset from "../../Assets/Sprites/Environment/dog_2bird.png";
import foregroundAsset from "../../Assets/Sprites/Environment/foreground.png";
import chatGptBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_birdsprite_fly.png";
import birdShotAsset from "../../Assets/Sprites/Bird/Bird Misc/bird_shot.png";
import clayBackgroundAsset from "../../Assets/Sprites/Clay/clay_bg.jpg";
import clayFilledPigeonAsset from "../../Assets/Sprites/Clay/clay_filled_pigeon.jpg";
import clayHitAsset from "../../Assets/Sprites/Clay/clay_hit_counter.jpg";
import clayHitCounterFilledAsset from "../../Assets/Sprites/Clay/clay_hit_counter_filled.jpg";
import clayRoundAsset from "../../Assets/Sprites/Clay/clay_round_counter.jpg";
import clayScoreAsset from "../../Assets/Sprites/Clay/clay_score_counter.jpg";
import clayShotsAsset from "../../Assets/Sprites/Clay/clay_shot_counter.jpg";
import clayTargetAtlasAsset from "../../Assets/Sprites/Clay/clay_target_atlas.png";
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
  clayScoreForRound,
  clayZapperShape,
  createRng,
  duckScoreForRound,
  duckSpeedIndexForRound,
  duckZapperShapeForRound,
  flyAwayTimerForRound,
  gameBDuckSpeedIndex,
  modeReleaseDelay,
  nesToCanvasX,
  nesToCanvasY,
  perfectBonusForRound,
  pointHitsZapperShape,
  readSpeedAndAdvance,
  rngNext,
  setMotionCode,
  syncCanvasPosition,
  targetColorForIndex,
  type RngState
} from "@/game/duckHuntMechanics";
import { CRT_WARP_X, CRT_WARP_Y, CrtRenderer } from "@/game/crtRenderer";
import {
  clearScene,
  drawClayEnvironment,
  CLAY_HIT_HUD_ATLAS_FRAME,
  drawClayHitCounterFilledOverlay,
  drawClayHitHudIndicators,
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
import { totalTweetEngagement } from "@/game/engagement";
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
  targetLimit: number;
  isLiveTweetRound: boolean;
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
  likes: number;
  comments: number;
  retweets: number;
  expiresAt: number;
} | null;

type Props = {
  mode: GameMode;
  roundNumber: number;
  tweets: TweetCandidate[];
  isLiveTweetRound: boolean;
  onRoundEnd: (result: RoundResult) => void;
};

const COLORS: BirdColor[] = ["blue", "green", "red"];
const UI_SCALE = 4;

async function deleteTweetOnHit(tweetId: string, mode: GameMode) {
  if (mode === "C") return false;

  const response = await fetch("/api/tweets/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ tweetId, mode })
  });

  return response.ok;
}

type UiImageKey =
  | "shots"
  | "hit"
  | "hitAtlas"
  | "round"
  | "roundAtlas"
  | "score"
  | "scoreAtlas"
  | "clayShots"
  | "clayHit"
  | "clayHitCounterFilled"
  | "clayHitFilled"
  | "clayRound"
  | "clayScore";

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

function createInitialState(mode: GameMode, roundNumber: number, targetLimit: number, isLiveTweetRound: boolean): RuntimeState {
  return {
    mode,
    roundNumber,
    phase: "boot",
    phaseStartedAtMs: performance.now(),
    volleyStartedAtMs: performance.now(),
    nextTweetIndex: 0,
    targetsPresented: 0,
    targetLimit,
    isLiveTweetRound,
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

function createTransparentCanvas(
  image: HTMLImageElement,
  transparentColor: [number, number, number],
  replacements: Array<{ from: [number, number, number]; to: [number, number, number, number?] }> = []
) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return image;

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const [r, g, b] = transparentColor;
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (imageData.data[index] === r && imageData.data[index + 1] === g && imageData.data[index + 2] === b) {
      imageData.data[index + 3] = 0;
      continue;
    }

    for (const replacement of replacements) {
      const [fromR, fromG, fromB] = replacement.from;
      if (imageData.data[index] === fromR && imageData.data[index + 1] === fromG && imageData.data[index + 2] === fromB) {
        const [toR, toG, toB, toA] = replacement.to;
        imageData.data[index] = toR;
        imageData.data[index + 1] = toG;
        imageData.data[index + 2] = toB;
        if (toA !== undefined) imageData.data[index + 3] = toA;
        break;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
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

function drawSpriteHud(
  ctx: CanvasRenderingContext2D,
  state: RuntimeState,
  images: Partial<Record<UiImageKey, HTMLImageElement>>,
  clayTargetAtlas: CanvasImageSource | null | undefined
) {
  const isClayMode = state.mode === "C";
  const shots = isClayMode ? images.clayShots ?? images.shots : images.shots;
  const hit = isClayMode ? images.clayHit ?? images.hit : images.hit;
  const hitAtlas = images.hitAtlas;
  const round = isClayMode ? images.clayRound ?? images.round : images.round;
  const roundAtlas = images.roundAtlas;
  const score = isClayMode ? images.clayScore ?? images.score : images.score;
  const scoreAtlas = images.scoreAtlas;
  const clayHitFilled = images.clayHitFilled;
  const clayHitCounterFilled = images.clayHitCounterFilled;
  const hitMarkersReady =
    hitAtlas || (isClayMode && (clayHitCounterFilled || clayHitFilled || clayTargetAtlas));
  if (!shots || !hit || !hitMarkersReady || !round || !roundAtlas || !score || !scoreAtlas) {
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
  if (isClayMode && clayHitCounterFilled && state.hits.length > 0) {
    drawClayHitCounterFilledOverlay(ctx, clayHitCounterFilled, state.hits.length, HUD_LAYOUT.hit, UI_SCALE);
  } else if (isClayMode && clayHitFilled) {
    drawClayHitHudIndicators(ctx, clayHitFilled, state.hits.length, HUD_LAYOUT.hit, UI_SCALE);
  } else if (isClayMode && clayTargetAtlas) {
    drawClayHitHudIndicators(ctx, clayTargetAtlas, state.hits.length, HUD_LAYOUT.hit, UI_SCALE, {
      sourceRect: CLAY_HIT_HUD_ATLAS_FRAME
    });
  } else if (hitAtlas) {
    drawHitDucks(ctx, hitAtlas, state.hits.length);
  }
  drawScoreNumber(ctx, scoreAtlas, state.score);
  ctx.restore();
}

function drawScoreReveals(ctx: CanvasRenderingContext2D, state: RuntimeState, timeMs: number) {
  state.scoreReveals = state.scoreReveals.filter((reveal) => reveal.expiresAtMs > timeMs);
  if (state.scoreReveals.length === 0) return;

  ctx.save();
  ctx.font = "16px 'Press Start 2P', monospace";
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
  const points = kind === "clay" ? clayScoreForRound(roundNumber) : tweet ? totalTweetEngagement(tweet) : duckScoreForRound(roundNumber, color);

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
    const direction = target.slotIndex === 0 ? -1 : 1;
    const launchJitter = (rngNext(state.rng) % 36) - 18;
    const speedJitter = rngNext(state.rng) % 50;
    target.pathId = rngNext(state.rng) % CLAY_PATHS.length;
    target.direction = direction;
    target.x = CANVAS_WIDTH / 2 + direction * (58 + Math.abs(launchJitter));
    target.y = CANVAS_HEIGHT - 170;
    target.vx = direction * (145 + speedJitter);
    target.vy = -430 - (rngNext(state.rng) % 55);
    target.nesX = canvasToNesX(target.x);
    target.nesY = canvasToNesY(target.y);
    target.clayImageIndex = 0;
    target.distanceClass = 0;
    target.zapperShape = clayZapperShape(state.roundNumber, 0);
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
  const count = Math.min(targetsPerVolley(state.mode), state.targetLimit - state.targetsPresented);
  const targets: TargetEntity[] = [];

  for (let index = 0; index < count; index += 1) {
    const targetIndex = state.targetsPresented + index;
    const tweet = state.isLiveTweetRound ? tweets[state.nextTweetIndex + index] : undefined;
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
  if (!state.isLiveTweetRound && state.hits.length === state.targetLimit) {
    state.score += perfectBonusForRound(state.roundNumber);
  }
  const passLine = state.isLiveTweetRound ? Math.min(passLineForRound(state.roundNumber), state.targetLimit) : passLineForRound(state.roundNumber);
  onRoundEnd({
    mode: state.mode,
    roundNumber: state.roundNumber,
    score: state.score,
    hits: state.hits,
    escapes: state.escapes,
    shotsFired: state.shotsFired,
    targetsPresented: state.targetsPresented,
    targetLimit: state.targetLimit,
    isLiveTweetRound: state.isLiveTweetRound,
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
        state.scoreReveals.push({
          id: `${target.id}_${now}`,
          x: target.x,
          y: target.y,
          points: target.points,
          expiresAtMs: now + 900
        });
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
  const dt = FIXED_STEP_MS / 1000;
  target.vy += 260 * dt;
  target.x += target.vx * dt;
  target.y += target.vy * dt;
  target.nesX = canvasToNesX(target.x);
  target.nesY = canvasToNesY(target.y);

  const ageMs = performance.now() - target.createdAtMs;
  const imageIndex = Math.min(Math.floor(ageMs / 260), 11);
  target.clayImageIndex = imageIndex;
  target.distanceClass = Math.min(Math.floor(imageIndex / 2), 7);
  target.zapperShape = clayZapperShape(state.roundNumber, imageIndex);

  if (target.x < -90 || target.x > CANVAS_WIDTH + 90 || target.y > CANVAS_HEIGHT - 120 || target.y < -90) {
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

export function GameCanvas({ mode, roundNumber, tweets, isLiveTweetRound, onRoundEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const crtCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const crtRendererRef = useRef<CrtRenderer | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const flyFramesRef = useRef<FlyFrameImages | null>(null);
  const birdShotImageRef = useRef<HTMLImageElement | null>(null);
  const clayTargetAtlasRef = useRef<CanvasImageSource | null>(null);
  const uiImagesRef = useRef<Partial<Record<UiImageKey, HTMLImageElement>>>({});
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const dogOneBirdImageRef = useRef<HTMLImageElement | null>(null);
  const dogTwoBirdImageRef = useRef<HTMLImageElement | null>(null);
  const treeImageRef = useRef<HTMLImageElement | null>(null);
  const midgroundImageRef = useRef<HTMLImageElement | null>(null);
  const foregroundImageRef = useRef<HTMLImageElement | null>(null);
  const clayBackgroundImageRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef<RuntimeState | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const lastHudUpdateRef = useRef(0);
  const onRoundEndRef = useRef(onRoundEnd);
  const tweetsRef = useRef(tweets);
  const [assetReady, setAssetReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [microReveal, setMicroReveal] = useState<MicroReveal>(null);
  const [crtUnavailable, setCrtUnavailable] = useState(false);

  useEffect(() => {
    const canvas = crtCanvasRef.current;
    if (!canvas) return undefined;

    try {
      const renderer = new CrtRenderer(canvas);
      crtRendererRef.current = renderer;
      setCrtUnavailable(false);
      return () => {
        renderer.dispose();
        if (crtRendererRef.current === renderer) crtRendererRef.current = null;
      };
    } catch (error) {
      console.warn("CRT renderer unavailable; falling back to the source canvas.", error);
      setCrtUnavailable(true);
      return undefined;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!("fonts" in document)) {
      setFontReady(true);
      return undefined;
    }

    document.fonts
      .load("16px 'Press Start 2P'")
      .then(() => document.fonts.ready)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setFontReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    const image = new Image();
    image.onload = () => {
      clayTargetAtlasRef.current = createTransparentCanvas(image, [254, 211, 186], [
        { from: [72, 205, 222], to: [72, 205, 222, 0] }
      ]);
    };
    image.src = clayTargetAtlasAsset.src;

    return () => {
      image.onload = null;
      clayTargetAtlasRef.current = null;
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
      ["scoreAtlas", scoreAtlasAsset.src],
      ["clayShots", clayShotsAsset.src],
      ["clayHit", clayHitAsset.src],
      ["clayHitCounterFilled", clayHitCounterFilledAsset.src],
      ["clayHitFilled", clayFilledPigeonAsset.src],
      ["clayRound", clayRoundAsset.src],
      ["clayScore", clayScoreAsset.src]
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
    const clayBackgroundImage = new Image();
    clayBackgroundImage.src = clayBackgroundAsset.src;
    clayBackgroundImage.onload = () => {
      clayBackgroundImageRef.current = clayBackgroundImage;
    };

    return () => {
      clayBackgroundImage.onload = null;
      clayBackgroundImageRef.current = null;
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
    if (!assetReady || !fontReady) return undefined;
    const now = performance.now();
    const targetLimit = isLiveTweetRound ? Math.min(Math.max(tweetsRef.current.length, 1), TARGETS_PER_ROUND) : TARGETS_PER_ROUND;
    const state = createInitialState(mode, roundNumber, targetLimit, isLiveTweetRound);
    if (mode === "C") {
      startNextVolley(state, tweetsRef.current, now);
      state.releaseDelayFrames = 0;
    } else {
      state.phase = "intro";
      state.phaseStartedAtMs = now;
    }
    stateRef.current = state;

    return () => {
      stateRef.current = null;
    };
  }, [assetReady, fontReady, mode, roundNumber, isLiveTweetRound]);

  const draw = useCallback((timeMs: number) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const state = stateRef.current;
    if (!canvas || !image || !state) return;
    const introDogElapsedMs = timeMs - state.phaseStartedAtMs;
    const introDogBehindGrass = state.phase === "intro" && isIntroDogBehindGrass(introDogElapsedMs);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isClayMode = state.mode === "C";

    if (isClayMode) {
      drawClayEnvironment(ctx, clayBackgroundImageRef.current);
    } else {
      clearScene(ctx, backgroundImageRef.current);
    }

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
    if (state.phase === "resolve" && state.mode !== "C") {
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
      if (state.targetsPresented >= state.targetLimit) {
        finishRound(state, onRoundEndRef.current);
      } else {
        startNextVolley(state, tweetsRef.current, timeMs);
      }
    }

    if (!isClayMode) {
      for (const target of state.targets) {
        if (target.status !== "escaped" && target.fliesBehindTree) {
          drawTarget(ctx, image, target, timeMs, flyFramesRef.current, birdShotImageRef.current);
        }
      }

      drawTreeLayer(ctx, treeImageRef.current);
    }

    for (const target of state.targets) {
      if (target.status !== "escaped" && (isClayMode || !target.fliesBehindTree)) {
        drawTarget(ctx, image, target, timeMs, flyFramesRef.current, birdShotImageRef.current, clayTargetAtlasRef.current);
      }
    }

    if (!isClayMode && (shouldShowRetrieveDog || shouldShowLaughDog) && resolveDogState) {
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
    if (!isClayMode && introDogBehindGrass) {
      drawIntroDog(ctx, image, introDogElapsedMs, timeMs);
    }

    if (!isClayMode) {
      drawMidground(ctx, midgroundImageRef.current);
      drawForeground(ctx, foregroundImageRef.current);
    }

    if (!isClayMode && state.phase === "intro" && !introDogBehindGrass) {
      drawIntroDog(ctx, image, introDogElapsedMs, timeMs);
    }
    drawScoreReveals(ctx, state, timeMs);
    if (state.phase === "active") drawCrosshair(ctx, mouseRef.current.x, mouseRef.current.y);
    drawSpriteHud(ctx, state, uiImagesRef.current, clayTargetAtlasRef.current);
    crtRendererRef.current?.render(canvas, timeMs);

    if (dogReturnedBehindGrass) {
      setMicroReveal(null);
    } else if (timeMs - lastHudUpdateRef.current > 90) {
      lastHudUpdateRef.current = timeMs;
      setMicroReveal((current) => (current && current.expiresAt < timeMs ? null : current));
    }
  }, []);

  useEffect(() => {
    if (!assetReady || !fontReady) return undefined;

    const tick = (timeMs: number) => {
      draw(timeMs);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [assetReady, fontReady, draw]);

  function resolveCanvasPosition(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const displayX = (event.clientX - rect.left) / rect.width;
    const displayY = (event.clientY - rect.top) / rect.height;
    const sourceUv =
      !crtUnavailable && event.currentTarget === crtCanvasRef.current
        ? mapCrtDisplayUvToSource(displayX, displayY)
        : { x: displayX, y: displayY };

    return {
      x: sourceUv.x * CANVAS_WIDTH,
      y: sourceUv.y * CANVAS_HEIGHT
    };
  }

  function handleMouseMove(event: React.MouseEvent<HTMLElement>) {
    mouseRef.current = resolveCanvasPosition(event);
  }

  function handleShot(event: React.MouseEvent<HTMLElement>) {
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
      mode: state.mode,
      deleteStatus: hit.tweet && state.mode !== "C" ? "pending" : undefined
    };
    state.hits.push(record);

    if (hit.tweet) {
      void deleteTweetOnHit(hit.tweet.id, state.mode).then((deleted) => {
        record.deleteStatus = deleted ? "deleted" : "failed";
      });
      setMicroReveal({
        id: `${hit.id}_${now}`,
        text: `Deleting: ${truncate(hit.tweet.text, 128)}`,
        date: formatDate(hit.tweet.createdAt),
        points: hit.points,
        likes: hit.tweet.likes,
        comments: hit.tweet.replies,
        retweets: hit.tweet.reposts,
        expiresAt: now + 3400
      });
    }
  }

  const crtStyle = { "--crt-art": `url(${crtAsset.src})` } as CSSProperties;

  return (
    <div
      className={`canvas-wrap crt-cabinet${crtUnavailable ? " crt-fallback" : ""}`}
      style={crtStyle}
      aria-label={`${modeLabel(mode)} playfield`}
    >
      <div className="crt-screen">
        <canvas
          ref={canvasRef}
          className="game-canvas game-source-canvas"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onClick={handleShot}
        />
        <canvas
          ref={crtCanvasRef}
          className="game-canvas game-crt-canvas"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onClick={handleShot}
          aria-hidden={crtUnavailable}
        />
        {microReveal ? (
          <div className="hud-overlay" aria-hidden="true">
            <div className="micro-reveal">
              <p>{microReveal.text}</p>
              <p className="micro-reveal-metrics">
                <span>{microReveal.likes} likes</span>
                <span>{microReveal.comments} comments</span>
                <span>{microReveal.retweets} retweets</span>
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function mapCrtDisplayUvToSource(x: number, y: number) {
  const centeredX = x * 2 - 1;
  const centeredY = y * 2 - 1;
  const warpedX = centeredX * (1 + centeredY * centeredY * CRT_WARP_X);
  const warpedY = centeredY * (1 + centeredX * centeredX * CRT_WARP_Y);

  return {
    x: clamp01(warpedX * 0.5 + 0.5),
    y: clamp01(warpedY * 0.5 + 0.5)
  };
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}
