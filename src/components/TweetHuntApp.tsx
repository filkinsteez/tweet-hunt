"use client";

import { useMemo, useState } from "react";
import titleAsset from "../../Assets/Sprites/title.jpg";
import { GameCanvas } from "./GameCanvas";
import { HuntSetup } from "./HuntSetup";
import { ModePicker } from "./ModePicker";
import { RoundReview } from "./RoundReview";
import { selectTweetCandidates } from "@/game/mockTweets";
import { modeLabel } from "@/game/constants";
import type { GameMode, HuntConfig, RoundResult } from "@/game/types";

type Stage = "title" | "setup" | "play" | "review";

export function TweetHuntApp() {
  const [stage, setStage] = useState<Stage>("title");
  const [roundNumber, setRoundNumber] = useState(1);
  const [config, setConfig] = useState<HuntConfig>({ mode: "A", source: "random", year: "2019", keyword: "" });
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);

  const tweets = useMemo(() => selectTweetCandidates(config, 10), [config]);

  function setMode(mode: GameMode) {
    setConfig((current) => ({ ...current, mode }));
  }

  function selectTitleMode(mode: GameMode) {
    setConfig((current) => ({ ...current, mode }));
    setStage("setup");
  }

  function startRound() {
    setLastResult(null);
    setStage("play");
  }

  function handleRoundEnd(result: RoundResult) {
    setLastResult(result);
    setStage("review");
  }

  function nextRound() {
    setRoundNumber((current) => current + 1);
    setLastResult(null);
    setStage("play");
  }

  return (
    <main className="shell">
      <div className="cabinet">
        <header className="cabinet-top">
          <div className="brand">
            <p>single-player arcade prototype</p>
            <h1>tweet-hunt</h1>
          </div>
          <div className="button-row">
            <button className="secondary" type="button" onClick={() => setStage("setup")}>Setup</button>
            <button className="secondary" type="button" onClick={() => setStage("title")}>Title</button>
          </div>
        </header>

        <div className="cabinet-body">
          {stage === "title" ? (
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
          ) : null}

          {stage === "setup" ? (
            <div className="grid">
              <section className="arcade-card">
                <p className="kicker">Mode select</p>
                <h2>{modeLabel(config.mode)}</h2>
                <ModePicker selected={config.mode} onSelect={setMode} />
                <div className="button-row" style={{ marginTop: 18 }}>
                  <button className="primary" type="button" onClick={startRound}>Start round {roundNumber}</button>
                </div>
              </section>
              <HuntSetup config={config} onChange={setConfig} />
            </div>
          ) : null}

          {stage === "play" ? (
            <div className="grid">
              <section>
                <GameCanvas mode={config.mode} roundNumber={roundNumber} tweets={tweets} onRoundEnd={handleRoundEnd} />
              </section>
              <aside className="side-panel">
                <section className="arcade-card">
                  <p className="kicker">Current run</p>
                  <h2>{modeLabel(config.mode)}</h2>
                  <ul className="stat-list">
                    <li><span>Round</span><strong>{roundNumber}</strong></li>
                    <li><span>Source</span><strong>{config.mode === "C" ? "clay only" : config.source}</strong></li>
                    <li><span>Candidate tweets</span><strong>{config.mode === "C" ? 0 : tweets.length}</strong></li>
                  </ul>
                  <p className="muted">Click the playfield to shoot. Hits are bagged, not deleted, until the review screen.</p>
                </section>
                <section className="arcade-card">
                  <h3>Hybrid reveal</h3>
                  <p className="muted">During play, the cabinet flashes the last hit. After the round, you get the full list and can spare anything before confirming.</p>
                </section>
              </aside>
            </div>
          ) : null}

          {stage === "review" && lastResult ? (
            <RoundReview
              result={lastResult}
              onNextRound={nextRound}
              onBackToSetup={() => setStage("setup")}
            />
          ) : null}
        </div>

        <footer className="footer-note">
          Prototype uses mock tweets and dry-run delete requests. Wire OAuth, queue hashing, rate-limit handling, and server-side validation before enabling live deletion.
        </footer>
      </div>
    </main>
  );
}
