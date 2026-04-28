"use client";

import { useMemo, useState } from "react";
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
            <div className="grid">
              <section className="arcade-card">
                <p className="kicker">Insert coin</p>
                <h2>A retro arcade round for your old tweets</h2>
                <p>
                  Game A sends one tweet bird at a time. Game B sends two tweet birds at a time. Game C sends clay tweets and never touches live posts.
                </p>
                <p className="muted">
                  A hit gives you a fast micro-reveal during play. At the end of the round, every hit tweet is shown in a review screen before any delete request can be sent.
                </p>
                <div className="button-row">
                  <button className="primary" type="button" onClick={() => setStage("setup")}>Press start</button>
                  <button className="secondary" type="button" onClick={() => { setConfig({ mode: "C", source: "random" }); setStage("play"); }}>Practice Game C</button>
                </div>
              </section>
              <aside className="arcade-card">
                <h3>Rules</h3>
                <ul className="stat-list">
                  <li><span>Round size</span><strong>10 targets</strong></li>
                  <li><span>Shots</span><strong>3 per volley</strong></li>
                  <li><span>Game A</span><strong>1 tweet</strong></li>
                  <li><span>Game B</span><strong>2 tweets</strong></li>
                  <li><span>Game C</span><strong>0 deletes</strong></li>
                  <li><span>Delete timing</span><strong>after review</strong></li>
                </ul>
              </aside>
            </div>
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
