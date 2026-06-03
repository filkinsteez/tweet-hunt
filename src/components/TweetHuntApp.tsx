"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import titleAsset from "../../Assets/Sprites/UI/title_v2.jpg";
import titleSelectionAsset from "../../Assets/Sprites/UI/UI_title_selection.jpg";
import welcomePlayAsset from "../../Assets/Sprites/UI/welcome_screen_play.png";
import welcomeTitleAsset from "../../Assets/Sprites/UI/tweet_hunt_title.png";
import chatGptBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_birdsprite_fly.png";
import { ArcadeRoundReview } from "./ArcadeRoundReview";
import { ArcadeScreenCanvas } from "./ArcadeScreenCanvas";
import { CanvasLoadingOverlay } from "./CanvasLoadingOverlay";
import { GameCanvas } from "./GameCanvas";
import { preloadInitialGameAssets } from "@/game/assetCache";
import { TARGETS_PER_ROUND } from "@/game/constants";
import { gameAudio } from "@/game/audio";
import { loadHighScores, mergeBestScore } from "@/game/highScores";
import { isPortraitLayout, type GameplayLayoutProfile } from "@/game/layout";
import { selectTweetCandidates } from "@/game/mockTweets";
import {
  drawArcadeButton,
  drawArcadeModalPanel,
  drawArcadeModalScrim,
  drawArcadeModalTitle,
  drawFullscreenImage,
  drawPixelText,
  drawWrappedUiText,
  wrapUiText,
  type Rect
} from "@/game/uiDraw";
import type { GameMode, HuntConfig, RoundResult, TweetCandidate } from "@/game/types";
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

const TITLE_TOP_SCORE = { x: 548, y: 594, size: 24 };
const TITLE_SELECTION_SIZE = { width: 32, height: 24 };
const TITLE_SELECTION_POSITIONS: Record<GameMode, { x: number; y: number }> = {
  A: { x: 178, y: 409 },
  B: { x: 178, y: 461 },
  C: { x: 178, y: 513 }
};
const TITLE_MODE_LABELS: Record<GameMode, string> = {
  A: "REAL TWEETS",
  B: "FAKE TWEETS",
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
const MOBILE_TITLE_TOP_SCORE_Y = 865;
const MOBILE_LINKED_TITLE_TOP_SCORE_Y = 830;
const MOBILE_TITLE_TOP_SCORE_SIZE = 20;
const MOBILE_TITLE_HEADING_SIZE = 23;
const MOBILE_TITLE_LABEL_SIZE = 31;
const MOBILE_TITLE_CLAY_LABEL_SIZE = 26;
const TITLE_UNLINK_LABEL = "UNLINK ACCOUNT";
const TITLE_UNLINK_RECT = { x: 336, y: 616, width: 360, height: 52 };
const MOBILE_TITLE_UNLINK_RECT = { x: 102, y: 884, width: 336, height: 56 };
const MOBILE_LINKED_TITLE_UNLINK_RECT = { x: 102, y: 849, width: 336, height: 56 };

function drawTitleSelection(
  ctx: CanvasRenderingContext2D,
  images: Record<string, HTMLImageElement>,
  position: { x: number; y: number }
) {
  const selection = images.selection;
  if (selection) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(selection, position.x, position.y, TITLE_SELECTION_SIZE.width, TITLE_SELECTION_SIZE.height);
    return;
  }

  drawPixelText(ctx, ">", position.x, position.y - 2, { size: 24, color: "#fff9e8" });
}

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
  A: { x: 211, y: 399, width: 634, height: 44 },
  B: { x: 211, y: 451, width: 634, height: 44 },
  C: { x: 211, y: 500, width: 634, height: 44 }
};
const MODAL_BODY_COLOR = "#fff9e8";
const TITLE_MODAL_SPEC_LANDSCAPE = {
  panelWidth: 740,
  paddingTop: 44,
  paddingBottom: 40,
  gapTitleBody: 28,
  gapBodyPrompt: 20,
  gapPromptButtons: 32,
  gapBodyButtons: 36,
  buttonWidth: 272,
  buttonHeight: 72,
  buttonGap: 36,
  bodyWidth: 644,
  bodySize: 28,
  bodyLineHeight: 42,
  bodyWeight: 400,
  titleSize: 40,
  promptSize: 15,
  promptLineHeight: 20,
  buttonTextSize: 22
};
const TITLE_MODAL_SPEC_PORTRAIT = {
  panelWidth: 460,
  paddingTop: 36,
  paddingBottom: 32,
  gapTitleBody: 24,
  gapBodyPrompt: 16,
  gapPromptButtons: 28,
  gapBodyButtons: 32,
  buttonWidth: 182,
  buttonHeight: 68,
  buttonGap: 24,
  bodyWidth: 396,
  bodySize: 22,
  bodyLineHeight: 28,
  bodyWeight: 400,
  titleSize: 32,
  promptSize: 13,
  promptLineHeight: 18,
  buttonTextSize: 16
};

type TitleModalCopy = {
  title: string;
  titleColor?: string;
  body: string;
  prompt?: string | null;
  cancelLabel: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
};

function getTitleModalSpec(layout: GameplayLayoutProfile) {
  return isPortraitLayout(layout) ? TITLE_MODAL_SPEC_PORTRAIT : TITLE_MODAL_SPEC_LANDSCAPE;
}

function buildTitleModalLayout(ctx: CanvasRenderingContext2D, layout: GameplayLayoutProfile, copy: TitleModalCopy) {
  const spec = getTitleModalSpec(layout);
  const bodyLines = wrapUiText(ctx, copy.body, spec.bodyWidth, spec.bodySize, spec.bodyWeight);
  const bodyBlockHeight = bodyLines.length * spec.bodyLineHeight;
  const hasPrompt = Boolean(copy.prompt);
  const promptBlockHeight = hasPrompt ? spec.promptLineHeight : 0;
  const gapBeforeButtons = hasPrompt ? spec.gapPromptButtons : spec.gapBodyButtons;
  const gapBodyToNext = hasPrompt ? spec.gapBodyPrompt : 0;
  const contentHeight =
    spec.titleSize + spec.gapTitleBody + bodyBlockHeight + gapBodyToNext + promptBlockHeight + gapBeforeButtons + spec.buttonHeight;
  const panelHeight = spec.paddingTop + contentHeight + spec.paddingBottom;
  const panelX = Math.round((layout.width - spec.panelWidth) / 2);
  const panelY = Math.round((layout.height - panelHeight) / 2);

  let y = panelY + spec.paddingTop;
  const titleY = y;
  y += spec.titleSize + spec.gapTitleBody;
  const bodyY = y;
  y += bodyBlockHeight;
  if (hasPrompt) y += spec.gapBodyPrompt;
  const promptY = hasPrompt ? y : 0;
  if (hasPrompt) y += promptBlockHeight;
  y += gapBeforeButtons;
  const buttonY = y;

  const buttonsTotalWidth = spec.buttonWidth * 2 + spec.buttonGap;
  const buttonsX = panelX + Math.round((spec.panelWidth - buttonsTotalWidth) / 2);

  return {
    panel: { x: panelX, y: panelY, width: spec.panelWidth, height: panelHeight },
    cancelButton: { x: buttonsX, y: buttonY, width: spec.buttonWidth, height: spec.buttonHeight },
    primaryButton: { x: buttonsX + spec.buttonWidth + spec.buttonGap, y: buttonY, width: spec.buttonWidth, height: spec.buttonHeight },
    titleY,
    bodyY,
    promptY,
    bodyWidth: spec.bodyWidth,
    bodySize: spec.bodySize,
    bodyLineHeight: spec.bodyLineHeight,
    bodyWeight: spec.bodyWeight,
    titleSize: spec.titleSize,
    promptSize: spec.promptSize,
    buttonTextSize: spec.buttonTextSize
  };
}

function measureTitleModalLayout(layout: GameplayLayoutProfile, copy: TitleModalCopy) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable for modal layout.");
  }

  return buildTitleModalLayout(ctx, layout, copy);
}

function drawTitleModal(ctx: CanvasRenderingContext2D, layout: GameplayLayoutProfile, copy: TitleModalCopy) {
  const modal = buildTitleModalLayout(ctx, layout, copy);
  drawArcadeModalScrim(ctx);
  drawArcadeModalPanel(ctx, modal.panel);
  drawArcadeModalTitle(ctx, copy.title.toUpperCase(), layout.width / 2, modal.titleY, modal.titleSize, copy.titleColor, modal.panel.width - 56);
  drawWrappedUiText(ctx, copy.body, layout.width / 2, modal.bodyY, modal.bodyWidth, modal.bodyLineHeight, {
    size: modal.bodySize,
    color: MODAL_BODY_COLOR,
    align: "center",
    weight: modal.bodyWeight
  });
  drawArcadeButton(ctx, modal.cancelButton, copy.cancelLabel.toUpperCase(), { variant: "secondary", textSize: modal.buttonTextSize });
  drawArcadeButton(ctx, modal.primaryButton, copy.primaryLabel.toUpperCase(), { variant: "primary", textSize: modal.buttonTextSize });
  if (copy.primaryDisabled) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(modal.primaryButton.x, modal.primaryButton.y, modal.primaryButton.width, modal.primaryButton.height);
    ctx.restore();
  }

  return modal;
}

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
  const [stage, setStage] = useState<Stage>("welcome");
  const [roundNumber, setRoundNumber] = useState(1);
  const [config, setConfig] = useState<HuntConfig>({ mode: "A", source: "random" });
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("unknown");
  const [handle, setHandle] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);
  const [activeTitleMode, setActiveTitleMode] = useState<GameMode | null>(null);
  const [activeTitleUnlink, setActiveTitleUnlink] = useState(false);
  const [roundTweets, setRoundTweets] = useState<TweetCandidate[]>([]);
  const [isLiveTweetRound, setIsLiveTweetRound] = useState(false);
  const [useArcadeFallback, setUseArcadeFallback] = useState(false);
  const [tweetLoadError, setTweetLoadError] = useState<string | null>(null);
  const [isLoadingTweets, setIsLoadingTweets] = useState(false);
  const [initialAssetsReady, setInitialAssetsReady] = useState(false);
  const [highScores, setHighScores] = useState<Record<GameMode, number>>({ A: 0, B: 0, C: 0 });
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
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
    let cancelled = false;

    preloadInitialGameAssets().finally(() => {
      if (!cancelled) setInitialAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
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
        if (mode === "A") {
          setLastResult(null);
          setPendingMode("A");
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
    setLastResult(null);
    setPendingMode(null);
    setStage("play");
  }

  function startFakeTweetRound() {
    const tweets = selectTweetCandidates({ source: "random" }, TARGETS_PER_ROUND);
    gameAudio.stopAll();
    setConfig((current) => ({ ...current, mode: "B" }));
    setRoundTweets(tweets);
    setIsLiveTweetRound(true);
    setUseArcadeFallback(false);
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
    if (mode === "B") {
      startFakeTweetRound();
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
    setShowUnlinkModal(false);
  }

  function requestUnlinkAuthorization() {
    if (authStatus !== "authorized") return;
    setShowUnlinkModal(true);
  }

  function cancelUnlinkAuthorization() {
    setShowUnlinkModal(false);
  }

  async function confirmUnlinkAuthorization() {
    await revokeAuthorization();
  }

  function handleRoundEnd(result: RoundResult) {
    const { next, isNewBest } = mergeBestScore(result.mode, result.score);
    if (isNewBest) setHighScores(next);
    setLastResult(result);
    setStage("review");
  }

  function nextRound() {
    setRoundNumber((current) => current + 1);
    if (config.mode === "B") {
      startFakeTweetRound();
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

  const hasIntroBannerContent = Boolean(authError) || Boolean(tweetLoadError);
  const mobileScreenClass = isPortraitLayout(layout) ? " game-shell-mobile-screen" : "";
  const titleTopScore = String(Math.max(highScores.A, highScores.B, highScores.C)).padStart(6, "0");
  const titleSelectionMode = pendingMode ?? activeTitleMode;
  const linkedAccountLabel = handle ? `@${handle}` : "your linked X account";
  const modalTitle =
    authStatus === "authorized" ? "Real Tweet Mode" : authStatus === "unknown" ? "Checking Connection" : "Connect Account";
  const modalBody =
    authStatus === "authorized"
      ? `Connected to ${linkedAccountLabel}. Shooting a bird will immediately delete a random tweet. Ready to hunt?`
      : authStatus === "unknown"
        ? "Checking your account connection..."
        : "Connect your X account to load tweet candidates for this round. Nothing is deleted when you connect.";
  const modalPrimaryLabel =
    authStatus === "authorized"
      ? "Let's hunt"
      : authStatus === "unknown"
        ? "Checking..."
        : "Connect X";
  const modalPrimaryDisabled = authStatus === "unknown" || isLoadingTweets;
  const activeTitleModal = pendingMode && !isLoadingTweets
    ? {
        title: modalTitle,
        titleColor: authStatus === "authorized" ? "#ff5c51" : "#e79a1b",
        body: modalBody,
        cancelLabel: "Cancel",
        primaryLabel: modalPrimaryLabel,
        primaryDisabled: modalPrimaryDisabled
      }
    : showUnlinkModal
      ? {
          title: "Unlink account?",
          body: `Account linked: ${linkedAccountLabel}. This disconnects Tweet Hunt from that account. You can authorize again later.`,
          cancelLabel: "Cancel",
          primaryLabel: "Unlink"
        }
      : null;
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
    const titleY = 25;
    const bodyGapFromTitle = 55;
    const bodySize = 24;
    const bodyLineHeight = 43;
    const groupGap = 60;
    const buttonGap = 45;
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
        const isLinked = authStatus === "authorized";
        const mobileScoreY = isLinked ? MOBILE_LINKED_TITLE_TOP_SCORE_Y : MOBILE_TITLE_TOP_SCORE_Y;
        const mobileUnlinkRect = isLinked ? MOBILE_LINKED_TITLE_UNLINK_RECT : MOBILE_TITLE_UNLINK_RECT;

        ctx.fillStyle = "#02030a";
        ctx.fillRect(0, 0, layout.width, layout.height);
        drawCenteredImage(ctx, images.title, layout.width / 2, MOBILE_TITLE_ART.y, MOBILE_TITLE_ART.width);
        drawPixelText(ctx, `TOP SCORE ${titleTopScore}`, layout.width / 2, mobileScoreY, {
          size: MOBILE_TITLE_TOP_SCORE_SIZE,
          color: "#70e27b",
          align: "center"
        });
        if (isLinked) {
          drawPixelText(ctx, TITLE_UNLINK_LABEL, layout.width / 2, mobileUnlinkRect.y + 36, {
            size: 16,
            color: activeTitleUnlink ? "#fff9e8" : "#e79a1b",
            align: "center"
          });
        }
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
        if (activeTitleModal) {
          drawTitleModal(ctx, layout, activeTitleModal);
        }
        return;
      }

      drawFullscreenImage(ctx, images.background);
      drawPixelText(ctx, titleTopScore, TITLE_TOP_SCORE.x, TITLE_TOP_SCORE.y, {
        size: TITLE_TOP_SCORE.size,
        color: "#fff9e8"
      });
      if (authStatus === "authorized") {
        drawPixelText(ctx, TITLE_UNLINK_LABEL, TITLE_UNLINK_RECT.x + TITLE_UNLINK_RECT.width / 2, TITLE_UNLINK_RECT.y + 34, {
          size: 18,
          color: activeTitleUnlink ? "#fff9e8" : "#e79a1b",
          align: "center"
        });
      }

      if (titleSelectionMode) {
        drawTitleSelection(ctx, images, TITLE_SELECTION_POSITIONS[titleSelectionMode]);
      }
      if (activeTitleModal) {
        drawTitleModal(ctx, layout, activeTitleModal);
      }
    },
    [activeTitleModal, activeTitleUnlink, authStatus, layout, titleSelectionMode, titleTopScore]
  );

  function renderIntroBanner() {
    if (!hasIntroBannerContent) return null;

    return (
      <aside className="intro-banner" aria-label="About Tweet Hunt">
        {authError ? (
          <p className="intro-banner-error">
            {AUTH_ERROR_COPY[authError]}
          </p>
        ) : null}
        {tweetLoadError ? <p className="intro-banner-error">{tweetLoadError}</p> : null}
      </aside>
    );
  }

  if (!initialAssetsReady) {
    return (
      <main className={`game-shell${mobileScreenClass}`}>
        <div className="game-stage app-loading-stage">
          <CanvasLoadingOverlay visible label="LOADING..." />
        </div>
      </main>
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
    const titleOptionRects = isPortraitLayout(layout) ? MOBILE_TITLE_OPTION_RECTS : LANDSCAPE_TITLE_OPTION_RECTS;
    const titleUnlinkRect = isPortraitLayout(layout) ? MOBILE_LINKED_TITLE_UNLINK_RECT : TITLE_UNLINK_RECT;
    const titleModalLayout = activeTitleModal ? measureTitleModalLayout(layout, activeTitleModal) : null;
    const titleModalCancel = pendingMode ? cancelPendingMode : cancelUnlinkAuthorization;
    const titleModalPrimary = pendingMode ? confirmPendingMode : confirmUnlinkAuthorization;
    const titleModalTitleId = pendingMode ? "auth-modal-title" : "unlink-modal-title";
    const titleModalBodyId = pendingMode ? "auth-modal-body" : "unlink-modal-body";

    return (
      <main className={`game-shell${mobileScreenClass}${hasIntroBannerContent ? " game-shell-with-banner" : ""}`}>
        {renderIntroBanner()}
        <CanvasLoadingOverlay visible={isLoadingTweets} label="IMPORTING TWEETS..." />
        <div className="game-stage">
          <ArcadeScreenCanvas className="title-crt" layout={layout} ariaLabel={`tweet-hunt title screen. Top score ${titleTopScore}`} images={titleScreenImages} drawFrame={drawTitleScreen}>
            <div className="title-hit-regions" aria-label="Choose a game mode or manage linked account">
              <button
                className="title-option title-option-a"
                type="button"
                style={canvasRectStyle(layout, titleOptionRects.A)}
                onPointerEnter={() => {
                  setActiveTitleMode("A");
                  setActiveTitleUnlink(false);
                }}
                onPointerLeave={() => setActiveTitleMode((mode) => (mode === "A" ? null : mode))}
                onFocus={() => {
                  setActiveTitleMode("A");
                  setActiveTitleUnlink(false);
                }}
                onBlur={() => setActiveTitleMode((mode) => (mode === "A" ? null : mode))}
                onClick={() => selectTitleMode("A")}
              >
                {TITLE_MODE_LABELS.A}
              </button>
              <button
                className="title-option title-option-b"
                type="button"
                style={canvasRectStyle(layout, titleOptionRects.B)}
                onPointerEnter={() => {
                  setActiveTitleMode("B");
                  setActiveTitleUnlink(false);
                }}
                onPointerLeave={() => setActiveTitleMode((mode) => (mode === "B" ? null : mode))}
                onFocus={() => {
                  setActiveTitleMode("B");
                  setActiveTitleUnlink(false);
                }}
                onBlur={() => setActiveTitleMode((mode) => (mode === "B" ? null : mode))}
                onClick={() => selectTitleMode("B")}
              >
                {TITLE_MODE_LABELS.B}
              </button>
              <button
                className="title-option title-option-c"
                type="button"
                style={canvasRectStyle(layout, titleOptionRects.C)}
                onPointerEnter={() => {
                  setActiveTitleMode("C");
                  setActiveTitleUnlink(false);
                }}
                onPointerLeave={() => setActiveTitleMode((mode) => (mode === "C" ? null : mode))}
                onFocus={() => {
                  setActiveTitleMode("C");
                  setActiveTitleUnlink(false);
                }}
                onBlur={() => setActiveTitleMode((mode) => (mode === "C" ? null : mode))}
                onClick={() => selectTitleMode("C")}
              >
                {TITLE_MODE_LABELS.C}
              </button>
              {authStatus === "authorized" ? (
                <button
                  className="title-unlink-button"
                  type="button"
                  style={canvasRectStyle(layout, titleUnlinkRect)}
                  aria-label={`Unlink account ${linkedAccountLabel}`}
                  onPointerEnter={() => {
                    setActiveTitleUnlink(true);
                    setActiveTitleMode(null);
                  }}
                  onPointerLeave={() => setActiveTitleUnlink(false)}
                  onFocus={() => {
                    setActiveTitleUnlink(true);
                    setActiveTitleMode(null);
                  }}
                  onBlur={() => setActiveTitleUnlink(false)}
                  onClick={requestUnlinkAuthorization}
                >
                  {TITLE_UNLINK_LABEL}
                </button>
              ) : null}
            </div>

            {activeTitleModal && titleModalLayout ? (
              <div
                className="title-modal-hit-regions"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleModalTitleId}
                aria-describedby={titleModalBodyId}
                onClick={titleModalCancel}
              >
                <h2 id={titleModalTitleId} className="visually-hidden">
                  {activeTitleModal.title}
                </h2>
                <p id={titleModalBodyId} className="visually-hidden">
                  {activeTitleModal.body}
                </p>
                <button
                  type="button"
                  className="title-modal-hit-button"
                  style={canvasRectStyle(layout, titleModalLayout.cancelButton)}
                  onClick={(event) => {
                    event.stopPropagation();
                    titleModalCancel();
                  }}
                >
                  {activeTitleModal.cancelLabel}
                </button>
                <button
                  type="button"
                  className="title-modal-hit-button"
                  style={canvasRectStyle(layout, titleModalLayout.primaryButton)}
                  aria-disabled={activeTitleModal.primaryDisabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!activeTitleModal.primaryDisabled) void titleModalPrimary();
                  }}
                >
                  {activeTitleModal.primaryLabel}
                </button>
              </div>
            ) : null}
          </ArcadeScreenCanvas>
        </div>
      </main>
    );
  }

  if (stage === "play") {
    const isClayMode = config.mode === "C";
    const showIntroBanner = !isClayMode && hasIntroBannerContent;
    return (
      <main className={`game-shell${showIntroBanner ? " game-shell-with-banner" : ""}`}>
        {showIntroBanner ? renderIntroBanner() : null}
        <CanvasLoadingOverlay visible={isLoadingTweets} label="IMPORTING TWEETS..." />
        <div className="game-stage">
          <GameCanvas
            mode={config.mode}
            roundNumber={roundNumber}
            tweets={roundTweets}
            isLiveTweetRound={isLiveTweetRound}
            onRoundEnd={handleRoundEnd}
            onQuit={stopAudioAndShowTitleScreen}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <CanvasLoadingOverlay visible={isLoadingTweets} label="IMPORTING TWEETS..." />
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
