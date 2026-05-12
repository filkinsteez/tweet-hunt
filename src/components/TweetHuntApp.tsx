"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import crtAsset from "../../Assets/CRT/crt_edited.png";
import titleAsset from "../../Assets/Sprites/UI/title.jpg";
import { GameCanvas } from "./GameCanvas";
import { RoundReview } from "./RoundReview";
import { TARGETS_PER_ROUND } from "@/game/constants";
import type { GameMode, HuntConfig, RoundResult, TweetCandidate } from "@/game/types";

type Stage = "title" | "play" | "review";
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
  const [stage, setStage] = useState<Stage>("title");
  const [roundNumber, setRoundNumber] = useState(1);
  const [config, setConfig] = useState<HuntConfig>({ mode: "A", source: "random" });
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("unknown");
  const [handle, setHandle] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);
  const [roundTweets, setRoundTweets] = useState<TweetCandidate[]>([]);
  const [tweetLoadError, setTweetLoadError] = useState<string | null>(null);
  const [isLoadingTweets, setIsLoadingTweets] = useState(false);

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
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (!auth) return;

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
    if (!data.tweets?.length) {
      throw new Error("No live tweets were available for this round.");
    }
    const uniqueTweetIds = new Set(data.tweets.map((tweet) => tweet.id));
    if (uniqueTweetIds.size < TARGETS_PER_ROUND) {
      throw new Error(`A full round needs ${TARGETS_PER_ROUND} unique live tweets. This account only returned ${uniqueTweetIds.size}.`);
    }
    return data.tweets;
  }

  async function startMode(mode: GameMode) {
    setAuthError(null);
    setTweetLoadError(null);
    setIsLoadingTweets(mode !== "C");
    try {
      const tweets = mode === "C" ? [] : await loadLiveTweetCandidates();
      setRoundTweets(tweets);
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
  }

  function handleRoundEnd(result: RoundResult) {
    setLastResult(result);
    setStage("review");
  }

  function nextRound() {
    setRoundNumber((current) => current + 1);
    void startMode(config.mode);
  }

  const crtStyle = { "--crt-art": `url(${crtAsset.src})` } as CSSProperties;

  function renderIntroBanner() {
    return (
      <aside className="intro-banner" aria-label="About Tweet Hunt">
        <p>
          Tweet Hunt is an experimental game from{" "}
          <a href="https://ericfilkins.com" target="_blank" rel="noopener noreferrer">
            Eric Filkins
          </a>
          . Once authorized, shooting birds in Game A/B immediately deletes real tweets from your linked account.
        </p>
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

  if (stage === "title") {
    const modalCopy =
      isLoadingTweets
        ? "Loading live tweets from your linked X account..."
        : authStatus === "authorized"
          ? `Warning: Game ${pendingMode} uses live tweets from your linked X account. Shooting a tweet bird immediately deletes that tweet from X. Continue?`
        : authStatus === "unknown"
          ? "Checking your authorization status…"
          : `Game ${pendingMode} needs permission to read tweets from your X account. Authorize with X to continue.`;

    const modalPrimaryLabel =
      isLoadingTweets
        ? "Loading tweets..."
        : authStatus === "authorized"
          ? "I understand, start round"
        : authStatus === "unknown"
          ? "Checking…"
          : "Authorize with X";

    const modalPrimaryDisabled = authStatus === "unknown" || isLoadingTweets;

    return (
      <main className="game-shell game-shell-with-banner">
        {renderIntroBanner()}
        <div className="game-stage">
          <div className="canvas-wrap crt-cabinet title-crt" style={crtStyle}>
            <div className="crt-screen">
              <section className="title-screen" aria-label="tweet-hunt title screen">
                <img src={titleAsset.src} alt="tweet-hunt title screen with Game A, Game B, and Game C options" />
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
                Want to practice without consequences? Cancel and choose <strong>Game C</strong> (clay shooting).
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
    return (
      <main className="game-shell game-shell-with-banner">
        {renderIntroBanner()}
        <div className="game-stage">
          <GameCanvas mode={config.mode} roundNumber={roundNumber} tweets={roundTweets} onRoundEnd={handleRoundEnd} />
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
