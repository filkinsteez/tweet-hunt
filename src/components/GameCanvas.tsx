"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  RESOLVE_DELAY_MS,
  SHOTS_PER_VOLLEY,
  TARGETS_PER_ROUND,
  VOLLEY_DURATION_MS,
  modeLabel,
  passLineForRound,
  scoreForRound,
  targetsPerVolley
} from "@/game/constants";
import { clearScene, drawCrosshair, drawDog, drawTarget } from "@/game/draw";
import { formatDate, truncate } from "@/game/format";
import type { BirdColor, GameMode, HitRecord, RoundResult, TargetEntity, TweetCandidate } from "@/game/types";

type RuntimePhase = "boot" | "active" | "resolve" | "ended";

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
  ended: boolean;
};

type HudState = {
  score: number;
  shotsRemaining: number;
  hits: number;
  escaped: number;
  targetsPresented: number;
  volleyNumber: number;
  phase: RuntimePhase;
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
    ended: false
  };
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
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
    flight
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
  const stateRef = useRef<RuntimeState | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const lastHudUpdateRef = useRef(0);
  const onRoundEndRef = useRef(onRoundEnd);
  const tweetsRef = useRef(tweets);
  const [assetReady, setAssetReady] = useState(false);
  const [hud, setHud] = useState<HudState>({
    score: 0,
    shotsRemaining: SHOTS_PER_VOLLEY,
    hits: 0,
    escaped: 0,
    targetsPresented: 0,
    volleyNumber: 0,
    phase: "boot"
  });
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
    if (!assetReady) return undefined;
    const state = createInitialState(mode, roundNumber);
    stateRef.current = state;
    startNextVolley(state, tweetsRef.current, performance.now());

    return () => {
      stateRef.current = null;
    };
  }, [assetReady, mode, roundNumber]);

  const draw = useCallback((timeMs: number) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const state = stateRef.current;
    if (!canvas || !image || !state) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearScene(ctx);

    const dt = 1 / 60;
    if (state.phase === "active") {
      for (const target of state.targets) {
        if (target.status === "flying") {
          target.x += target.vx * dt;
          target.y += target.vy * dt;

          if (target.kind === "clay") {
            target.vy += 210 * dt;
          } else {
            if (target.y < 82 || target.y > CANVAS_HEIGHT - 250) target.vy *= -1;
          }
        }

        if (target.status === "hit") {
          target.y += target.vy * dt;
          target.vy += 520 * dt;
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

    if (state.phase === "resolve" && timeMs - state.phaseStartedAtMs > RESOLVE_DELAY_MS) {
      if (state.targetsPresented >= TARGETS_PER_ROUND) {
        finishRound(state, onRoundEndRef.current);
      } else {
        startNextVolley(state, tweetsRef.current, timeMs);
      }
    }

    for (const target of state.targets) {
      if (target.status !== "escaped") drawTarget(ctx, image, target, timeMs);
    }

    let dogState: "walk" | "flush" | "laugh" | "one" | "two" = "flush";
    if (state.phase === "resolve") {
      if (state.lastVolleyHitCount === 0) dogState = "laugh";
      else if (state.lastVolleyHitCount === 1) dogState = "one";
      else dogState = "two";
    }
    drawDog(ctx, image, timeMs, dogState);
    drawCrosshair(ctx, mouseRef.current.x, mouseRef.current.y);

    if (timeMs - lastHudUpdateRef.current > 90) {
      lastHudUpdateRef.current = timeMs;
      setHud({
        score: state.score,
        shotsRemaining: state.shotsRemaining,
        hits: state.hits.length,
        escaped: state.escapes.length,
        targetsPresented: state.targetsPresented,
        volleyNumber: state.volleyNumber,
        phase: state.phase
      });
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
    hit.vx = 0;
    hit.vy = 140;
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
      <div className="hud-overlay" aria-hidden="true">
        <div className="hud-row">
          <span className="hud-pill">{modeLabel(mode)}</span>
          <span className="hud-pill">Round {roundNumber}</span>
          <span className="hud-pill">Score {hud.score}</span>
          <span className="hud-pill">Shots {hud.shotsRemaining}</span>
          <span className="hud-pill">Hit {hud.hits}/{TARGETS_PER_ROUND}</span>
        </div>
        {microReveal ? (
          <div className="micro-reveal">
            <strong>LAST HIT +{microReveal.points}</strong>
            <p>{microReveal.text}</p>
            <small>{microReveal.date}</small>
          </div>
        ) : null}
      </div>
    </div>
  );
}
