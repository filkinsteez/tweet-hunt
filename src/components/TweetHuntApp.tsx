"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import titleAsset from "../../Assets/Sprites/UI/title.jpg";
import titleSelectionAsset from "../../Assets/Sprites/UI/UI_title_selection.jpg";
import welcomePlayAsset from "../../Assets/Sprites/UI/welcome_screen_play.png";
import welcomeTitleAsset from "../../Assets/Sprites/UI/tweet_hunt_title.png";
import chatGptBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_birdsprite_fly.png";
import { ArcadeRoundReview } from "./ArcadeRoundReview";
import { ArcadeScreenCanvas } from "./ArcadeScreenCanvas";
import { GameCanvas } from "./GameCanvas";
import { TARGETS_PER_ROUND } from "@/game/constants";
import { gameAudio } from "@/game/audio";
import { loadHighScores, mergeBestScore } from "@/game/highScores";
import { isPortraitLayout, type GameplayLayoutProfile } from "@/game/layout";
import { selectTweetCandidates } from "@/game/mockTweets";
import { drawFullscreenImage, drawPixelText, type Rect } from "@/game/uiDraw";
import type { GameMode, HuntConfig, RoundResult, TweetCandidate } from "@/game/types";
import { useDebugMode } from "@/hooks/useDebugMode";
import { useGameplayLayout } from "@/hooks/useGameplayLayout";

type Stage = "welcome" | "title" | "play" | "review";
type AuthStatus = "unknown" | "authorized" | "unauthorized";
type AuthError = null | "denied" | "state-mismatch" | "token-error" | "missing-config";

type MeResponse = { authorized: boolean; handle?: string; name?: string; expired?: boolean };
type CandidatesResponse = { tweets?: TweetCandidate[]; error?: string };
type WelcomeBirdRuntime = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sizeScale: number;
  layer: "behindText" | "front";
  pattern: "diagonal" | "swoop";
  hitAtMs?: number;
  hitX?: number;
  hitY?: number;
  hitDirection?: 1 | -1;
  respawnAtMs?: number;
};
type WelcomeBirdSnapshot = Rect & { id: string; centerX: number; centerY: number; direction: 1 | -1 };

const AUTH_ERROR_COPY: Record<NonNullable<AuthError>, string> = {
  denied: "Authorization was canceled. You can try again whenever you're ready.",
  "state-mismatch": "That authorization session expired. Please try again.",
  "token-error": "X couldn't complete the authorization handoff. Try again in a moment.",
  "missing-config": "X OAuth isn't configured on the server. Add X_CLIENT_ID, X_CLIENT_SECRET, and X_REDIRECT_URI."
};

const TITLE_TOP_SCORE = { x: 548, y: 590, size: 24 };
const TITLE_SELECTION_SIZE = { width: 32, height: 24 };
const TITLE_SELECTION_POSITIONS: Record<GameMode, { x: number; y: number }> = {
  A: { x: 178, y: 414 },
  B: { x: 178, y: 464 },
  C: { x: 178, y: 514 }
};
const TITLE_MODE_LABELS: Record<GameMode, string> = {
  A: "1 TWEET",
  B: "2 TWEETS",
  C: "CLAY SHOOTING"
};
const TITLE_MODE_HEADINGS: Record<GameMode, string> = {
  A: "GAME A",
  B: "GAME B",
  C: "GAME C"
};
const MOBILE_TITLE_MODE_ROWS: Record<GameMode, { headingY: number; labelY: number }> = {
  A: { headingY: 374, labelY: 422 },
  B: { headingY: 532, labelY: 580 },
  C: { headingY: 690, labelY: 738 }
};
const MOBILE_TITLE_ART = { y: 70, width: 470 };
const MOBILE_TITLE_TOP_SCORE_Y = 858;
const MOBILE_TITLE_TOP_SCORE_SIZE = 20;
const MOBILE_TITLE_HEADING_SIZE = 23;
const MOBILE_TITLE_LABEL_SIZE = 31;
const MOBILE_TITLE_CLAY_LABEL_SIZE = 26;
const WELCOME_BIRD_COLUMNS = 4;
const WELCOME_BIRD_ROWS = 3;
const WELCOME_BIRD_SIZE = 138;
const WELCOME_BIRD_HIT_PADDING = 24;
const WELCOME_BIRD_RESPAWN_DELAY_MS = 1500;
const MOBILE_TITLE_OPTION_RECTS: Record<GameMode, { x: number; y: number; width: number; height: number }> = {
  A: { x: 70, y: 348, width: 400, height: 128 },
  B: { x: 70, y: 506, width: 400, height: 128 },
  C: { x: 70, y: 664, width: 400, height: 128 }
};
const LANDSCAPE_TITLE_OPTION_RECTS: Record<GameMode, { x: number; y: number; width: number; height: number }> = {
  A: { x: 211, y: 407, width: 634, height: 44 },
  B: { x: 211, y: 454, width: 634, height: 44 },
  C: { x: 211, y: 501, width: 634, height: 44 }
};

function fitImageWidth(image: HTMLImageElement | undefined, width: number) {
  if (!image) return null;
  const scale = width / image.naturalWidth;
  return {
    width: Math.round(width),
    height: Math.round(image.naturalHeight * scale)
  };
}

function drawCenteredImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined, centerX: number, y: number, width: number) {
  const size = fitImageWidth(image, width);
  if (!image || !size) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, Math.round(centerX - size.width / 2), Math.round(y), size.width, size.height);
  return size;
}

function canvasRectStyle(layout: GameplayLayoutProfile, rect: { x: number; y: number; width: number; height: number }): CSSProperties {
  return {
    left: `${(rect.x / layout.width) * 100}%`,
    top: `${(rect.y / layout.height) * 100}%`,
    width: `${(rect.width / layout.width) * 100}%`,
    height: `${(rect.height / layout.height) * 100}%`
  };
}

function rectContains(rect: Rect, point: { x: number; y: number }) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function createWelcomeBirds(layout: GameplayLayoutProfile): WelcomeBirdRuntime[] {
  const isPortrait = isPortraitLayout(layout);
  return [
    createWelcomeBird(layout, "welcome-bird-top", "front", "diagonal", 1.1, 0),
    createWelcomeBird(layout, "welcome-bird-text", "behindText", "swoop", 0.92, 1)
  ];
}

function createWelcomeBird(
  layout: GameplayLayoutProfile,
  id: string,
  layer: WelcomeBirdRuntime["layer"],
  pattern: WelcomeBirdRuntime["pattern"],
  sizeScale: number,
  spawnIndex: number
): WelcomeBirdRuntime {
  const isPortrait = isPortraitLayout(layout);
  const fromLeft = spawnIndex % 2 === 0;
  return {
    id,
    x: fromLeft ? -welcomeBirdSize(layout) : layout.width + welcomeBirdSize(layout),
    y: layout.height * (layer === "behindText" ? (isPortrait ? 0.52 : 0.53) : isPortrait ? 0.17 : 0.2),
    vx: (fromLeft ? 1 : -1) * (pattern === "swoop" ? (isPortrait ? 214 : 356) : isPortrait ? 188 : 318),
    vy: (spawnIndex % 3 === 0 ? 1 : -1) * (pattern === "swoop" ? (isPortrait ? 146 : 192) : isPortrait ? 122 : 158),
    sizeScale,
    layer,
    pattern
  };
}

function respawnWelcomeBird(layout: GameplayLayoutProfile, bird: WelcomeBirdRuntime, spawnIndex: number) {
  const next = createWelcomeBird(layout, bird.id, bird.layer, bird.pattern, bird.sizeScale, spawnIndex);
  Object.assign(bird, next);
  delete bird.hitAtMs;
  delete bird.hitX;
  delete bird.hitY;
  delete bird.hitDirection;
  delete bird.respawnAtMs;
}

function updateWelcomeBirds(birds: WelcomeBirdRuntime[], layout: GameplayLayoutProfile, deltaMs: number, timeMs: number) {
  const dt = Math.min(deltaMs, 50) / 1000;
  const baseSize = welcomeBirdSize(layout);
  const topBound = isPortraitLayout(layout) ? 48 : 34;
  const bottomBound = layout.height - (isPortraitLayout(layout) ? 138 : 90);

  for (const bird of birds) {
    if (bird.respawnAtMs !== undefined) continue;
    if (bird.hitAtMs !== undefined) continue;

    const patternX = bird.pattern === "swoop" ? Math.cos(timeMs / 330) * 62 : 0;
    const patternY = bird.pattern === "swoop" ? Math.sin(timeMs / 240) * 118 : 0;
    const size = baseSize * bird.sizeScale;
    const margin = size / 2;

    bird.x += (bird.vx + patternX) * dt;
    bird.y += (bird.vy + patternY) * dt;

    if (bird.x < margin && bird.vx < 0) {
      bird.x = margin;
      bird.vx = Math.abs(bird.vx);
    } else if (bird.x > layout.width - margin && bird.vx > 0) {
      bird.x = layout.width - margin;
      bird.vx = -Math.abs(bird.vx);
    }

    if (bird.y < topBound + margin) {
      bird.y = topBound + margin;
      bird.vy = Math.abs(bird.vy);
    } else if (bird.y > bottomBound - margin) {
      bird.y = bottomBound - margin;
      bird.vy = -Math.abs(bird.vy);
    }
  }
}

function welcomeBirdSize(layout: GameplayLayoutProfile) {
  return isPortraitLayout(layout) ? 126 : WELCOME_BIRD_SIZE;
}

function drawWelcomeBird(
  ctx: CanvasRenderingContext2D,
  birdImage: HTMLImageElement | undefined,
  timeMs: number,
  layout: GameplayLayoutProfile,
  bird: WelcomeBirdRuntime
): WelcomeBirdSnapshot | null {
  if (!birdImage) return null;
  if (bird.respawnAtMs !== undefined) return null;

  ctx.imageSmoothingEnabled = false;
  let x = bird.x;
  let y = bird.y;
  let direction: 1 | -1 = bird.vx >= 0 ? 1 : -1;
  let frameIndex = Math.floor((timeMs / 1000) * 12) % WELCOME_BIRD_COLUMNS;
  let rowIndex = Math.abs(bird.vy) > 52 ? 1 : 0;
  let rotation = Math.max(Math.min(bird.vy / 320, 0.25), -0.25);

  if (bird.hitAtMs !== undefined) {
    const fallAgeSeconds = Math.max((timeMs - bird.hitAtMs) / 1000, 0);
    direction = bird.hitDirection ?? direction;
    x = (bird.hitX ?? bird.x) + direction * fallAgeSeconds * 70;
    y = (bird.hitY ?? bird.y) + fallAgeSeconds * 220 + fallAgeSeconds * fallAgeSeconds * 620;
    frameIndex = 1;
    rowIndex = 0;
    rotation = direction * (0.7 + fallAgeSeconds * 2.8);
  }

  const cellWidth = birdImage.naturalWidth / WELCOME_BIRD_COLUMNS;
  const cellHeight = birdImage.naturalHeight / WELCOME_BIRD_ROWS;
  const size = welcomeBirdSize(layout) * bird.sizeScale;

  if (y - size / 2 > layout.height + 80) return null;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  ctx.rotate(rotation);
  ctx.drawImage(birdImage, frameIndex * cellWidth, rowIndex * cellHeight, cellWidth, cellHeight, -size / 2, -size / 2, size, size);
  ctx.restore();

  return {
    id: bird.id,
    x: x - size / 2 - WELCOME_BIRD_HIT_PADDING,
    y: y - size / 2 - WELCOME_BIRD_HIT_PADDING,
    width: size + WELCOME_BIRD_HIT_PADDING * 2,
    height: size + WELCOME_BIRD_HIT_PADDING * 2,
    centerX: x,
    centerY: y,
    direction
  };
}

export function TweetHuntApp() {
  const layout = useGameplayLayout();
  const debugMode = useDebugMode();
  const [stage, setStage] = useState<Stage>("welcome");
  const [roundNumber, setRoundNumber] = useState(1);
  const [config, setConfig] = useState<HuntConfig>({ mode: "A", source: "random" });
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("unknown");
  const [handle, setHandle] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);
  const [activeTitleMode, setActiveTitleMode] = useState<GameMode | null>(null);
  const [roundTweets, setRoundTweets] = useState<TweetCandidate[]>([]);
  const [isLiveTweetRound, setIsLiveTweetRound] = useState(false);
  const [useArcadeFallback, setUseArcadeFallback] = useState(false);
  const [isDebugRound, setIsDebugRound] = useState(false);
  const [tweetLoadError, setTweetLoadError] = useState<string | null>(null);
  const [isLoadingTweets, setIsLoadingTweets] = useState(false);
  const [highScores, setHighScores] = useState<Record<GameMode, number>>({ A: 0, B: 0, C: 0 });
  const welcomeBirdsRef = useRef<WelcomeBirdRuntime[]>([]);
  const welcomeBirdHitRegionsRef = useRef<WelcomeBirdSnapshot[]>([]);
  const welcomeBirdFrameAtRef = useRef<number | null>(null);
  const welcomePlayButtonRef = useRef<Rect | null>(null);
  const welcomeBirdSpawnCounterRef = useRef(2);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/oauth/me", { cache: "no-store" });
      const data = (await res.json()) as MeResponse;
      if (data.authorized) {
        setAuthStatus("authorized");
        setHandle(data.handle ?? null);
      } else {
        setAuthStatus("unauthorized");
        setHandle(null);
      }
    } catch {
      setAuthStatus("unauthorized");
      setHandle(null);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    setHighScores(loadHighScores());
  }, []);

  useEffect(() => {
    if (stage !== "welcome") return;
    welcomeBirdsRef.current = createWelcomeBirds(layout);
    welcomeBirdHitRegionsRef.current = [];
    welcomeBirdFrameAtRef.current = null;
    welcomeBirdSpawnCounterRef.current = 2;
  }, [layout, stage]);

  useEffect(() => {
    if (stage === "title") gameAudio.play("duckHuntTitle", 0.74);
  }, [stage]);

  useEffect(() => {
    if (stage !== "welcome") return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      setStage("title");
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [stage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (!auth) return;
    setStage("title");

    const mode = params.get("mode");
    if (auth === "ok") {
      void refreshAuth().then(() => {
        if (mode === "A" || mode === "B") {
          setLastResult(null);
          setPendingMode(mode as GameMode);
          setStage("title");
        }
      });
    } else if (auth in AUTH_ERROR_COPY) {
      setAuthError(auth as NonNullable<AuthError>);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("auth");
    url.searchParams.delete("mode");
    window.history.replaceState({}, "", url.toString());
  }, [refreshAuth]);

  async function loadLiveTweetCandidates() {
    const response = await fetch("/api/tweets/candidates", { cache: "no-store" });
    const data = (await response.json()) as CandidatesResponse;
    if (!response.ok) {
      throw new Error(data.error ?? "Could not load live tweets from X.");
    }
    return data.tweets ?? [];
  }

  function startArcadeFallback(mode: GameMode, message?: string) {
    gameAudio.stopAll();
    setConfig((current) => ({ ...current, mode }));
    setRoundTweets([]);
    setIsLiveTweetRound(false);
    setUseArcadeFallback(mode !== "C");
    setIsDebugRound(false);
    setLastResult(null);
    setPendingMode(null);
    if (message) setTweetLoadError(message);
    setStage("play");
  }

  async function startMode(mode: GameMode) {
    setAuthError(null);
    setTweetLoadError(null);
    setIsLoadingTweets(mode !== "C");
    try {
      const tweets = mode === "C" ? [] : await loadLiveTweetCandidates();
      if (mode !== "C" && tweets.length === 0) {
        startArcadeFallback(mode, "No live tweets were available. Switching to arcade scoring with no deletion.");
        return;
      }
      setRoundTweets(tweets);
      setIsLiveTweetRound(mode !== "C");
      setUseArcadeFallback(false);
      setIsDebugRound(false);
      setConfig((current) => ({ ...current, mode }));
      setLastResult(null);
      setPendingMode(null);
      gameAudio.stopAll();
      setStage("play");
    } catch (error) {
      setTweetLoadError(error instanceof Error ? error.message : "Could not load live tweets from X.");
      if (mode !== "C") {
        setPendingMode(mode);
        setStage("title");
      }
    } finally {
      setIsLoadingTweets(false);
    }
  }

  function startPracticeMode(mode: GameMode) {
    gameAudio.stopAll();
    setConfig((current) => ({ ...current, mode }));
    setRoundTweets([]);
    setIsLiveTweetRound(false);
    setUseArcadeFallback(false);
    setIsDebugRound(false);
    setLastResult(null);
    setPendingMode(null);
    setStage("play");
  }

  function startDebugRound(mode: GameMode) {
    const tweets = selectTweetCandidates({ source: "random" }, TARGETS_PER_ROUND);
    gameAudio.stopAll();
    setConfig((current) => ({ ...current, mode }));
    setRoundTweets(tweets);
    setIsLiveTweetRound(true);
    setUseArcadeFallback(false);
    setIsDebugRound(true);
    setLastResult(null);
    setPendingMode(null);
    setAuthError(null);
    setTweetLoadError(null);
    setStage("play");
  }

  function selectTitleMode(mode: GameMode) {
    setAuthError(null);
    setTweetLoadError(null);
    if (mode === "C") {
      startPracticeMode(mode);
      return;
    }
    if (debugMode) {
      startDebugRound(mode);
      return;
    }
    setPendingMode(mode);
  }

  function confirmPendingMode() {
    if (!pendingMode) return;
    if (isLoadingTweets) return;
    if (authStatus === "authorized") {
      void startMode(pendingMode);
      return;
    }
    if (authStatus === "unknown") return;
    window.location.href = `/api/oauth/start?mode=${pendingMode}`;
  }

  function cancelPendingMode() {
    if (isLoadingTweets) return;
    setPendingMode(null);
  }

  async function revokeAuthorization() {
    try {
      await fetch("/api/oauth/revoke", { method: "POST" });
    } catch {
      // ignore network errors; cookies are cleared by server when reachable
    }
    setAuthStatus("unauthorized");
    setHandle(null);
    setPendingMode(null);
    setAuthError(null);
    setTweetLoadError(null);
    setRoundTweets([]);
    setIsLiveTweetRound(false);
    setUseArcadeFallback(false);
  }

  function handleRoundEnd(result: RoundResult) {
    const { next, isNewBest } = mergeBestScore(result.mode, result.score);
    if (isNewBest) setHighScores(next);
    setLastResult(result);
    setStage("review");
  }

  function nextRound() {
    setRoundNumber((current) => current + 1);
    if (isDebugRound && config.mode !== "C") {
      startDebugRound(config.mode);
      return;
    }
    if (lastResult?.isLiveTweetRound && lastResult.targetLimit < TARGETS_PER_ROUND) {
      startArcadeFallback(config.mode, "Live tweets exhausted. Switching to arcade scoring with no deletion.");
      return;
    }
    if (useArcadeFallback && config.mode !== "C") {
      startArcadeFallback(config.mode);
      return;
    }
    void startMode(config.mode);
  }

  function showTitleScreen() {
    setStage("title");
  }

  function handleWelcomeTap(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    gameAudio.play("gunShoot", 0.72);

    const bounds = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - bounds.left) / bounds.width) * layout.width,
      y: ((event.clientY - bounds.top) / bounds.height) * layout.height
    };
    const birdHit = welcomeBirdHitRegionsRef.current.find((region) => rectContains(region, point));

    if (birdHit) {
      const bird = welcomeBirdsRef.current.find((candidate) => candidate.id === birdHit.id);
      event.preventDefault();
      event.stopPropagation();
      if (bird && bird.hitAtMs === undefined) {
        bird.hitAtMs = performance.now();
        bird.hitX = birdHit.centerX;
        bird.hitY = birdHit.centerY;
        bird.hitDirection = birdHit.direction;
      }
      gameAudio.play("duckFalling", 0.68);
      return;
    }

    const playButton = welcomePlayButtonRef.current;
    if (playButton && rectContains(playButton, point)) showTitleScreen();
  }

  function stopAudioAndShowTitleScreen() {
    gameAudio.stopAll();
    setStage("title");
  }

  const hasIntroBannerContent = debugMode || authStatus === "authorized" || Boolean(authError) || Boolean(tweetLoadError);
  const mobileScreenClass = isPortraitLayout(layout) ? " game-shell-mobile-screen" : "";
  const titleTopScore = String(Math.max(highScores.A, highScores.B, highScores.C)).padStart(6, "0");
  const titleSelectionMode = pendingMode ?? activeTitleMode;
  const welcomeScreenImages = useMemo(() => ({ title: welcomeTitleAsset.src, play: welcomePlayAsset.src, bird: chatGptBirdFlyAsset.src }), []);
  const titleScreenImages = useMemo(() => ({ background: titleAsset.src, selection: titleSelectionAsset.src, title: welcomeTitleAsset.src }), []);
  const drawWelcomeScreen = useCallback(({ ctx, images, timeMs }: { ctx: CanvasRenderingContext2D; images: Record<string, HTMLImageElement>; timeMs: number }) => {
    const isPortrait = isPortraitLayout(layout);
    if (welcomeBirdsRef.current.length === 0) welcomeBirdsRef.current = createWelcomeBirds(layout);
    const lastFrameAt = welcomeBirdFrameAtRef.current ?? timeMs;
    updateWelcomeBirds(welcomeBirdsRef.current, layout, timeMs - lastFrameAt, timeMs);
    welcomeBirdFrameAtRef.current = timeMs;
    welcomeBirdHitRegionsRef.current = [];

    ctx.fillStyle = "#02030a";
    ctx.fillRect(0, 0, layout.width, layout.height);
    const centerX = layout.width / 2;
    const introLines = ["TWEET HUNT IS AN", "EXPERIMENTAL GAME", "FROM ERIC FILKINS."];
    const actionLines = ["SHOOT FAKE BIRDS.", "DELETE REAL TWEETS."];
    const drawWelcomeBirdLayer = (layer: WelcomeBirdRuntime["layer"]) => {
      for (const bird of welcomeBirdsRef.current) {
        if (bird.layer !== layer) continue;
        const region = drawWelcomeBird(ctx, images.bird, timeMs, layout, bird);
        if (region) {
          welcomeBirdHitRegionsRef.current.push(region);
        } else if (bird.respawnAtMs !== undefined) {
          if (timeMs >= bird.respawnAtMs) {
            respawnWelcomeBird(layout, bird, welcomeBirdSpawnCounterRef.current);
            welcomeBirdSpawnCounterRef.current += 1;
          }
        } else if (bird.hitAtMs !== undefined) {
          bird.respawnAtMs = timeMs + WELCOME_BIRD_RESPAWN_DELAY_MS;
        }
      }
    };

    if (isPortrait) {
      const titleWidth = 470;
      const titleY = 70;
      const bodyGapFromTitle = 120;
      const bodySize = 25;
      const bodyLineHeight = 45;
      const groupGap = 100;
      const buttonGap = 100;
      const playWidth = 230;
      const titleSize = fitImageWidth(images.title, titleWidth);
      const introTextHeight = bodySize + (introLines.length - 1) * bodyLineHeight;
      const actionTextHeight = bodySize + (actionLines.length - 1) * bodyLineHeight;
      let y = Math.round(titleY + (titleSize?.height ?? 0) + bodyGapFromTitle);

      drawWelcomeBirdLayer("behindText");
      drawCenteredImage(ctx, images.title, centerX, titleY, titleWidth);
      for (const [index, line] of introLines.entries()) {
        drawPixelText(ctx, line, centerX, y + index * bodyLineHeight, {
          size: bodySize,
          color: "#fff9e8",
          align: "center"
        });
      }
      y += introTextHeight + groupGap;
      for (const [index, line] of actionLines.entries()) {
        drawPixelText(ctx, line, centerX, y + index * bodyLineHeight, {
          size: bodySize,
          color: "#fff9e8",
          align: "center"
        });
      }
      y += actionTextHeight + buttonGap;
      drawWelcomeBirdLayer("front");
      const playSize = drawCenteredImage(ctx, images.play, centerX, y, playWidth);
      welcomePlayButtonRef.current = playSize ? { x: centerX - playSize.width / 2, y, width: playSize.width, height: playSize.height } : null;
      return;
    }

    const titleWidth = 470;
    const titleY = 38;
    const bodyGapFromTitle = 24;
    const bodySize = 24;
    const bodyLineHeight = 43;
    const groupGap = 44;
    const buttonGap = 42;
    const playWidth = 270;
    const titleSize = fitImageWidth(images.title, titleWidth);
    const introTextHeight = bodySize + (introLines.length - 1) * bodyLineHeight;
    const actionTextHeight = bodySize + (actionLines.length - 1) * bodyLineHeight;
    let y = Math.round(titleY + (titleSize?.height ?? 0) + bodyGapFromTitle);

    drawWelcomeBirdLayer("behindText");
    drawCenteredImage(ctx, images.title, centerX, titleY, titleWidth);
    for (const [index, line] of introLines.entries()) {
      drawPixelText(ctx, line, centerX, y + index * bodyLineHeight, {
        size: bodySize,
        color: "#fff9e8",
        align: "center"
      });
    }
    y += introTextHeight + groupGap;
    for (const [index, line] of actionLines.entries()) {
      drawPixelText(ctx, line, centerX, y + index * bodyLineHeight, {
        size: bodySize,
        color: "#fff9e8",
        align: "center"
      });
    }
    y += actionTextHeight + buttonGap;
    drawWelcomeBirdLayer("front");
    const playSize = drawCenteredImage(ctx, images.play, centerX, y, playWidth);
    welcomePlayButtonRef.current = playSize ? { x: centerX - playSize.width / 2, y, width: playSize.width, height: playSize.height } : null;
  }, [layout]);
  const drawTitleScreen = useCallback(
    ({ ctx, images }: { ctx: CanvasRenderingContext2D; images: Record<string, HTMLImageElement> }) => {
      if (isPortraitLayout(layout)) {
        ctx.fillStyle = "#02030a";
        ctx.fillRect(0, 0, layout.width, layout.height);
        drawCenteredImage(ctx, images.title, layout.width / 2, MOBILE_TITLE_ART.y, MOBILE_TITLE_ART.width);
        drawPixelText(ctx, `TOP SCORE ${titleTopScore}`, layout.width / 2, MOBILE_TITLE_TOP_SCORE_Y, {
          size: MOBILE_TITLE_TOP_SCORE_SIZE,
          color: "#70e27b",
          align: "center"
        });
        for (const mode of ["A", "B", "C"] as const) {
          const row = MOBILE_TITLE_MODE_ROWS[mode];
          drawPixelText(ctx, TITLE_MODE_HEADINGS[mode], layout.width / 2, row.headingY, {
            size: MOBILE_TITLE_HEADING_SIZE,
            color: "#e79a1b",
            align: "center"
          });
          drawPixelText(ctx, TITLE_MODE_LABELS[mode], layout.width / 2, row.labelY, {
            size: mode === "C" ? MOBILE_TITLE_CLAY_LABEL_SIZE : MOBILE_TITLE_LABEL_SIZE,
            color: "#fff9e8",
            align: "center"
          });
        }
        return;
      }

      drawFullscreenImage(ctx, images.background);
      drawPixelText(ctx, titleTopScore, TITLE_TOP_SCORE.x, TITLE_TOP_SCORE.y, {
        size: TITLE_TOP_SCORE.size,
        color: "#fff9e8"
      });

      if (titleSelectionMode) {
        const position = TITLE_SELECTION_POSITIONS[titleSelectionMode];
        const selection = images.selection;
        if (selection) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(selection, position.x, position.y, TITLE_SELECTION_SIZE.width, TITLE_SELECTION_SIZE.height);
        } else {
          drawPixelText(ctx, ">", position.x, position.y - 2, { size: 24, color: "#fff9e8" });
        }
      }
    },
    [layout, titleSelectionMode, titleTopScore]
  );

  function renderIntroBanner() {
    if (!hasIntroBannerContent) return null;

    return (
      <aside className="intro-banner" aria-label="About Tweet Hunt">
        {debugMode ? (
          <p className="intro-banner-debug">
            DEBUG MODE — mock tweets, no X deletion. Append <code>?debug=0</code> to disable.
          </p>
        ) : null}
        {authStatus === "authorized" ? (
          <p className="intro-banner-status">
            Authorized{handle ? ` as @${handle}` : ""}.
          </p>
        ) : null}
        {authError ? (
          <p className="intro-banner-error">
            {AUTH_ERROR_COPY[authError]}
          </p>
        ) : null}
        {tweetLoadError ? <p className="intro-banner-error">{tweetLoadError}</p> : null}
        {authStatus === "authorized" ? (
          <div className="intro-banner-actions">
            <button type="button" className="arcade-button arcade-button-secondary unlink-button" onClick={revokeAuthorization}>
              Unlink X account
            </button>
          </div>
        ) : null}
      </aside>
    );
  }

  if (stage === "welcome") {
    return (
      <main className="game-shell">
        <div className="game-stage">
          <ArcadeScreenCanvas className="title-crt" layout={layout} ariaLabel="tweet-hunt welcome screen" images={welcomeScreenImages} drawFrame={drawWelcomeScreen}>
            <button className="welcome-start-button" type="button" onPointerDown={handleWelcomeTap} aria-label="Start Tweet Hunt">
              Start Tweet Hunt
            </button>
          </ArcadeScreenCanvas>
        </div>
      </main>
    );
  }

  if (stage === "title") {
    const modalCopy =
      isLoadingTweets
        ? "Loading live tweets from your linked X account..."
        : authStatus === "authorized"
          ? `Game ${pendingMode} uses live tweets from your linked X account. Shooting a bird immediately deletes that tweet from X. Continue?`
        : authStatus === "unknown"
          ? "Checking your authorization status…"
          : "Tweet Hunt needs permission to delete tweets from your X account. Authorize with X to continue.";

    const modalPrimaryLabel =
      isLoadingTweets
        ? "Loading tweets..."
        : authStatus === "authorized"
          ? "Let's hunt"
        : authStatus === "unknown"
          ? "Checking…"
          : "Authorize with X";

    const modalPrimaryDisabled = authStatus === "unknown" || isLoadingTweets;
    const titleOptionRects = isPortraitLayout(layout) ? MOBILE_TITLE_OPTION_RECTS : LANDSCAPE_TITLE_OPTION_RECTS;

    return (
      <main className={`game-shell${mobileScreenClass}${hasIntroBannerContent ? " game-shell-with-banner" : ""}`}>
        {renderIntroBanner()}
        <div className="game-stage">
          <ArcadeScreenCanvas className="title-crt" layout={layout} ariaLabel={`tweet-hunt title screen. Top score ${titleTopScore}`} images={titleScreenImages} drawFrame={drawTitleScreen}>
            <div className="title-hit-regions" aria-label="Choose a game mode">
              <button
                className="title-option title-option-a"
                type="button"
                style={canvasRectStyle(layout, titleOptionRects.A)}
                onPointerEnter={() => setActiveTitleMode("A")}
                onPointerLeave={() => setActiveTitleMode((mode) => (mode === "A" ? null : mode))}
                onFocus={() => setActiveTitleMode("A")}
                onBlur={() => setActiveTitleMode((mode) => (mode === "A" ? null : mode))}
                onClick={() => selectTitleMode("A")}
              >
                {TITLE_MODE_LABELS.A}
              </button>
              <button
                className="title-option title-option-b"
                type="button"
                style={canvasRectStyle(layout, titleOptionRects.B)}
                onPointerEnter={() => setActiveTitleMode("B")}
                onPointerLeave={() => setActiveTitleMode((mode) => (mode === "B" ? null : mode))}
                onFocus={() => setActiveTitleMode("B")}
                onBlur={() => setActiveTitleMode((mode) => (mode === "B" ? null : mode))}
                onClick={() => selectTitleMode("B")}
              >
                {TITLE_MODE_LABELS.B}
              </button>
              <button
                className="title-option title-option-c"
                type="button"
                style={canvasRectStyle(layout, titleOptionRects.C)}
                onPointerEnter={() => setActiveTitleMode("C")}
                onPointerLeave={() => setActiveTitleMode((mode) => (mode === "C" ? null : mode))}
                onFocus={() => setActiveTitleMode("C")}
                onBlur={() => setActiveTitleMode((mode) => (mode === "C" ? null : mode))}
                onClick={() => selectTitleMode("C")}
              >
                {TITLE_MODE_LABELS.C}
              </button>
            </div>
          </ArcadeScreenCanvas>
        </div>

        {pendingMode ? (
          <div
            className="auth-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={cancelPendingMode}
          >
            <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
              <h2 id="auth-modal-title">Warning</h2>
              <p>{modalCopy}</p>
              <p className="auth-modal-hint">
                Want to play without consequences?
                <br className="mobile-only-line-break" />
                Play <strong>Clay Shooting</strong> mode.
              </p>
              <div className="auth-modal-actions">
                <button type="button" className="arcade-button arcade-button-secondary" onClick={cancelPendingMode}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="arcade-button arcade-button-primary"
                  onClick={confirmPendingMode}
                  disabled={modalPrimaryDisabled}
                >
                  {modalPrimaryLabel}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  if (stage === "play") {
    const isClayMode = config.mode === "C";
    const showIntroBanner = !isClayMode && hasIntroBannerContent;
    return (
      <main className={`game-shell${showIntroBanner ? " game-shell-with-banner" : ""}`}>
        {showIntroBanner ? renderIntroBanner() : null}
        <div className="game-stage">
          <GameCanvas
            mode={config.mode}
            roundNumber={roundNumber}
            tweets={roundTweets}
            isLiveTweetRound={isLiveTweetRound}
            debugMode={isDebugRound}
            onRoundEnd={handleRoundEnd}
            onQuit={stopAudioAndShowTitleScreen}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <div className="game-stage">
        {stage === "review" && lastResult ? (
          <ArcadeRoundReview
            layout={layout}
            result={lastResult}
            onNextRound={nextRound}
            onChangeGame={stopAudioAndShowTitleScreen}
          />
        ) : null}
      </div>
    </main>
  );
}
