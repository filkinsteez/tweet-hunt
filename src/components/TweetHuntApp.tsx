"use client";

import { useMemo, useState } from "react";
import titleAsset from "../../Assets/Sprites/title.jpg";
import { GameCanvas } from "./GameCanvas";
import { RoundReview } from "./RoundReview";
import { selectTweetCandidates } from "@/game/mockTweets";
import type { GameMode, HuntConfig, RoundResult } from "@/game/types";

type Stage = "title" | "play" | "review";

export function TweetHuntApp() {
  const [stage, setStage] = useState<Stage>("title");
  const [roundNumber, setRoundNumber] = useState(1);
  const [config, setConfig] = useState<HuntConfig>({ mode: "A", source: "random" });
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);

  const tweets = useMemo(() => selectTweetCandidates({ source: "random" }, 10), [roundNumber]);

  function selectTitleMode(mode: GameMode) {
    setConfig((current) => ({ ...current, mode }));
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

  if (stage === "play") {
    return (
      <main className="game-shell">
        <div className="game-stage">
          <GameCanvas mode={config.mode} roundNumber={roundNumber} tweets={tweets} onRoundEnd={handleRoundEnd} />
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
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

      {stage === "review" && lastResult ? (
        <RoundReview
          result={lastResult}
          onNextRound={nextRound}
          onChangeGame={() => setStage("title")}
        />
      ) : null}
    </main>
  );
}
