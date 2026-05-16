"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import crtAsset from "../../Assets/CRT/crt_edited.png";
import titleAsset from "../../Assets/Sprites/UI/title.jpg";
import welcomeAsset from "../../Assets/Sprites/UI/welcome_screen.png";
import { GameCanvas } from "./GameCanvas";
import { RoundReview } from "./RoundReview";
import { TARGETS_PER_ROUND } from "@/game/constants";
import { loadHighScores, mergeBestScore } from "@/game/highScores";
import type { GameMode, HuntConfig, RoundResult, TweetCandidate } from "@/game/types";

type Stage = "welcome" | "title" | "play" | "review";
type AuthStatus = "unknown" | "authorized" | "unauthorized";
type AuthError = null | "denied" | "state-mismatch" | "token-error" | "missing-config";

type MeResponse = { authorized: boolean; handle?: string; name?: string; expired?: boolean };
type CandidatesResponse = { tweets?: TweetCandidate[]; error?: string };

const AUTH_ERROR_COPY: Record<NonNullable<AuthError>, string> = {
  denied: "Authorization was canceled. You can try again whenever you're ready.",
  "state-mismatch": "That authorization session expired. Please try again.",
  "token-error": "X couldn't complete the authorization handoff. Try again in a moment.",
  "missing-config": "X OAuth isn't configured on the server. Add X_CLIENT_ID, X_CLIENT_SECRET, and X_REDIRECT_URI."
};

export function TweetHuntApp() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [roundNumber, setRoundNumber] = useState(1);
  const [config, setConfig] = useState<HuntConfig>({ mode: "A", source: "random" });
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("unknown");
  const [handle, setHandle] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);
  const [roundTweets, setRoundTweets] = useState<TweetCandidate[]>([]);
  const [isLiveTweetRound, setIsLiveTweetRound] = useState(false);
  const [useArcadeFallback, setUseArcadeFallback] = useState(false);
  const [tweetLoadError, setTweetLoadError] = useState<string | null>(null);
  const [isLoadingTweets, setIsLoadingTweets] = useState(false);
  const [highScores, setHighScores] = useState<Record<GameMode, number>>({ A: 0, B: 0, C: 0 });

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
    if (stage !== "welcome") return undefined;
    const options = { capture: true };

    function handleStart() {
      setStage("title");
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      setStage("title");
    }

    document.addEventListener("pointerdown", handleStart, options);
    document.addEventListener("mousedown", handleStart, options);
    document.addEventListener("click", handleStart, options);
    document.addEventListener("touchstart", handleStart, options);
    document.addEventListener("keydown", handleKeyDown, options);
    return () => {
      document.removeEventListener("pointerdown", handleStart, options);
      document.removeEventListener("mousedown", handleStart, options);
      document.removeEventListener("click", handleStart, options);
      document.removeEventListener("touchstart", handleStart, options);
      document.removeEventListener("keydown", handleKeyDown, options);
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
    setConfig((current) => ({ ...current, mode }));
    setRoundTweets([]);
    setIsLiveTweetRound(false);
    setUseArcadeFallback(false);
    setLastResult(null);
    setPendingMode(null);
    setStage("play");
  }

  function selectTitleMode(mode: GameMode) {
    setAuthError(null);
    setTweetLoadError(null);
    if (mode === "C") {
      startPracticeMode(mode);
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

  const crtStyle = { "--crt-art": `url(${crtAsset.src})` } as CSSProperties;
  const hasIntroBannerContent = authStatus === "authorized" || Boolean(authError) || Boolean(tweetLoadError);

  function renderIntroBanner() {
    if (!hasIntroBannerContent) return null;

    return (
      <aside className="intro-banner" aria-label="About Tweet Hunt">
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
      <main className="game-shell" onClick={showTitleScreen} onPointerDown={showTitleScreen}>
        <div className="game-stage">
          <div className="canvas-wrap crt-cabinet title-crt" style={crtStyle}>
            <div className="crt-screen" onClick={showTitleScreen} onPointerDown={showTitleScreen}>
              <button className="title-screen welcome-screen" type="button" onClick={showTitleScreen} onPointerDown={showTitleScreen} aria-label="Start Tweet Hunt">
                <img src={welcomeAsset.src} alt="tweet-hunt welcome screen" />
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "title") {
    const modalCopy =
      isLoadingTweets
        ? "Loading live tweets from your linked X account..."
        : authStatus === "authorized"
          ? `Warning: Game ${pendingMode} uses live tweets from your linked X account. Shooting a tweet bird immediately deletes that tweet from X. Continue?`
        : authStatus === "unknown"
          ? "Checking your authorization status…"
          : "Tweet Hunt needs permission to delete tweets from your X account. Authorize with X to continue.";

    const modalPrimaryLabel =
      isLoadingTweets
        ? "Loading tweets..."
        : authStatus === "authorized"
          ? "Let's delete some tweets"
        : authStatus === "unknown"
          ? "Checking…"
          : "Authorize with X";

    const modalPrimaryDisabled = authStatus === "unknown" || isLoadingTweets;

    const titleTopScore = String(Math.max(highScores.A, highScores.B, highScores.C)).padStart(6, "0");

    return (
      <main className={`game-shell${hasIntroBannerContent ? " game-shell-with-banner" : ""}`}>
        {renderIntroBanner()}
        <div className="game-stage">
          <div className="canvas-wrap crt-cabinet title-crt" style={crtStyle}>
            <div className="crt-screen">
              <section className="title-screen" aria-label="tweet-hunt title screen">
                <img src={titleAsset.src} alt="tweet-hunt title screen with Game A, Game B, and Game C options" />
                <div className="title-top-score" aria-label={`Top score ${titleTopScore}`}>
                  {titleTopScore.split("").map((digit, index) => (
                    <span key={index} className={`title-top-score-slot title-top-score-slot--${index}`}>
                      {digit}
                    </span>
                  ))}
                </div>
                <div className="title-options" aria-label="Choose a game mode">
                  <button className="title-option title-option-a" type="button" onClick={() => selectTitleMode("A")}>
                    Game A
                  </button>
                  <button className="title-option title-option-b" type="button" onClick={() => selectTitleMode("B")}>
                    Game B
                  </button>
                  <button className="title-option title-option-c" type="button" onClick={() => selectTitleMode("C")}>
                    Game C
                  </button>
                </div>
              </section>
            </div>
          </div>
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
              <h2 id="auth-modal-title">Game {pendingMode}</h2>
              <p>{modalCopy}</p>
              <p className="auth-modal-hint">
                Want to play without consequences? Cancel and choose <strong>Game C</strong> (clay shooting).
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
          <GameCanvas mode={config.mode} roundNumber={roundNumber} tweets={roundTweets} isLiveTweetRound={isLiveTweetRound} onRoundEnd={handleRoundEnd} />
        </div>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <div className="game-stage">
        <div className="canvas-wrap crt-cabinet review-crt" style={crtStyle}>
          <div className="crt-screen">
            {stage === "review" && lastResult ? (
              <RoundReview
                result={lastResult}
                onNextRound={nextRound}
                onChangeGame={() => setStage("title")}
              />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
