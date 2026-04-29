"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import backgroundAsset from "../../Assets/Sprites/background.jpg";
import foregroundAsset from "../../Assets/Sprites/foreground.png";
import midgroundAsset from "../../Assets/Sprites/midground.png";
import treeAsset from "../../Assets/Sprites/tree.png";
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
  VOLLEY_DURATION_MS,
  modeLabel,
  passLineForRound,
  scoreForRound,
  targetsPerVolley
} from "@/game/constants";
import {
  clearScene,
  drawCrosshair,
  drawDog,
  drawForeground,
  drawIntroDog,
  drawMidground,
  drawTarget,
  drawTreeLayer,
  isIntroDogBehindGrass
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
  retrieveDogTriggeredAtMs?: number;
  retrieveDogX?: number;
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

const HUD_LAYOUT = {
  round: { x: 92, y: CANVAS_HEIGHT - 152 },
  shots: { x: 92, y: CANVAS_HEIGHT - 116 },
  hit: { x: 252, y: CANVAS_HEIGHT - 112 },
  score: { x: CANVAS_WIDTH - 232, y: CANVAS_HEIGHT - 112 }
};

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
    retrieveDogTriggeredAtMs: undefined,
    retrieveDogX: undefined,
    ended: false
  };
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function drawUiImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number) {
  ctx.drawImage(image, x, y, image.naturalWidth * UI_SCALE, image.naturalHeight * UI_SCALE);
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
  const x = HUD_LAYOUT.score.x + 4 * UI_SCALE;
  const y = HUD_LAYOUT.score.y + UI_SCALE;

  ctx.fillStyle = "#050508";
  ctx.fillRect(x, y, glyphWidth * 6, 8 * UI_SCALE);
  for (let index = 0; index < digits.length; index += 1) {
    drawScoreDigit(ctx, atlas, Number(digits[index]), x + index * glyphWidth, y);
  }
}

function drawRoundNumber(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, roundNumber: number) {
  const digits = Math.max(1, roundNumber).toString().slice(-2);
  const glyphWidth = 8 * UI_SCALE;
  const x = HUD_LAYOUT.round.x + 16 * UI_SCALE;
  const y = HUD_LAYOUT.round.y;

  ctx.fillStyle = "#050508";
  ctx.fillRect(x, y, glyphWidth * 2, 8 * UI_SCALE);
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
      HUD_LAYOUT.hit.x + (36 + index * 8) * UI_SCALE,
      y,
      duckWidth * UI_SCALE,
      duckHeight * UI_SCALE
    );
  }
}

function maskSpentShots(ctx: CanvasRenderingContext2D, shotsRemaining: number) {
  ctx.fillStyle = "#050508";
  for (let index = shotsRemaining; index < SHOTS_PER_VOLLEY; index += 1) {
    ctx.fillRect(HUD_LAYOUT.shots.x + (6 + index * 8) * UI_SCALE, HUD_LAYOUT.shots.y + 3 * UI_SCALE, 5 * UI_SCALE, 9 * UI_SCALE);
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
  drawUiImage(ctx, round, HUD_LAYOUT.round.x, HUD_LAYOUT.round.y);
  drawUiImage(ctx, shots, HUD_LAYOUT.shots.x, HUD_LAYOUT.shots.y);
  drawUiImage(ctx, hit, HUD_LAYOUT.hit.x, HUD_LAYOUT.hit.y);
  drawUiImage(ctx, score, HUD_LAYOUT.score.x, HUD_LAYOUT.score.y);
  drawRoundNumber(ctx, roundAtlas, state.roundNumber);
  maskSpentShots(ctx, state.shotsRemaining);
  drawHitDucks(ctx, hitAtlas, state.hits.length);
  drawScoreNumber(ctx, scoreAtlas, state.score);
  ctx.restore();
}

function spawnTarget(mode: GameMode, roundNumber: number, targetIndex: number, tweet: TweetCandidate | undefined): TargetEntity {
  const isClay = mode === "C";
  const direction = Math.random() > 0.5 ? 1 : -1;
  const speed = 150 + Math.min(roundNumber, 10) * 18 + Math.random() * 70;
  const color = COLORS[targetIndex % COLORS.length];

  if (isClay) {
    const clayDirection = targetIndex % 2 === 0 ? -1 : 1;
    return {
      id: `clay_${roundNumber}_${targetIndex}`,
      kind: "clay",
      color,
      status: "flying",
      x: CANVAS_WIDTH / 2 + clayDirection * 40,
      y: CANVAS_HEIGHT - 124,
      vx: clayDirection * randomBetween(170, 260),
      vy: -randomBetween(310, 420),
      radius: 44,
      createdAtMs: performance.now(),
      points: scoreForRound(roundNumber, targetIndex),
      direction: clayDirection as 1 | -1,
      flight: "side"
    };
  }

  const flight = targetIndex % 3 === 0 ? "up" : targetIndex % 3 === 1 ? "diag" : "side";
  return {
    id: `tweet_target_${roundNumber}_${targetIndex}_${tweet?.id ?? "mock"}`,
    kind: "bird",
    tweet,
    color,
    status: "flying",
    x: direction === 1 ? -70 : CANVAS_WIDTH + 70,
    y: randomBetween(120, 360),
    vx: direction * speed,
    vy: randomBetween(-65, 70),
    radius: 54,
    createdAtMs: performance.now(),
    points: scoreForRound(roundNumber, targetIndex),
    direction,
    flight,
    erraticPhase: Math.random() * Math.PI * 2,
    erraticStrength: randomBetween(42, 78),
    erraticRate: randomBetween(5.5, 8.5),
    fliesBehindTree: Math.random() < 0.5
  };
}

function startNextVolley(state: RuntimeState, tweets: TweetCandidate[], now: number) {
  const count = Math.min(targetsPerVolley(state.mode), TARGETS_PER_ROUND - state.targetsPresented);
  const targets: TargetEntity[] = [];

  for (let index = 0; index < count; index += 1) {
    const targetIndex = state.targetsPresented + index;
    const tweet = state.mode === "C" ? undefined : tweets[state.nextTweetIndex + index % Math.max(tweets.length, 1)];
    targets.push(spawnTarget(state.mode, state.roundNumber, targetIndex, tweet));
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
  state.retrieveDogTriggeredAtMs = undefined;
  state.retrieveDogX = undefined;
}

function markEscaped(state: RuntimeState, target: TargetEntity, now: number) {
  if (target.status !== "flying") return;
  target.status = "escaped";
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

export function GameCanvas({ mode, roundNumber, tweets, onRoundEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const uiImagesRef = useRef<Partial<Record<UiImageKey, HTMLImageElement>>>({});
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
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

    const dt = 1 / 60;
    if (state.phase === "intro" && timeMs - state.phaseStartedAtMs >= ROUND_INTRO_DURATION_MS) {
      startNextVolley(state, tweetsRef.current, timeMs);
    }

    if (state.phase === "active" || state.phase === "resolve") {
      for (const target of state.targets) {
        if (target.status === "hit") {
          const hitAgeMs = timeMs - (target.hitAtMs ?? timeMs);
          if (hitAgeMs >= HIT_REACTION_DURATION_MS) {
            target.x += target.vx * dt;
            target.y += target.vy * dt;
            target.vy += 620 * dt;
          }
        }
      }
    }

    if (state.phase === "active") {
      for (const target of state.targets) {
        if (target.status === "flying") {
          target.x += target.vx * dt;
          target.y += target.vy * dt;

          if (target.kind === "clay") {
            target.vy += 210 * dt;
          } else {
            const elapsedSeconds = (timeMs - target.createdAtMs) / 1000;
            const phase = target.erraticPhase ?? 0;
            const strength = target.erraticStrength ?? 52;
            const rate = target.erraticRate ?? 6.5;
            const flutter = Math.sin(elapsedSeconds * rate + phase);
            const dart = Math.sin(elapsedSeconds * (rate * 1.7) + phase * 0.5);

            target.vy += (flutter * strength + dart * strength * 0.45) * dt;
            target.vx += target.direction * dart * strength * 0.18 * dt;
            if (target.y < 82 || target.y > CANVAS_HEIGHT - 250) target.vy *= -1;
          }
        }

      }

      const volleyExpired = timeMs - state.volleyStartedAtMs > VOLLEY_DURATION_MS;
      const outOfBoundsTargets = state.targets.filter(
        (target) =>
          target.status === "flying" &&
          (target.x < -160 || target.x > CANVAS_WIDTH + 160 || target.y < -120 || target.y > CANVAS_HEIGHT + 160)
      );
      for (const target of outOfBoundsTargets) markEscaped(state, target, timeMs);

      if (volleyExpired || state.shotsRemaining <= 0) {
        for (const target of state.targets) markEscaped(state, target, timeMs);
      }

      const unresolved = state.targets.some((target) => target.status === "flying");
      if (!unresolved) {
        state.phase = "resolve";
        state.phaseStartedAtMs = timeMs;
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
    const shouldShowRetrieveDog =
      retrieveDogState &&
      state.retrieveDogTriggeredAtMs !== undefined &&
      retrieveDogAgeMs >= DOG_RETRIEVE_PAUSE_MS &&
      retrieveDogAgeMs < retrieveDogSequenceMs;
    const shouldShowLaughDog =
      resolveDogState === "laugh" && timeMs - state.phaseStartedAtMs >= DOG_POP_DELAY_MS;

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

    const canAdvanceResolve =
      state.phase === "resolve" &&
      ((retrieveDogState && state.retrieveDogTriggeredAtMs !== undefined && retrieveDogAgeMs >= retrieveDogSequenceMs) ||
        (!retrieveDogState && timeMs - state.phaseStartedAtMs > RESOLVE_DELAY_MS));

    if (canAdvanceResolve) {
      if (state.targetsPresented >= TARGETS_PER_ROUND) {
        finishRound(state, onRoundEndRef.current);
      } else {
        startNextVolley(state, tweetsRef.current, timeMs);
      }
    }

    for (const target of state.targets) {
      if (target.status !== "escaped" && target.fliesBehindTree) drawTarget(ctx, image, target, timeMs);
    }

    drawTreeLayer(ctx, treeImageRef.current);

    for (const target of state.targets) {
      if (target.status !== "escaped" && !target.fliesBehindTree) drawTarget(ctx, image, target, timeMs);
    }

    if ((shouldShowRetrieveDog || shouldShowLaughDog) && resolveDogState) {
      drawDog(ctx, image, timeMs, resolveDogState, dogRiseOffset, shouldShowRetrieveDog ? state.retrieveDogX : undefined);
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

    if (timeMs - lastHudUpdateRef.current > 90) {
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
    state.shotsRemaining -= 1;
    state.shotsFired += 1;

    const hittable = state.targets
      .filter((target) => target.status === "flying")
      .map((target) => ({ target, distance: Math.hypot(target.x - point.x, target.y - point.y) }))
      .filter((entry) => entry.distance <= entry.target.radius)
      .sort((a, b) => a.distance - b.distance);

    const hit = hittable[0]?.target;
    if (!hit) return;

    const now = performance.now();
    hit.status = "hit";
    hit.hitAtMs = now;
    hit.vx = hit.direction * 55;
    hit.vy = 260;
    state.lastVolleyHitCount += 1;
    state.score += hit.points;

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
        text: truncate(hit.tweet.text, 112),
        date: formatDate(hit.tweet.createdAt),
        points: hit.points,
        expiresAt: now + 1150
      });
    } else if (mode === "C") {
      setMicroReveal({
        id: `${hit.id}_${now}`,
        text: "Clay tweet shattered. No live tweet affected.",
        date: "practice target",
        points: hit.points,
        expiresAt: now + 900
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
            <strong>LAST HIT +{microReveal.points}</strong>
            <p>{microReveal.text}</p>
            <small>{microReveal.date}</small>
          </div>
        </div>
      ) : null}
    </div>
  );
}
