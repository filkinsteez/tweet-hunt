"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import crtAsset from "../../Assets/CRT/crt_edited.png";
import backgroundAsset from "../../Assets/Sprites/Environment/background.jpg";
import portraitBackgroundAsset from "../../Assets/Sprites/Environment/background_9x16.jpg";
import dogTwoBirdAsset from "../../Assets/Sprites/Environment/dog_2bird.png";
import foregroundAsset from "../../Assets/Sprites/Environment/foreground.png";
import portraitGrassAsset from "../../Assets/Sprites/Environment/grass_9x16.png";
import portraitGroundAsset from "../../Assets/Sprites/Environment/ground_9x16.png";
import portraitTreeAsset from "../../Assets/Sprites/Environment/tree_9x16.png";
import chatGptBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_birdsprite_fly.png";
import chatGptGoldenBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_golden_birdsprite_fly.png";
import birdShotAsset from "../../Assets/Sprites/Bird/Bird Misc/bird_shot.png";
import goldenBirdShotAsset from "../../Assets/Sprites/Bird/Bird Misc/golden_bird_shot.png";
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
  CLAY_SHOOTING_INTRO_DURATION_MS,
  DOG_HOLD_DURATION_MS,
  DOG_INTRO_JUMP_MS,
  DOG_INTRO_JUMP_START_MS,
  DOG_LOWER_DURATION_MS,
  DOG_POP_DELAY_MS,
  DOG_RETRIEVE_PAUSE_MS,
  DOG_RISE_DURATION_MS,
  DUCK_CALL_SUMMON_DELAY_MAX_MS,
  DUCK_CALL_SUMMON_DELAY_MIN_MS,
  GOLDEN_DUCK_POINTS,
  GOLDEN_DUCK_SPEED_MULTIPLIER,
  GOLDEN_DUCK_VISIBLE_MS,
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
import { gameAudio, type GameSoundKey } from "@/game/audio";
import { LANDSCAPE_LAYOUT, isPortraitLayout, type GameplayLayoutProfile } from "@/game/layout";
import { useGameplayLayout } from "@/hooks/useGameplayLayout";
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
import { drawPixelBeveledPanel, drawPixelPanel, drawPixelText, drawWrappedPixelText, pointInRect, wrapPixelText, type Rect } from "@/game/uiDraw";
import type {
  BirdColor,
  DuckCallStatus,
  GameMode,
  GoldenFlushProgress,
  GoldenFlushSummary,
  HitRecord,
  RoundResult,
  TargetEntity,
  TweetCandidate
} from "@/game/types";
import { streamGoldenFlush } from "@/lib/goldenFlushClient";

type RuntimePhase = "boot" | "intro" | "active" | "resolve" | "ended";

type RuntimeState = {
  mode: GameMode;
  layout: GameplayLayoutProfile;
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
  dogLaughSoundPlayed: boolean;
  dogBarkWindowStarted: boolean;
  dogBarkCounterFrames: number;
  scoreReveals: Array<{
    id: string;
    x: number;
    y: number;
    points: number;
    expiresAtMs: number;
  }>;
  duckCallStatus: DuckCallStatus;
  duckCallTriggeredAtMs?: number;
  goldenSpawnAtMs?: number;
  goldenTargetId?: string;
  goldenFlushProgress: GoldenFlushProgress;
  goldenSummary?: GoldenFlushSummary;
  flockClearedFlashStartedAtMs?: number;
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
  debugMode?: boolean;
  onRoundEnd: (result: RoundResult) => void;
  onQuit: () => void;
};

const PIXEL_FONT = "'Press Start 2P', monospace";

const COLORS: BirdColor[] = ["blue", "green", "red"];
const UI_SCALE = 4;
const PORTRAIT_UI_SCALE = 3.25;

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
const FALLING_DUCK_HALF_HEIGHT = 58;
const PORTRAIT_DOG_POP_DOWN_Y = 0;
const PORTRAIT_DOG_LAUGH_UP_Y = 13;
const BIRD_LAUNCH_Y_MIN = FOREGROUND_GRASS_TOP_Y - 28;
const BIRD_LAUNCH_Y_MAX = FOREGROUND_GRASS_TOP_Y - 14;
const BIRD_FLIGHT_FLOOR_Y = FOREGROUND_GRASS_TOP_Y - 10;
const MIN_BIRD_SCREEN_TIME_MS = 1800;
const DOG_BARK_INITIAL_FRAMES = 4;
const DOG_BARK_REPEAT_FRAMES = 16;
const DOG_INTRO_FLUSH_START_MS = DOG_INTRO_JUMP_START_MS;
const DOG_INTRO_FLUSH_END_MS = DOG_INTRO_FLUSH_START_MS + DOG_INTRO_JUMP_MS;
const DUCK_FLAP_INTERVAL_FRAMES = 8;
const PORTRAIT_FRAME_INTERVAL_MS = 1000 / 30;

const BUTTON_TEXT_SIZE = 16;

function introDurationForMode(mode: GameMode) {
  return mode === "C" ? CLAY_SHOOTING_INTRO_DURATION_MS : ROUND_INTRO_DURATION_MS;
}

function duckGroundSoundY(layout: GameplayLayoutProfile) {
  if (isPortraitLayout(layout)) return layout.groundY - FALLING_DUCK_HALF_HEIGHT;
  return FOREGROUND_GRASS_TOP_Y - FALLING_DUCK_HALF_HEIGHT;
}

function uiScaleForLayout(layout: GameplayLayoutProfile) {
  return isPortraitLayout(layout) ? PORTRAIT_UI_SCALE : UI_SCALE;
}

function generateGoldenFlushNonce() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `gf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function drawDuckCallButton(ctx: CanvasRenderingContext2D, layout: GameplayLayoutProfile, status: DuckCallStatus) {
  if (status === "disabled") return;
  if (!isPortraitLayout(layout)) return;
  const rect = layout.duckCallButton;
  const portrait = isPortraitLayout(layout);
  const isReady = status === "ready";
  const isCalling = status === "calling";
  const isSummoned = status === "summoned";
  const isSpent = status === "spent";

  const fill = isReady ? "#1a1207" : isCalling ? "#3b2705" : isSummoned ? "#6d4a07" : "#161019";
  const stroke = isReady ? "#f5c542" : isCalling ? "#f7b733" : isSummoned ? "#ffe066" : "#7a6f56";

  drawPixelBeveledPanel(ctx, rect, {
    fill,
    stroke,
    lineWidth: 4,
    bevel: 8
  });

  const labelTop = isReady ? "DUCK" : isCalling ? "DUCK" : isSummoned ? "GOLDEN" : "USED";
  const labelBottom = isReady ? "CALL" : isCalling ? "CALL..." : isSummoned ? "DUCK!" : "TODAY";

  const titleSize = portrait ? 16 : 13;
  const subtitleSize = portrait ? 14 : 11;
  const baseY = rect.y + rect.height / 2 - (portrait ? 8 : 6);

  drawPixelText(ctx, labelTop, rect.x + rect.width / 2, baseY, {
    size: titleSize,
    color: stroke,
    align: "center",
    baseline: "middle"
  });
  drawPixelText(ctx, labelBottom, rect.x + rect.width / 2, baseY + (portrait ? 22 : 16), {
    size: subtitleSize,
    color: isReady ? "#fff9e8" : "#fff9e8",
    align: "center",
    baseline: "middle"
  });

  if (!portrait) {
    const hintY = rect.y + rect.height + 14;
    drawPixelText(ctx, isReady ? "PRESS D" : "", rect.x + rect.width / 2, hintY, {
      size: 9,
      color: "#9c8b6c",
      align: "center"
    });
  }
}

function drawFlockClearedFlash(ctx: CanvasRenderingContext2D, state: RuntimeState, timeMs: number) {
  if (state.flockClearedFlashStartedAtMs === undefined) return;
  const ageMs = timeMs - state.flockClearedFlashStartedAtMs;
  const FLASH_DURATION_MS = 1600;
  if (ageMs > FLASH_DURATION_MS) return;
  const progress = ageMs / FLASH_DURATION_MS;
  const alpha = progress < 0.18 ? progress / 0.18 : 1 - (progress - 0.18) / 0.82;
  const portrait = isPortraitLayout(state.layout);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = "rgba(245, 197, 66, 0.16)";
  ctx.fillRect(0, 0, state.layout.width, state.layout.height);
  drawPixelText(
    ctx,
    "FLOCK CLEARED",
    state.layout.width / 2,
    state.layout.height / 2 - (portrait ? 12 : 8),
    {
      size: portrait ? 36 : 44,
      color: "#fff3c4",
      align: "center",
      baseline: "middle"
    }
  );
  if (state.goldenSummary) {
    drawPixelText(
      ctx,
      `${state.goldenSummary.tweetsDeleted} TWEETS DELETED`,
      state.layout.width / 2,
      state.layout.height / 2 + (portrait ? 32 : 36),
      {
        size: portrait ? 18 : 20,
        color: "#f5c542",
        align: "center",
        baseline: "middle"
      }
    );
  }
  ctx.restore();
}

const GOLDEN_FLUSH_HUD_HOLD_MS = 1800;
const GOLDEN_FLUSH_HUD_FADE_MS = 600;

function drawGoldenFlushHud(ctx: CanvasRenderingContext2D, layout: GameplayLayoutProfile, progress: GoldenFlushProgress, timeMs: number) {
  if (progress.phase === "idle") return;
  let alpha = 1;
  if ((progress.phase === "complete" || progress.phase === "failed") && progress.completedAtMs !== undefined) {
    const ageMs = timeMs - progress.completedAtMs;
    if (ageMs >= GOLDEN_FLUSH_HUD_HOLD_MS + GOLDEN_FLUSH_HUD_FADE_MS) return;
    if (ageMs > GOLDEN_FLUSH_HUD_HOLD_MS) {
      alpha = 1 - (ageMs - GOLDEN_FLUSH_HUD_HOLD_MS) / GOLDEN_FLUSH_HUD_FADE_MS;
    }
  }
  const rect = layout.goldenFlushPanel;
  const portrait = isPortraitLayout(layout);

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  drawPixelBeveledPanel(ctx, rect, {
    fill: "rgba(15, 9, 2, 0.92)",
    stroke: "#f5c542",
    lineWidth: 4,
    bevel: 12
  });

  const titleSize = portrait ? 20 : 22;
  const detailSize = portrait ? 14 : 14;
  const titleY = rect.y + (portrait ? 22 : 24);
  drawPixelText(ctx, "GOLDEN FLUSH", rect.x + rect.width / 2, titleY, {
    size: titleSize,
    color: "#f5c542",
    align: "center"
  });

  const total = Math.max(progress.totalEligible, 1);
  const deleted = progress.deleted;
  const failed = progress.failed;

  const barX = rect.x + 24;
  const barY = rect.y + (portrait ? 56 : 60);
  const barW = rect.width - 48;
  const barH = portrait ? 16 : 14;
  ctx.fillStyle = "#241704";
  ctx.fillRect(barX, barY, barW, barH);
  const ratio = Math.min(1, deleted / total);
  ctx.fillStyle = "#f5c542";
  ctx.fillRect(barX, barY, Math.round(barW * ratio), barH);
  ctx.strokeStyle = "#fff3c4";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

  const statusText =
    progress.phase === "starting"
      ? "ARMING FLUSH..."
      : progress.phase === "running"
        ? `DELETING ${deleted}/${progress.totalEligible}${failed > 0 ? `  FAILED ${failed}` : ""}`
        : progress.phase === "complete"
          ? `FLOCK CLEARED: ${deleted}${failed > 0 ? `  (${failed} failed)` : ""}`
          : `ERROR: ${(progress.error ?? "Golden flush stopped").slice(0, 40)}`;

  drawPixelText(ctx, statusText, rect.x + rect.width / 2, barY + barH + (portrait ? 26 : 22), {
    size: detailSize,
    color: progress.phase === "failed" ? "#ff7676" : "#fff9e8",
    align: "center"
  });

  if (progress.phase === "running") {
    const pulse = 0.6 + 0.4 * Math.sin(timeMs / 160);
    ctx.save();
    ctx.globalAlpha = pulse * alpha;
    drawPixelText(ctx, "QUACK!", rect.x + rect.width / 2, rect.y + rect.height - 16, {
      size: portrait ? 14 : 12,
      color: "#f5c542",
      align: "center",
      baseline: "alphabetic"
    });
    ctx.restore();
  }

  ctx.restore();
}

function drawScaledImage(ctx: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number) {
  ctx.drawImage(image, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function roundUiX(roundNumber: number, layout: GameplayLayoutProfile = LANDSCAPE_LAYOUT) {
  const hud = layout.hud;
  const scale = uiScaleForLayout(layout);
  const shotsWidth = 29 * scale;
  const roundWidth = (roundNumber < 10 ? 24 : 32) * scale;
  return hud.shots.x + (shotsWidth - roundWidth) / 2;
}

function createInitialState(mode: GameMode, roundNumber: number, targetLimit: number, isLiveTweetRound: boolean, layout: GameplayLayoutProfile): RuntimeState {
  return {
    mode,
    layout,
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
    releaseDelayFrames: isPortraitLayout(layout) ? (mode === "A" ? 18 : 8) : modeReleaseDelay(mode),
    pendingLaunches: 0,
    launchSlotIndex: 0,
    lastPathId: -1,
    retrieveDogTriggeredAtMs: undefined,
    retrieveDogX: undefined,
    dogLaughSoundPlayed: false,
    dogBarkWindowStarted: false,
    dogBarkCounterFrames: DOG_BARK_INITIAL_FRAMES,
    scoreReveals: [],
    duckCallStatus: mode === "C" || !isLiveTweetRound ? "disabled" : "ready",
    duckCallTriggeredAtMs: undefined,
    goldenSpawnAtMs: undefined,
    goldenTargetId: undefined,
    goldenFlushProgress: { phase: "idle", totalEligible: 0, deleted: 0, failed: 0 },
    goldenSummary: undefined,
    flockClearedFlashStartedAtMs: undefined,
    ended: false
  };
}

function getRemainingArmedTweetIds(state: RuntimeState, tweets: TweetCandidate[]): string[] {
  if (state.mode === "C" || !state.isLiveTweetRound) return [];
  const consumedIds = new Set<string>();
  for (const hit of state.hits) {
    if (hit.tweet) consumedIds.add(hit.tweet.id);
  }
  for (const escape of state.escapes) {
    if (escape.tweet) consumedIds.add(escape.tweet.id);
  }
  for (const target of state.targets) {
    if (target.tweet) consumedIds.add(target.tweet.id);
  }
  for (let index = 0; index < state.nextTweetIndex; index += 1) {
    const tweet = tweets[index];
    if (tweet) consumedIds.add(tweet.id);
  }
  const remaining: string[] = [];
  for (const tweet of tweets) {
    if (!consumedIds.has(tweet.id)) remaining.push(tweet.id);
  }
  return remaining;
}

function canUseDuckCall(state: RuntimeState | null): boolean {
  if (!state) return false;
  if (state.phase !== "active") return false;
  if (state.duckCallStatus !== "ready") return false;
  if (state.mode === "C") return false;
  if (!state.isLiveTweetRound) return false;
  return true;
}

function triggerDuckCall(state: RuntimeState, now: number) {
  state.duckCallStatus = "calling";
  state.duckCallTriggeredAtMs = now;
  const jitter = DUCK_CALL_SUMMON_DELAY_MIN_MS + Math.random() * (DUCK_CALL_SUMMON_DELAY_MAX_MS - DUCK_CALL_SUMMON_DELAY_MIN_MS);
  state.goldenSpawnAtMs = now + jitter;
  gameAudio.play("duckQuack", 0.9);
}

function spawnGoldenDuck(state: RuntimeState, now: number) {
  const { layout } = state;
  const portrait = isPortraitLayout(layout);
  const direction: 1 | -1 = (rngNext(state.rng) & 1) === 0 ? 1 : -1;
  const startX = direction === 1 ? layout.tuning.birdHorizontalPadding : layout.width - layout.tuning.birdHorizontalPadding;
  const baseY = portrait ? layout.tuning.birdFlightTopY + 36 : 200;
  const speedJitter = rngNext(state.rng) % layout.tuning.birdSpeedJitter;
  const vx = direction * (layout.tuning.birdBaseVx + speedJitter) * GOLDEN_DUCK_SPEED_MULTIPLIER;
  const vy = portrait ? layout.tuning.birdBaseVy * 0.4 : -120;

  const target: TargetEntity = {
    id: `golden_${state.roundNumber}_${now}`,
    kind: "bird",
    tweet: undefined,
    color: "golden",
    status: "flying",
    mechanicsState: "flying",
    x: startX,
    y: baseY,
    vx,
    vy,
    nesX: canvasToNesXForLayout(startX, layout),
    nesY: canvasToNesYForLayout(baseY, layout),
    radius: portrait ? layout.tuning.touchHitRadius * 1.1 : layout.tuning.touchHitRadius,
    createdAtMs: now,
    points: GOLDEN_DUCK_POINTS,
    direction,
    flight: portrait ? "diag" : "side",
    slotIndex: 0,
    shootable: true,
    isGolden: true,
    expiresAtMs: now + GOLDEN_DUCK_VISIBLE_MS,
    motionCode: direction === 1 ? 3 : 13,
    speedIndex: 0,
    flyAwayFlag: false,
    flyAwayTimer: Math.ceil(GOLDEN_DUCK_VISIBLE_MS / FIXED_STEP_MS),
    launchFlag: false,
    pingPongEdges: true,
    fliesBehindTree: false
  };

  state.targets = [...state.targets, target];
  state.goldenTargetId = target.id;
  state.duckCallStatus = "summoned";
  gameAudio.play("duckQuack", 0.85);
}

function clearGoldenIfExpired(state: RuntimeState, now: number) {
  if (!state.goldenTargetId) return;
  const target = state.targets.find((candidate) => candidate.id === state.goldenTargetId);
  if (!target) return;
  if (target.status !== "flying") return;
  if (target.expiresAtMs !== undefined && now >= target.expiresAtMs) {
    target.status = "escaped";
    target.mechanicsState = "clear";
    state.goldenTargetId = undefined;
    if (state.duckCallStatus === "summoned") state.duckCallStatus = "ready";
  }
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function canvasToNesXForLayout(x: number, layout: GameplayLayoutProfile) {
  return Math.floor((x / layout.width) * NES_WIDTH);
}

function canvasToNesYForLayout(y: number, layout: GameplayLayoutProfile) {
  return Math.floor((y / layout.height) * NES_HEIGHT);
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

function drawUiImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, scale: number) {
  drawScaledImage(ctx, image, x, y, image.naturalWidth * scale, image.naturalHeight * scale);
}

function drawRoundUiImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, roundNumber: number, x: number, y: number, scale: number) {
  const sourceWidth = roundNumber < 10 ? 24 : image.naturalWidth;
  ctx.drawImage(image, 0, 0, sourceWidth, image.naturalHeight, Math.round(x), Math.round(y), Math.round(sourceWidth * scale), Math.round(image.naturalHeight * scale));
}

function drawScoreDigit(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, digit: number, x: number, y: number, scale: number) {
  const glyphWidth = 8;
  const glyphHeight = 8;
  const sourceX = (digit % 5) * glyphWidth;
  const sourceY = digit >= 5 ? glyphHeight : 0;
  ctx.drawImage(atlas, sourceX, sourceY, glyphWidth, glyphHeight, Math.round(x), Math.round(y), Math.round(glyphWidth * scale), Math.round(glyphHeight * scale));
}

function drawScoreNumber(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, score: number, layout: GameplayLayoutProfile) {
  const hud = layout.hud;
  const scale = uiScaleForLayout(layout);
  const digits = Math.max(0, score).toString().padStart(6, "0").slice(-6);
  const glyphWidth = 8 * scale;
  const x = isPortraitLayout(layout) ? hud.score.x + 13 : hud.score.x + 4 * scale - 4;
  const y = isPortraitLayout(layout) ? hud.score.y + 7 : hud.score.y + scale + 8;

  ctx.fillStyle = "#050508";
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(glyphWidth * 6), Math.round(8 * scale));
  for (let index = 0; index < digits.length; index += 1) {
    drawScoreDigit(ctx, atlas, Number(digits[index]), x + index * glyphWidth, y, scale);
  }
}

function drawRoundNumber(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, roundNumber: number, layout: GameplayLayoutProfile) {
  const scale = uiScaleForLayout(layout);
  const digits = Math.max(1, roundNumber).toString().slice(-2);
  const glyphWidth = 8 * scale;
  const x = roundUiX(roundNumber, layout) + 16 * scale;
  const y = layout.hud.round.y;

  for (let index = 0; index < digits.length; index += 1) {
    drawScoreDigit(ctx, atlas, Number(digits[index]), x + index * glyphWidth, y, scale);
  }
}

function drawHitDucks(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, hits: number, layout: GameplayLayoutProfile) {
  const hud = layout.hud;
  const scale = uiScaleForLayout(layout);
  const duckWidth = 8;
  const duckHeight = 8;
  const y = hud.hit.y + 3 * scale;

  for (let index = 0; index < Math.min(hits, TARGETS_PER_ROUND); index += 1) {
    ctx.drawImage(
      atlas,
      index * duckWidth,
      0,
      duckWidth,
      duckHeight,
      Math.round(hud.hit.x + (35 + index * 8) * scale),
      Math.round(y),
      Math.round(duckWidth * scale),
      Math.round(duckHeight * scale)
    );
  }
}

function maskSpentShots(ctx: CanvasRenderingContext2D, shotsRemaining: number, layout: GameplayLayoutProfile) {
  const hud = layout.hud;
  const scale = uiScaleForLayout(layout);
  ctx.fillStyle = "#050508";
  for (let index = shotsRemaining; index < SHOTS_PER_VOLLEY; index += 1) {
    ctx.fillRect(
      Math.round(hud.shots.x + (4 + index * 8) * scale),
      Math.round(hud.shots.y + 3 * scale),
      Math.round(5 * scale),
      Math.round(9 * scale)
    );
  }
}

function drawSpriteHud(
  ctx: CanvasRenderingContext2D,
  state: RuntimeState,
  images: Partial<Record<UiImageKey, HTMLImageElement>>,
  clayTargetAtlas: CanvasImageSource | null | undefined
) {
  const isClayMode = state.mode === "C";
  const layout = state.layout;
  const hud = { ...layout.hud };
  const scale = uiScaleForLayout(layout);
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

  if (isPortraitLayout(layout)) {
    const groupLeft = Math.min(hud.shots.x, hud.hit.x);
    const groupRight = Math.max(hud.shots.x + shots.naturalWidth * scale, hud.hit.x + hit.naturalWidth * scale);
    const centeredLeft = (layout.width - (groupRight - groupLeft)) / 2;
    const offsetX = Math.round(centeredLeft - groupLeft);
    hud.shots = { ...hud.shots, x: hud.shots.x + offsetX };
    hud.hit = { ...hud.hit, x: hud.hit.x + offsetX };
  }
  const bottomHudLayout = { ...layout, hud };

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawRoundUiImage(ctx, round, state.roundNumber, roundUiX(state.roundNumber, layout), layout.hud.round.y, scale);
  drawUiImage(ctx, shots, hud.shots.x, hud.shots.y, scale);
  drawUiImage(ctx, hit, hud.hit.x, hud.hit.y, scale);
  drawUiImage(ctx, score, layout.hud.score.x, layout.hud.score.y, scale);
  drawRoundNumber(ctx, roundAtlas, state.roundNumber, layout);
  maskSpentShots(ctx, state.shotsRemaining, bottomHudLayout);
  if (isClayMode && clayHitCounterFilled && state.hits.length > 0) {
    drawClayHitCounterFilledOverlay(ctx, clayHitCounterFilled, state.hits.length, hud.hit, scale);
  } else if (isClayMode && clayHitFilled) {
    drawClayHitHudIndicators(ctx, clayHitFilled, state.hits.length, hud.hit, scale);
  } else if (isClayMode && clayTargetAtlas) {
    drawClayHitHudIndicators(ctx, clayTargetAtlas, state.hits.length, hud.hit, scale, {
      sourceRect: CLAY_HIT_HUD_ATLAS_FRAME
    });
  } else if (hitAtlas) {
    drawHitDucks(ctx, hitAtlas, state.hits.length, bottomHudLayout);
  }
  drawScoreNumber(ctx, scoreAtlas, state.score, layout);
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

function measurePixelText(ctx: CanvasRenderingContext2D, text: string, size: number) {
  ctx.save();
  ctx.font = `${size}px ${PIXEL_FONT}`;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

function fitWithEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number) {
  const ellipsis = "...";
  if (measurePixelText(ctx, `${text}${ellipsis}`, size) <= maxWidth) return `${text}${ellipsis}`;

  let clipped = text;
  while (clipped.length > 0 && measurePixelText(ctx, `${clipped}${ellipsis}`, size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped.trimEnd()}${ellipsis}`;
}

function drawClampedWrappedPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  options: { size: number; color: string; align: CanvasTextAlign }
) {
  const lines = wrapPixelText(ctx, text, maxWidth, options.size);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length > 0) {
    visibleLines[visibleLines.length - 1] = fitWithEllipsis(ctx, visibleLines[visibleLines.length - 1], maxWidth, options.size);
  }

  for (let index = 0; index < visibleLines.length; index += 1) {
    drawPixelText(ctx, visibleLines[index], x, y + index * lineHeight, options);
  }

  return visibleLines.length;
}

function drawMicroRevealPanel(ctx: CanvasRenderingContext2D, reveal: MicroReveal, layout: GameplayLayoutProfile = LANDSCAPE_LAYOUT) {
  if (!reveal) return;
  let panel = layout.microRevealPanel;
  const isPortrait = layout.id === "portrait";
  const metricsText = `${reveal.likes} likes  ${reveal.comments} comments  ${reveal.retweets} retweets`;
  const textSize = isPortrait ? 17 : 18;
  const lineHeight = isPortrait ? 30 : 32;
  let metricsSize = isPortrait ? 13 : 16;
  let textInsetX = isPortrait ? 30 : 24;
  const topInset = isPortrait ? 22 : 22;
  const metricsGap = isPortrait ? 14 : 8;
  const bottomInset = isPortrait ? 28 : 22;

  if (isPortrait) {
    const maxWidth = panel.width - textInsetX * 2;
    const desiredLines = Math.min(wrapPixelText(ctx, reveal.text, maxWidth, textSize).length, 3);
    const desiredHeight = topInset + desiredLines * lineHeight + metricsGap + metricsSize + bottomInset;
    const height = Math.min(panel.height, Math.max(118, desiredHeight));
    const bottomY = layout.height - 20;
    panel = { ...panel, y: bottomY - height, height };
  } else {
    const maxWidth = panel.width - textInsetX * 2;
    const desiredLines = Math.min(wrapPixelText(ctx, reveal.text, maxWidth, textSize).length, 2);
    const desiredHeight = topInset + desiredLines * lineHeight + metricsGap + metricsSize + bottomInset;
    const height = Math.min(panel.height, Math.max(112, desiredHeight));
    panel = { ...panel, height };
  }
  while (metricsSize > 11 && measurePixelText(ctx, metricsText, metricsSize) > panel.width - 40) {
    metricsSize -= 1;
  }

  drawPixelBeveledPanel(ctx, panel, {
    fill: isPortrait ? "#0a0a0e" : "rgba(10, 10, 14, 0.9)",
    stroke: "#e79a1b",
    lineWidth: 4,
    bevel: 12
  });

  const textX = panel.x + panel.width / 2;
  const textY = panel.y + topInset;
  const textWidth = panel.width - textInsetX * 2;
  const maxTextLines = Math.max(1, Math.floor((panel.height - topInset - metricsGap - bottomInset - metricsSize) / lineHeight));
  drawClampedWrappedPixelText(ctx, reveal.text, textX, textY, textWidth, lineHeight, maxTextLines, {
    size: textSize,
    color: "#fff9e8",
    align: "center"
  });
  const metricsY = isPortrait ? panel.y + panel.height - bottomInset : panel.y + panel.height - bottomInset - metricsSize;
  drawPixelText(ctx, metricsText, layout.width / 2, metricsY, {
    size: metricsSize,
    color: "#e79a1b",
    align: "center"
  });
}

function drawPauseButton(ctx: CanvasRenderingContext2D, rect: Rect, label: string, primary = false) {
  drawPixelPanel(ctx, rect, {
    fill: primary ? "#e79a1b" : "#1c1c24",
    stroke: "#08080c",
    lineWidth: 4
  });
  drawPixelText(ctx, label, rect.x + rect.width / 2, rect.y + rect.height / 2, {
    size: BUTTON_TEXT_SIZE,
    color: primary ? "#09090d" : "#fff9e8",
    align: "center",
    baseline: "middle",
    shadow: false
  });
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D, layout: GameplayLayoutProfile = LANDSCAPE_LAYOUT) {
  ctx.save();
  ctx.fillStyle = "rgba(2, 3, 8, 0.62)";
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.restore();

  drawPixelBeveledPanel(ctx, layout.pausePanel, {
    fill: "rgba(5, 7, 16, 0.96)",
    stroke: "#e79a1b",
    lineWidth: 5,
    bevel: 18
  });
  drawPixelText(ctx, "PAUSED", layout.width / 2, layout.pausePanel.y + 52, {
    size: 30,
    color: "#e79a1b",
    align: "center"
  });
  drawPixelText(ctx, isPortraitLayout(layout) ? "Tap Resume to continue." : "Press Escape to resume.", layout.width / 2, layout.pausePanel.y + 124, {
    size: isPortraitLayout(layout) ? 16 : 12,
    color: "#b9ad9a",
    align: "center"
  });
  drawPauseButton(ctx, layout.pauseResumeButton, "RESUME", true);
  drawPauseButton(ctx, layout.pauseQuitButton, "QUIT");
}

function drawPortraitEnvironment(ctx: CanvasRenderingContext2D, layout: GameplayLayoutProfile, isClayMode: boolean, backgroundImage?: HTMLImageElement | null) {
  ctx.imageSmoothingEnabled = false;
  if (!isClayMode && backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, layout.width, layout.height);
    return;
  }

  const skyTop = isClayMode ? "#13233f" : "#63c8ff";
  const skyBottom = isClayMode ? "#27456b" : "#9be5ff";
  const gradient = ctx.createLinearGradient(0, 0, 0, layout.height);
  gradient.addColorStop(0, skyTop);
  gradient.addColorStop(0.72, skyBottom);
  gradient.addColorStop(0.721, "#2bb44a");
  gradient.addColorStop(1, "#145d29");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (!isClayMode) {
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    drawPortraitCloud(ctx, 76, 160, 0.72);
    drawPortraitCloud(ctx, 346, 118, 0.6);
    drawPortraitCloud(ctx, 438, 270, 0.48);
  }

  ctx.fillStyle = isClayMode ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.16)";
  ctx.fillRect(0, 0, layout.width, 4);
}

function drawPortraitForeground(
  ctx: CanvasRenderingContext2D,
  layout: GameplayLayoutProfile,
  groundImage?: HTMLImageElement | null,
  grassImage?: HTMLImageElement | null,
  treeImage?: HTMLImageElement | null
) {
  if (groundImage || grassImage || treeImage) {
    if (treeImage) ctx.drawImage(treeImage, 0, 0, layout.width, layout.height);
    if (groundImage) ctx.drawImage(groundImage, 0, 0, layout.width, layout.height);
    if (grassImage) ctx.drawImage(grassImage, 0, 0, layout.width, layout.height);
    return;
  }

  ctx.fillStyle = "#2bb44a";
  ctx.fillRect(0, layout.groundY, layout.width, layout.height - layout.groundY);
  ctx.fillStyle = "#1f9239";
  for (let x = 0; x < layout.width; x += 18) {
    ctx.fillRect(x, layout.groundY + ((x / 18) % 2) * 7, 10, layout.height - layout.groundY);
  }
  ctx.fillStyle = "#145d29";
  ctx.fillRect(0, layout.height - 28, layout.width, 28);
}

function drawPortraitCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.beginPath();
  ctx.arc(x, y, 24 * scale, 0, Math.PI * 2);
  ctx.arc(x + 28 * scale, y - 10 * scale, 30 * scale, 0, Math.PI * 2);
  ctx.arc(x + 64 * scale, y, 24 * scale, 0, Math.PI * 2);
  ctx.rect(x - 2 * scale, y, 70 * scale, 24 * scale);
  ctx.fill();
}

function createWaitingTarget(state: RuntimeState, targetIndex: number, tweet: TweetCandidate | undefined): TargetEntity {
  const { mode, roundNumber, layout } = state;
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
    x: layout.width / 2,
    y: layout.height,
    vx: 0,
    vy: 0,
    nesX: NES_WIDTH / 2,
    nesY: NES_HEIGHT,
    radius: kind === "clay" ? layout.tuning.clayHitRadius : layout.tuning.touchHitRadius,
    createdAtMs: performance.now(),
    points,
    direction: 1,
    flight: "side",
    slotIndex: targetIndex % targetsPerVolley(mode),
    shootable: false
  };
}

function playTargetSound(
  target: TargetEntity,
  key: GameSoundKey,
  flag: "launchSoundPlayed" | "fallSoundPlayed" | "groundSoundPlayed" | "flyAwaySoundPlayed",
  volume?: number
) {
  if (target[flag]) return;
  target[flag] = true;
  gameAudio.play(key, volume);
}

function launchTarget(state: RuntimeState, target: TargetEntity, now: number) {
  target.status = "flying";
  target.mechanicsState = "flying";
  target.createdAtMs = now;
  target.shootable = true;

  if (isPortraitLayout(state.layout)) {
    launchPortraitTarget(state, target, now);
    return;
  }

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
    playTargetSound(target, "clayPigeonLaunch", "launchSoundPlayed", 0.72);
    gameAudio.startLoop("clayPigeonFlying", 0.32);
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
    playTargetSound(target, "duckFlying", "launchSoundPlayed", 0.68);
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
  playTargetSound(target, "duckFlying", "launchSoundPlayed", 0.68);
}

function launchPortraitTarget(state: RuntimeState, target: TargetEntity, now: number) {
  const { layout } = state;
  const direction = target.slotIndex === 0 ? -1 : 1;
  const jitter = (rngNext(state.rng) % 64) - 32;
  target.direction = direction;
  target.createdAtMs = now;
  target.fliesBehindTree = false;

  if (target.kind === "clay") {
    const speedJitter = rngNext(state.rng) % layout.tuning.birdSpeedJitter;
    target.pathId = rngNext(state.rng) % CLAY_PATHS.length;
    target.x = layout.width / 2 + direction * (42 + Math.abs(jitter) * 0.55);
    target.y = layout.tuning.clayLaunchY;
    target.vx = direction * (layout.tuning.clayBaseVx + speedJitter);
    target.vy = layout.tuning.clayBaseVy - (rngNext(state.rng) % 70);
    target.nesX = canvasToNesXForLayout(target.x, layout);
    target.nesY = canvasToNesYForLayout(target.y, layout);
    target.clayImageIndex = 0;
    target.distanceClass = 0;
    target.zapperShape = clayZapperShape(state.roundNumber, 0);
    playTargetSound(target, "clayPigeonLaunch", "launchSoundPlayed", 0.72);
    gameAudio.startLoop("clayPigeonFlying", 0.32);
    return;
  }

  const launchSide = target.slotIndex === 0 ? -1 : 1;
  const speedJitter = rngNext(state.rng) % layout.tuning.birdSpeedJitter;
  const startX =
    launchSide < 0
      ? layout.width - layout.tuning.birdHorizontalPadding
      : layout.tuning.birdHorizontalPadding;
  target.x = startX + jitter * 0.35;
  target.y = layout.tuning.birdLaunchY + (rngNext(state.rng) % 72) - 36;
  target.vx = -launchSide * (layout.tuning.birdBaseVx + speedJitter);
  target.vy = layout.tuning.birdBaseVy - (rngNext(state.rng) % 70);
  target.nesX = canvasToNesXForLayout(target.x, layout);
  target.nesY = canvasToNesYForLayout(target.y, layout);
  target.zapperShape = duckZapperShapeForRound(state.roundNumber);
  target.flyAwayTimer = Math.round(flyAwayTimerForRound(state.roundNumber) * 1.25);
  target.flyAwayFlag = false;
  target.motionCode = target.vx >= 0 ? 3 : 13;
  target.flight = "diag";
  target.speedIndex = duckSpeedIndexForRound(Math.max(1, state.roundNumber - 1));
  playTargetSound(target, "duckFlying", "launchSoundPlayed", 0.68);
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
  gameAudio.stopLoop("clayPigeonFlying");
  const count = Math.min(targetsPerVolley(state.mode), state.targetLimit - state.targetsPresented);
  const targets: TargetEntity[] = [];

  for (let index = 0; index < count; index += 1) {
    const targetIndex = state.targetsPresented + index;
    const tweet = state.isLiveTweetRound ? tweets[state.nextTweetIndex + index] : undefined;
    targets.push(createWaitingTarget(state, targetIndex, tweet));
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
    state.releaseDelayFrames = releaseDelayForLayout(state);
  state.pendingLaunches = targets.length;
  state.launchSlotIndex = 0;
  state.retrieveDogTriggeredAtMs = undefined;
  state.retrieveDogX = undefined;
  state.dogLaughSoundPlayed = false;
}

function markEscaped(state: RuntimeState, target: TargetEntity, now: number) {
  if (target.status !== "flying" || target.mechanicsState === "waiting") return;
  target.status = "escaped";
  target.mechanicsState = "clear";
  target.escapedAtMs = now;
  if (target.isGolden) {
    if (state.goldenTargetId === target.id) state.goldenTargetId = undefined;
    if (state.duckCallStatus === "summoned") state.duckCallStatus = "ready";
    return;
  }
  state.escapes.push({
    targetId: target.id,
    tweet: target.tweet,
    escapedAtMs: now,
    mode: state.mode
  });
}

function finishRound(state: RuntimeState, onRoundEnd: Props["onRoundEnd"]) {
  if (state.ended) return;
  gameAudio.stopLoop("clayPigeonFlying");
  state.ended = true;
  state.phase = "ended";
  const nonGoldenHits = state.hits.filter((hit) => !hit.isGolden).length;
  const passLine = state.isLiveTweetRound ? Math.min(passLineForRound(state.roundNumber), state.targetLimit) : passLineForRound(state.roundNumber);
  const passed = nonGoldenHits >= passLine;
  const isPerfectArcadeRound = !state.isLiveTweetRound && nonGoldenHits === state.targetLimit;
  if (isPerfectArcadeRound) {
    state.score += perfectBonusForRound(state.roundNumber);
    gameAudio.play("perfectRound", 0.82);
  } else {
    gameAudio.play(passed ? "roundClear" : "failedRound", passed ? 0.78 : 0.82);
  }
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
    passed,
    goldenFlush: state.goldenSummary
  });
}

function advanceFixedStep(state: RuntimeState, now: number) {
  if (state.phase !== "active" && state.phase !== "resolve" && state.phase !== "intro") return;
  state.fixedFrameCounter += 1;

  if (
    state.duckCallStatus === "calling" &&
    state.goldenSpawnAtMs !== undefined &&
    now >= state.goldenSpawnAtMs &&
    state.phase === "active"
  ) {
    spawnGoldenDuck(state, now);
    state.goldenSpawnAtMs = undefined;
  }

  clearGoldenIfExpired(state, now);

  if (state.phase === "intro" && state.mode !== "C") {
    const introElapsedMs = now - state.phaseStartedAtMs;
    const isFlushWindow = introElapsedMs >= DOG_INTRO_FLUSH_START_MS && introElapsedMs < DOG_INTRO_FLUSH_END_MS;
    if (isFlushWindow) {
      if (!state.dogBarkWindowStarted) {
        state.dogBarkWindowStarted = true;
        state.dogBarkCounterFrames = DOG_BARK_INITIAL_FRAMES;
      }
      state.dogBarkCounterFrames -= 1;
      if (state.dogBarkCounterFrames <= 0) {
        gameAudio.playIfIdle("dogBark", 0.72);
        state.dogBarkCounterFrames = DOG_BARK_REPEAT_FRAMES;
      }
    }
    return;
  }

  if (state.phase === "active") {
    advanceLaunchQueue(state, now);
    if (state.shotsRemaining <= 0) {
      for (const target of state.targets) {
        if (target.kind === "bird" && target.mechanicsState === "flying" && !target.flyAwayFlag) {
          playTargetSound(target, "duckQuack", "flyAwaySoundPlayed", 0.55);
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
        if (target.kind === "clay") stopClayFlyingToneIfNoActiveClays(state);
        if (target.kind === "bird") playTargetSound(target, "duckFalling", "fallSoundPlayed", 0.72);
      }
      continue;
    }

    if (target.mechanicsState === "falling") {
      updateFallingDuck(state, target);
      continue;
    }

    if (target.mechanicsState === "fragmenting") {
      target.hitPauseTimer = Math.max((target.hitPauseTimer ?? 0) - 1, 0);
      if (target.hitPauseTimer === 0) {
        target.mechanicsState = "clear";
        stopClayFlyingToneIfNoActiveClays(state);
      }
      continue;
    }

    if (state.phase !== "active" || target.mechanicsState !== "flying" || target.status !== "flying") continue;

    if (target.kind === "clay") {
      updateClayTarget(state, target);
    } else {
      if (state.fixedFrameCounter % DUCK_FLAP_INTERVAL_FRAMES === 0) gameAudio.play("duckFlying", 0.36);
      if (state.mode === "B") updateGameBDuck(state, target);
      else updateGameADuck(state, target);
    }
  }

  if (state.phase === "active" && !state.targets.some((target) => !target.isGolden && isTargetUnresolved(target))) {
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
  state.releaseDelayFrames = state.pendingLaunches > 0 ? nextLaunchGapForLayout(state) : 0;
}

function releaseDelayForLayout(state: RuntimeState) {
  if (!isPortraitLayout(state.layout)) return modeReleaseDelay(state.mode);
  return state.mode === "A" ? 18 : 8;
}

function nextLaunchGapForLayout(state: RuntimeState) {
  if (!isPortraitLayout(state.layout)) return (rngNext(state.rng) & 0x3f) + 1;
  return state.mode === "B" ? (rngNext(state.rng) & 0x0f) + 8 : (rngNext(state.rng) & 0x1f) + 12;
}

function updateGoldenDuck(state: RuntimeState, target: TargetEntity) {
  const { layout } = state;
  const dt = FIXED_STEP_MS / 1000;
  const portrait = isPortraitLayout(layout);

  target.x += target.vx * dt;
  target.y += target.vy * dt;

  const left = layout.playBounds.x + layout.tuning.birdHorizontalPadding;
  const right = layout.playBounds.x + layout.playBounds.width - layout.tuning.birdHorizontalPadding;
  const topBound = portrait ? layout.tuning.birdFlightTopY : 96;
  const bottomBound = portrait ? layout.tuning.birdFlightBottomY - 80 : 360;

  if (target.x <= left) {
    target.x = left;
    target.vx = Math.abs(target.vx);
  } else if (target.x >= right) {
    target.x = right;
    target.vx = -Math.abs(target.vx);
  }

  if (target.y <= topBound) {
    target.y = topBound;
    target.vy = Math.abs(target.vy) * 0.7;
  } else if (target.y >= bottomBound) {
    target.y = bottomBound;
    target.vy = -Math.abs(target.vy) * 0.7;
  }

  target.vy += 60 * dt; // gentle bob
  target.direction = target.vx >= 0 ? 1 : -1;
  target.flight = Math.abs(target.vy) > 90 ? "diag" : "side";
  target.nesX = canvasToNesXForLayout(target.x, layout);
  target.nesY = canvasToNesYForLayout(target.y, layout);

  if (target.expiresAtMs !== undefined && performance.now() >= target.expiresAtMs) {
    target.status = "escaped";
    target.mechanicsState = "clear";
    if (state.goldenTargetId === target.id) state.goldenTargetId = undefined;
    if (state.duckCallStatus === "summoned") state.duckCallStatus = "ready";
  }
}

function updateGameADuck(state: RuntimeState, target: TargetEntity) {
  if (target.isGolden) {
    updateGoldenDuck(state, target);
    return;
  }
  if (isPortraitLayout(state.layout)) {
    updatePortraitDuck(state, target);
    return;
  }

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
      playTargetSound(target, "duckQuack", "flyAwaySoundPlayed", 0.55);
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
  if (target.isGolden) {
    updateGoldenDuck(state, target);
    return;
  }
  if (isPortraitLayout(state.layout)) {
    updatePortraitDuck(state, target);
    return;
  }

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

function updatePortraitDuck(state: RuntimeState, target: TargetEntity) {
  const { layout } = state;
  const dt = FIXED_STEP_MS / 1000;

  if (!target.flyAwayFlag && (state.fixedFrameCounter & 1) === 1) {
    target.flyAwayTimer = Math.max((target.flyAwayTimer ?? 0) - 1, 0);
    if (target.flyAwayTimer === 0) {
      playTargetSound(target, "duckQuack", "flyAwaySoundPlayed", 0.55);
      target.flyAwayFlag = true;
    }
  }

  if (target.flyAwayFlag) {
    target.vy = Math.min(target.vy, layout.tuning.birdFlyAwayVy);
    target.vx *= 0.996;
  } else {
    target.vy += 20 * dt;
  }

  target.x += target.vx * dt;
  target.y += target.vy * dt;

  const left = layout.playBounds.x + layout.tuning.birdHorizontalPadding;
  const right = layout.playBounds.x + layout.playBounds.width - layout.tuning.birdHorizontalPadding;
  const top = layout.tuning.birdFlightTopY;
  const bottom = layout.tuning.birdFlightBottomY;

  if (!target.flyAwayFlag) {
    if (target.x <= left || target.x >= right) {
      target.x = Math.min(Math.max(target.x, left), right);
      target.vx *= -1;
    }
    if (target.y <= top) {
      target.y = top;
      target.vy = Math.abs(target.vy) * 0.72;
    } else if (target.y >= bottom) {
      target.y = bottom;
      target.vy = -Math.abs(target.vy) * 0.88;
    }
  }

  target.direction = target.vx >= 0 ? 1 : -1;
  target.flight = Math.abs(target.vy) > 120 ? "diag" : "side";
  target.nesX = canvasToNesXForLayout(target.x, layout);
  target.nesY = canvasToNesYForLayout(target.y, layout);

  if (target.y < -120 || target.x < -130 || target.x > layout.width + 130) {
    markEscaped(state, target, performance.now());
  }
}

function updateClayTarget(state: RuntimeState, target: TargetEntity) {
  const dt = FIXED_STEP_MS / 1000;
  const layout = state.layout;
  target.vy += layout.tuning.clayGravity * dt;
  target.x += target.vx * dt;
  target.y += target.vy * dt;
  target.nesX = canvasToNesXForLayout(target.x, layout);
  target.nesY = canvasToNesYForLayout(target.y, layout);

  const ageMs = performance.now() - target.createdAtMs;
  const imageIndex = Math.min(Math.floor(ageMs / 260), 11);
  target.clayImageIndex = imageIndex;
  target.distanceClass = Math.min(Math.floor(imageIndex / 2), 7);
  target.zapperShape = clayZapperShape(state.roundNumber, imageIndex);

  if (target.x < -90 || target.x > layout.width + 90 || target.y > layout.height - 80 || target.y < -110) {
    markEscaped(state, target, performance.now());
    stopClayFlyingToneIfNoActiveClays(state);
  }
}

function stopClayFlyingToneIfNoActiveClays(state: RuntimeState) {
  if (state.mode !== "C") return;
  if (!hasFlyingClayTarget(state)) gameAudio.stopLoop("clayPigeonFlying");
}

function hasFlyingClayTarget(state: RuntimeState) {
  return state.mode === "C" && state.targets.some((target) => target.kind === "clay" && target.mechanicsState === "flying" && target.status === "flying");
}

function resumeGameplayAudio(state: RuntimeState | null) {
  if (!state || state.phase !== "active") return;
  if (hasFlyingClayTarget(state)) gameAudio.startLoop("clayPigeonFlying", 0.32);
}

function updateFallingDuck(state: RuntimeState, target: TargetEntity) {
  if (isPortraitLayout(state.layout)) {
    const dt = FIXED_STEP_MS / 1000;
    target.vy = 300;
    target.vx = target.direction * 42;
    target.x += target.vx * dt;
    target.y += target.vy * dt;
    target.nesX = canvasToNesXForLayout(target.x, state.layout);
    target.nesY = canvasToNesYForLayout(target.y, state.layout);
    if (target.y >= duckGroundSoundY(state.layout)) playTargetSound(target, "duckGroundHit", "groundSoundPlayed", 0.7);
    if (target.y > state.layout.height + 80) target.mechanicsState = "clear";
    return;
  }

  target.nesY = (target.nesY ?? canvasToNesY(target.y)) + 3;
  target.nesX = (target.nesX ?? canvasToNesX(target.x)) + target.direction * 0.25;
  target.vy = 260;
  target.vx = target.direction * 55;
  syncCanvasPosition(target);
  if (target.y >= duckGroundSoundY(state.layout)) playTargetSound(target, "duckGroundHit", "groundSoundPlayed", 0.7);
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

function pointHitsTarget(point: { x: number; y: number }, target: TargetEntity, state: RuntimeState) {
  if (isPortraitLayout(state.layout)) {
    const radius = target.kind === "clay" ? state.layout.tuning.clayHitRadius : state.layout.tuning.touchHitRadius;
    const dx = point.x - target.x;
    const dy = point.y - target.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  const nesPoint = { x: canvasToNesX(point.x), y: canvasToNesY(point.y) };
  return pointHitsZapperShape(
    nesPoint.x,
    nesPoint.y,
    target.nesX ?? canvasToNesX(target.x),
    target.nesY ?? canvasToNesY(target.y),
    target.zapperShape ?? (target.kind === "clay" ? clayZapperShape(state.roundNumber, target.clayImageIndex ?? 0) : duckZapperShapeForRound(state.roundNumber))
  );
}

export function GameCanvas({ mode, roundNumber, tweets, isLiveTweetRound, debugMode = false, onRoundEnd, onQuit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const crtCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const crtRendererRef = useRef<CrtRenderer | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const flyFramesRef = useRef<FlyFrameImages | null>(null);
  const goldenFlyFramesRef = useRef<FlyFrameImages | null>(null);
  const birdShotImageRef = useRef<HTMLImageElement | null>(null);
  const goldenBirdShotImageRef = useRef<HTMLImageElement | null>(null);
  const clayTargetAtlasRef = useRef<CanvasImageSource | null>(null);
  const uiImagesRef = useRef<Partial<Record<UiImageKey, HTMLImageElement>>>({});
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const portraitBackgroundImageRef = useRef<HTMLImageElement | null>(null);
  const portraitGrassImageRef = useRef<HTMLImageElement | null>(null);
  const portraitGroundImageRef = useRef<HTMLImageElement | null>(null);
  const portraitTreeImageRef = useRef<HTMLImageElement | null>(null);
  const dogOneBirdImageRef = useRef<HTMLImageElement | null>(null);
  const dogTwoBirdImageRef = useRef<HTMLImageElement | null>(null);
  const treeImageRef = useRef<HTMLImageElement | null>(null);
  const midgroundImageRef = useRef<HTMLImageElement | null>(null);
  const foregroundImageRef = useRef<HTMLImageElement | null>(null);
  const clayBackgroundImageRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef<RuntimeState | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRenderedFrameAtRef = useRef(0);
  const mouseRef = useRef({ x: LANDSCAPE_LAYOUT.width / 2, y: LANDSCAPE_LAYOUT.height / 2 });
  const lastHudUpdateRef = useRef(0);
  const pausedRef = useRef(false);
  const pauseStartedAtRef = useRef<number | null>(null);
  const onRoundEndRef = useRef(onRoundEnd);
  const tweetsRef = useRef(tweets);
  const debugModeRef = useRef(debugMode);

  useEffect(() => {
    debugModeRef.current = debugMode;
  }, [debugMode]);
  const [assetReady, setAssetReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [microReveal, setMicroReveal] = useState<MicroReveal>(null);
  const microRevealRef = useRef<MicroReveal>(null);
  const [crtUnavailable, setCrtUnavailable] = useState(false);
  const [paused, setPaused] = useState(false);
  const layout = useGameplayLayout();

  useEffect(() => {
    mouseRef.current = { x: layout.width / 2, y: layout.height / 2 };
  }, [layout.height, layout.width]);

  useEffect(() => {
    if (isPortraitLayout(layout)) {
      crtRendererRef.current?.dispose();
      crtRendererRef.current = null;
      setCrtUnavailable(false);
      return undefined;
    }

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
  }, [layout]);

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
    microRevealRef.current = microReveal;
  }, [microReveal]);

  const setPausedState = useCallback((nextPaused: boolean) => {
    if (nextPaused) {
      if (pausedRef.current) return;
      pausedRef.current = true;
      pauseStartedAtRef.current = performance.now();
      gameAudio.stopAll();
      setPaused(true);
      return;
    }

    if (!pausedRef.current) return;

    const pauseStartedAt = pauseStartedAtRef.current;
    const pausedDurationMs = pauseStartedAt === null ? 0 : performance.now() - pauseStartedAt;
    const state = stateRef.current;

    if (pausedDurationMs > 0 && state) {
      state.phaseStartedAtMs += pausedDurationMs;
      state.volleyStartedAtMs += pausedDurationMs;
      if (state.lastFrameAtMs !== undefined) state.lastFrameAtMs += pausedDurationMs;
      if (state.retrieveDogTriggeredAtMs !== undefined) state.retrieveDogTriggeredAtMs += pausedDurationMs;

      for (const target of state.targets) {
        target.createdAtMs += pausedDurationMs;
        if (target.escapedAtMs !== undefined) target.escapedAtMs += pausedDurationMs;
        if (target.hitAtMs !== undefined) target.hitAtMs += pausedDurationMs;
      }

      for (const reveal of state.scoreReveals) {
        reveal.expiresAtMs += pausedDurationMs;
      }

      setMicroReveal((current) => (current ? { ...current, expiresAt: current.expiresAt + pausedDurationMs } : current));
    }

    pausedRef.current = false;
    pauseStartedAtRef.current = null;
    resumeGameplayAudio(state ?? null);
    setPaused(false);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        const state = stateRef.current;
        if (!state || state.phase === "ended") return;
        event.preventDefault();
        setPausedState(!pausedRef.current);
        return;
      }
      if (event.key === "d" || event.key === "D") {
        const state = stateRef.current;
        if (!state || pausedRef.current) return;
        if (!canUseDuckCall(state)) return;
        event.preventDefault();
        triggerDuckCall(state, performance.now());
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setPausedState]);

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
      goldenFlyFramesRef.current = { image, columns: 4, rows: 3 };
    };
    image.src = chatGptGoldenBirdFlyAsset.src;

    return () => {
      image.onload = null;
      goldenFlyFramesRef.current = null;
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
      goldenBirdShotImageRef.current = image;
    };
    image.src = goldenBirdShotAsset.src;

    return () => {
      image.onload = null;
      goldenBirdShotImageRef.current = null;
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
    const portraitBackgroundImage = new Image();
    portraitBackgroundImage.src = portraitBackgroundAsset.src;
    portraitBackgroundImage.onload = () => {
      portraitBackgroundImageRef.current = portraitBackgroundImage;
    };

    return () => {
      portraitBackgroundImage.onload = null;
      portraitBackgroundImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const portraitGroundImage = new Image();
    portraitGroundImage.src = portraitGroundAsset.src;
    portraitGroundImage.onload = () => {
      portraitGroundImageRef.current = portraitGroundImage;
    };

    return () => {
      portraitGroundImage.onload = null;
      portraitGroundImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const portraitGrassImage = new Image();
    portraitGrassImage.src = portraitGrassAsset.src;
    portraitGrassImage.onload = () => {
      portraitGrassImageRef.current = portraitGrassImage;
    };

    return () => {
      portraitGrassImage.onload = null;
      portraitGrassImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const portraitTreeImage = new Image();
    portraitTreeImage.src = portraitTreeAsset.src;
    portraitTreeImage.onload = () => {
      portraitTreeImageRef.current = portraitTreeImage;
    };

    return () => {
      portraitTreeImage.onload = null;
      portraitTreeImageRef.current = null;
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
    const state = createInitialState(mode, roundNumber, targetLimit, isLiveTweetRound, layout);
    gameAudio.play(mode === "C" ? "clayShootingIntro" : "gameStart", 0.78);
    state.phase = "intro";
    state.phaseStartedAtMs = now;
    pausedRef.current = false;
    pauseStartedAtRef.current = null;
    setPaused(false);
    stateRef.current = state;

    return () => {
      gameAudio.stopLoop("clayPigeonFlying");
      stateRef.current = null;
    };
  }, [assetReady, fontReady, mode, roundNumber, isLiveTweetRound, layout]);

  const draw = useCallback((frameTimeMs: number) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const state = stateRef.current;
    if (!canvas || !image || !state) return;
    const timeMs = pausedRef.current && pauseStartedAtRef.current !== null ? pauseStartedAtRef.current : frameTimeMs;
    const introDogElapsedMs = timeMs - state.phaseStartedAtMs;
    const introDogBehindGrass = state.phase === "intro" && isIntroDogBehindGrass(introDogElapsedMs);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isClayMode = state.mode === "C";
    const isPortrait = isPortraitLayout(state.layout);

    if (isPortrait) {
      drawPortraitEnvironment(ctx, state.layout, isClayMode, portraitBackgroundImageRef.current);
    } else if (isClayMode) {
      drawClayEnvironment(ctx, clayBackgroundImageRef.current);
    } else {
      clearScene(ctx, backgroundImageRef.current);
    }

    if (!pausedRef.current && state.phase === "intro" && timeMs - state.phaseStartedAtMs >= introDurationForMode(state.mode)) {
      startNextVolley(state, tweetsRef.current, timeMs);
    }

    if (!pausedRef.current && (state.phase === "intro" || state.phase === "active" || state.phase === "resolve")) {
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
      const birdsBehindGrass = state.targets.filter((target) => target.kind === "bird" && target.status === "hit" && target.y >= state.layout.dogRetrieveTriggerY);
      if (birdsBehindGrass.length > 0) {
        state.retrieveDogTriggeredAtMs = timeMs;
        const averageX = birdsBehindGrass.reduce((sum, target) => sum + target.x, 0) / birdsBehindGrass.length;
        state.retrieveDogX = Math.min(Math.max(averageX, state.layout.dogSafeX.min), state.layout.dogSafeX.max);
        gameAudio.play("dogRetrieve", 0.78);
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
    if (shouldShowLaughDog && !state.dogLaughSoundPlayed) {
      state.dogLaughSoundPlayed = true;
      gameAudio.play("dogLaugh", 0.78);
    }
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

    if (!pausedRef.current && canAdvanceResolve) {
      if (state.targetsPresented >= state.targetLimit) {
        finishRound(state, onRoundEndRef.current);
      } else {
        startNextVolley(state, tweetsRef.current, timeMs);
      }
    }

    if (!isClayMode && !isPortrait) {
      for (const target of state.targets) {
        if (target.status !== "escaped" && target.fliesBehindTree) {
          const frames = target.isGolden ? goldenFlyFramesRef.current : flyFramesRef.current;
          const shotImage = target.isGolden ? goldenBirdShotImageRef.current : birdShotImageRef.current;
          drawTarget(ctx, image, target, timeMs, frames, shotImage);
        }
      }

      drawTreeLayer(ctx, treeImageRef.current);
    }

    for (const target of state.targets) {
      if (target.status !== "escaped" && (isClayMode || !target.fliesBehindTree)) {
        const frames = target.isGolden ? goldenFlyFramesRef.current : flyFramesRef.current;
        const shotImage = target.isGolden ? goldenBirdShotImageRef.current : birdShotImageRef.current;
        drawTarget(ctx, image, target, timeMs, frames, shotImage, clayTargetAtlasRef.current);
      }
    }

    if (!isClayMode && (shouldShowRetrieveDog || shouldShowLaughDog) && resolveDogState) {
      const dogOffsetX = isPortrait ? (state.layout.width - CANVAS_WIDTH) / 2 : 0;
      const dogOffsetY = isPortrait
        ? state.layout.groundY - FOREGROUND_GRASS_TOP_Y + PORTRAIT_DOG_POP_DOWN_Y - (resolveDogState === "laugh" ? PORTRAIT_DOG_LAUGH_UP_Y : 0)
        : 0;
      ctx.save();
      if (isPortrait) ctx.translate(dogOffsetX, dogOffsetY);
      drawDog(
        ctx,
        image,
        timeMs,
        resolveDogState,
        dogRiseOffset,
        shouldShowRetrieveDog && state.retrieveDogX !== undefined ? state.retrieveDogX - dogOffsetX : undefined,
        dogOneBirdImageRef.current,
        mode === "B" ? dogTwoBirdImageRef.current : null
      );
      ctx.restore();
    }
    if (!isClayMode && introDogBehindGrass) {
      if (isPortrait) {
        ctx.save();
        ctx.translate((state.layout.width - CANVAS_WIDTH) / 2, state.layout.groundY - FOREGROUND_GRASS_TOP_Y);
        drawIntroDog(ctx, image, introDogElapsedMs, timeMs);
        ctx.restore();
      } else {
        drawIntroDog(ctx, image, introDogElapsedMs, timeMs);
      }
    }

    if (!isClayMode && !isPortrait) {
      drawMidground(ctx, midgroundImageRef.current);
      drawForeground(ctx, foregroundImageRef.current);
    } else if (isPortrait) {
      drawPortraitForeground(
        ctx,
        state.layout,
        isClayMode ? null : portraitGroundImageRef.current,
        isClayMode ? null : portraitGrassImageRef.current,
        isClayMode ? null : portraitTreeImageRef.current
      );
    }

    if (!isClayMode && state.phase === "intro" && !introDogBehindGrass) {
      if (isPortrait) {
        ctx.save();
        ctx.translate((state.layout.width - CANVAS_WIDTH) / 2, state.layout.groundY - FOREGROUND_GRASS_TOP_Y);
        drawIntroDog(ctx, image, introDogElapsedMs, timeMs);
        ctx.restore();
      } else {
        drawIntroDog(ctx, image, introDogElapsedMs, timeMs);
      }
    }
    drawScoreReveals(ctx, state, timeMs);
    drawSpriteHud(ctx, state, uiImagesRef.current, clayTargetAtlasRef.current);
    drawMicroRevealPanel(ctx, microRevealRef.current, state.layout);
    drawDuckCallButton(ctx, state.layout, state.duckCallStatus);
    drawGoldenFlushHud(ctx, state.layout, state.goldenFlushProgress, timeMs);
    drawFlockClearedFlash(ctx, state, timeMs);
    if (pausedRef.current) {
      drawPauseOverlay(ctx, state.layout);
    }
    if (!isPortrait && state.phase !== "ended") drawCrosshair(ctx, mouseRef.current.x, mouseRef.current.y);
    if (!isPortrait) crtRendererRef.current?.render(canvas, timeMs);

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
      if (isPortraitLayout(layout) && timeMs - lastRenderedFrameAtRef.current < PORTRAIT_FRAME_INTERVAL_MS) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastRenderedFrameAtRef.current = timeMs;
      draw(timeMs);
      rafRef.current = requestAnimationFrame(tick);
    };

    lastRenderedFrameAtRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [assetReady, fontReady, draw, layout]);

  function resolveCanvasPositionFromClient(target: HTMLElement, clientX: number, clientY: number) {
    const activeLayout = stateRef.current?.layout ?? layout;
    const rect = target.getBoundingClientRect();
    const displayX = (clientX - rect.left) / rect.width;
    const displayY = (clientY - rect.top) / rect.height;
    const sourceUv =
      !isPortraitLayout(activeLayout) && !crtUnavailable && target === crtCanvasRef.current
        ? mapCrtDisplayUvToSource(displayX, displayY)
        : { x: displayX, y: displayY };

    return {
      x: sourceUv.x * activeLayout.width,
      y: sourceUv.y * activeLayout.height
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    mouseRef.current = resolveCanvasPositionFromClient(event.currentTarget, event.clientX, event.clientY);
  }

  async function startGoldenFlushFromGoldenHit(state: RuntimeState, golden: TargetEntity) {
    const remainingIds = getRemainingArmedTweetIds(state, tweetsRef.current);
    const goldenPoints = golden.points;
    const flushPointsPerDelete = 200;

    state.goldenSummary = {
      tweetsDeleted: 0,
      failed: 0,
      scoreFromFlush: 0,
      goldenDuckPoints: goldenPoints
    };

    if (state.mode === "C" || remainingIds.length === 0) {
      state.goldenFlushProgress = {
        phase: "complete",
        totalEligible: 0,
        deleted: 0,
        failed: 0,
        startedAtMs: performance.now(),
        completedAtMs: performance.now()
      };
      state.flockClearedFlashStartedAtMs = performance.now();
      return;
    }

    const flushIds = remainingIds.slice(0, 100);
    state.goldenFlushProgress = {
      phase: "starting",
      totalEligible: flushIds.length,
      deleted: 0,
      failed: 0,
      startedAtMs: performance.now()
    };

    const finalize = (phase: "complete" | "failed", error?: string) => {
      state.goldenFlushProgress = {
        ...state.goldenFlushProgress,
        phase,
        error,
        completedAtMs: performance.now()
      };
      if (phase === "complete") state.flockClearedFlashStartedAtMs = performance.now();
    };

    if (debugModeRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const deleted = flushIds.length;
      const scoreFromFlush = deleted * flushPointsPerDelete;
      state.score += scoreFromFlush;
      state.goldenFlushProgress = {
        ...state.goldenFlushProgress,
        phase: "running",
        deleted,
        failed: 0
      };
      state.goldenSummary = {
        tweetsDeleted: deleted,
        failed: 0,
        scoreFromFlush,
        goldenDuckPoints: goldenPoints
      };
      finalize("complete");
      return;
    }

    const nonce = generateGoldenFlushNonce();
    try {
      for await (const event of streamGoldenFlush({ mode: state.mode, nonce, tweetIds: flushIds })) {
        if (event.event === "start") {
          state.goldenFlushProgress = {
            ...state.goldenFlushProgress,
            phase: "running",
            totalEligible: event.total
          };
        } else if (event.event === "progress") {
          if (event.ok) {
            state.score += flushPointsPerDelete;
            state.goldenSummary = {
              ...state.goldenSummary!,
              tweetsDeleted: event.deleted,
              scoreFromFlush: state.goldenSummary!.scoreFromFlush + flushPointsPerDelete
            };
          } else {
            state.goldenSummary = {
              ...state.goldenSummary!,
              failed: event.failed
            };
          }
          state.goldenFlushProgress = {
            ...state.goldenFlushProgress,
            phase: "running",
            deleted: event.deleted,
            failed: event.failed
          };
        } else if (event.event === "complete") {
          state.goldenSummary = {
            ...state.goldenSummary!,
            tweetsDeleted: event.deleted,
            failed: event.failed
          };
          finalize("complete");
        } else if (event.event === "error") {
          finalize("failed", event.message);
        }
      }
    } catch (error) {
      finalize("failed", error instanceof Error ? error.message : "Golden flush failed");
    }
  }

  function handleShot(point: { x: number; y: number }) {
    if (pausedRef.current) return;
    const state = stateRef.current;
    if (!state || state.phase !== "active" || state.shotsRemaining <= 0) return;

    state.shotsRemaining -= 1;
    state.shotsFired += 1;
    gameAudio.play("gunShoot", 0.82);

    const hit = state.targets.find((target) => {
      if (target.status !== "flying" || target.mechanicsState !== "flying" || !target.shootable) return false;
      return pointHitsTarget(point, target, state);
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
    if (!hit.isGolden) state.lastVolleyHitCount += 1;
    if (hit.kind === "clay") gameAudio.play("clayPigeonHit", 0.78);

    const record: HitRecord = {
      targetId: hit.id,
      tweet: hit.tweet,
      points: hit.points,
      hitOrder: state.hits.length + 1,
      hitAtMs: now,
      mode: state.mode,
      deleteStatus: hit.tweet && state.mode !== "C" ? "pending" : undefined,
      isGolden: hit.isGolden
    };
    state.hits.push(record);

    if (hit.isGolden) {
      state.score += hit.points;
      state.scoreReveals.push({
        id: `${hit.id}_${now}`,
        x: hit.x,
        y: hit.y,
        points: hit.points,
        expiresAtMs: now + 1200
      });
      if (state.goldenTargetId === hit.id) state.goldenTargetId = undefined;
      state.duckCallStatus = "ready";
      gameAudio.play("perfectRound", 0.65);
      void startGoldenFlushFromGoldenHit(state, hit);
      return;
    }

    if (hit.tweet) {
      if (debugModeRef.current) {
        record.deleteStatus = "deleted";
      } else {
        void deleteTweetOnHit(hit.tweet.id, state.mode).then((deleted) => {
          record.deleteStatus = deleted ? "deleted" : "failed";
        });
      }
      setMicroReveal({
        id: `${hit.id}_${now}`,
        text: `"${truncate(hit.tweet.text, 128)}"`,
        date: formatDate(hit.tweet.createdAt),
        points: hit.points,
        likes: hit.tweet.likes,
        comments: hit.tweet.replies,
        retweets: hit.tweet.reposts,
        expiresAt: now + 3400
      });
    }
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();

    const point = resolveCanvasPositionFromClient(event.currentTarget, event.clientX, event.clientY);
    mouseRef.current = point;

    if (pausedRef.current) {
      const activeLayout = stateRef.current?.layout ?? layout;
      if (pointInRect(point, activeLayout.pauseResumeButton)) {
        handleResume();
      } else if (pointInRect(point, activeLayout.pauseQuitButton)) {
        handleQuit();
      }
      return;
    }

    const state = stateRef.current;
    if (
      state &&
      isPortraitLayout(state.layout) &&
      canUseDuckCall(state) &&
      pointInRect(point, state.layout.duckCallButton)
    ) {
      triggerDuckCall(state, performance.now());
      return;
    }

    handleShot(point);
  }

  function handleResume() {
    setPausedState(false);
  }

  function handleQuit() {
    setPausedState(false);
    onQuit();
  }

  const crtStyle = { "--crt-art": `url(${crtAsset.src})` } as CSSProperties;

  return (
    <div
      className={`canvas-wrap crt-cabinet play-crt ${layout.className}${paused ? " play-paused" : ""}${crtUnavailable || isPortraitLayout(layout) ? " crt-fallback" : ""}`}
      style={crtStyle}
      aria-label={`${modeLabel(mode)} playfield`}
    >
      <div className="crt-screen">
        <canvas
          ref={canvasRef}
          className="game-canvas game-source-canvas"
          width={layout.width}
          height={layout.height}
          onPointerMove={handlePointerMove}
          onPointerDown={handleCanvasPointerDown}
        />
        <canvas
          ref={crtCanvasRef}
          className="game-canvas game-crt-canvas"
          width={layout.width}
          height={layout.height}
          onPointerMove={handlePointerMove}
          onPointerDown={handleCanvasPointerDown}
          aria-hidden={crtUnavailable}
        />
        <div className="screen-reader-only" aria-live="polite">
          {paused ? "Paused. Press Escape to resume, or click Resume or Quit on the game screen." : microReveal?.text ?? ""}
        </div>
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
