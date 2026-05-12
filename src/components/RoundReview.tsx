"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate, truncate } from "@/game/format";
import type { RoundResult } from "@/game/types";

type Props = {
  result: RoundResult;
  onChangeGame: () => void;
  onNextRound: () => void;
};

export function RoundReview({ result, onChangeGame, onNextRound }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const destructiveHits = useMemo(() => result.hits.filter((hit) => hit.tweet), [result.hits]);
  const currentHit = destructiveHits[currentIndex] ?? null;
  const currentTweet = currentHit?.tweet;

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(destructiveHits.length - 1, 0)));
  }, [destructiveHits.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousTweet();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextTweet();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function showPreviousTweet() {
    if (destructiveHits.length === 0) return;
    setCurrentIndex((index) => (index + destructiveHits.length - 1) % destructiveHits.length);
  }

  function showNextTweet() {
    if (destructiveHits.length === 0) return;
    setCurrentIndex((index) => (index + 1) % destructiveHits.length);
  }

  return (
    <section className="review-screen" aria-label={`Round ${result.roundNumber} review`}>
      <header className="review-header">
        <p className="kicker">Round {result.roundNumber} review</p>
        <h2>{destructiveHits.length > 0 ? `Deleted tweets ${currentIndex + 1}/${destructiveHits.length}` : "No tweets deleted"}</h2>
      </header>

      <div className={`review-carousel${destructiveHits.length === 0 ? " review-carousel-empty" : ""}`}>
        {destructiveHits.length > 0 ? (
          <button className="carousel-arrow" type="button" onClick={showPreviousTweet} disabled={destructiveHits.length <= 1} aria-label="Previous bagged tweet">
            &lt;
          </button>
        ) : null}

        {currentHit && currentTweet ? (
          <article className="carousel-tweet">
            <div className="tweet-meta"><span>{formatDate(currentTweet.createdAt)}</span></div>
            <blockquote>{truncate(currentTweet.text, 220)}</blockquote>
            <div className="tweet-meta">
              <span>{currentTweet.likes} likes</span>
              <span>{currentTweet.reposts} reposts</span>
              <span>{currentTweet.replies} replies</span>
              {currentHit.deleteStatus ? <span>{currentHit.deleteStatus}</span> : null}
            </div>
          </article>
        ) : (
          <div className="carousel-empty">
            <p>{result.mode === "C" ? "Game C is practice only. No tweets are deleted." : "No tweet targets were hit this round."}</p>
          </div>
        )}

        {destructiveHits.length > 0 ? (
          <button className="carousel-arrow" type="button" onClick={showNextTweet} disabled={destructiveHits.length <= 1} aria-label="Next bagged tweet">
            &gt;
          </button>
        ) : null}
      </div>

      <div className="review-footer">
        <div className="button-row">
          <button className="secondary" type="button" onClick={onChangeGame}>Quit</button>
          {result.passed || destructiveHits.length === 0 ? (
            <button className="primary" type="button" onClick={onNextRound}>Next round</button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
