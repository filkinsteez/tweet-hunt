"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate, truncate } from "@/game/format";
import type { HitRecord, RoundResult } from "@/game/types";

type Props = {
  result: RoundResult;
  onChangeGame: () => void;
  onNextRound: () => void;
};

export function RoundReview({ result, onChangeGame, onNextRound }: Props) {
  const [sparedIds, setSparedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const destructiveHits = useMemo(() => result.hits.filter((hit) => hit.tweet), [result.hits]);
  const selectedForDeletion = useMemo(
    () => destructiveHits.filter((hit) => !sparedIds.has(hit.tweet?.id ?? hit.targetId)),
    [destructiveHits, sparedIds]
  );
  const currentHit = destructiveHits[currentIndex] ?? null;
  const currentTweet = currentHit?.tweet;
  const currentIsSpared = currentHit ? sparedIds.has(currentHit.tweet?.id ?? currentHit.targetId) : false;

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

  function toggleSpared(hit: HitRecord) {
    const id = hit.tweet?.id ?? hit.targetId;
    setSparedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showPreviousTweet() {
    if (destructiveHits.length === 0) return;
    setCurrentIndex((index) => (index + destructiveHits.length - 1) % destructiveHits.length);
  }

  function showNextTweet() {
    if (destructiveHits.length === 0) return;
    setCurrentIndex((index) => (index + 1) % destructiveHits.length);
  }

  async function confirmDelete() {
    setDeleteStatus("deleting");
    setError(null);
    try {
      const response = await fetch("/api/delete-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: result.mode,
          roundNumber: result.roundNumber,
          tweetIds: selectedForDeletion.map((hit) => hit.tweet?.id).filter(Boolean),
          dryRun: true
        })
      });
      if (!response.ok) throw new Error("Delete endpoint rejected the request.");
      setDeleteStatus("done");
    } catch (requestError) {
      setDeleteStatus("error");
      setError(requestError instanceof Error ? requestError.message : "Unknown delete error");
    }
  }

  return (
    <section className="review-screen" aria-label={`Round ${result.roundNumber} review`}>
      <header className="review-header">
        <p className="kicker">Round {result.roundNumber} review</p>
        <h2>{destructiveHits.length > 0 ? `Bagged tweets ${currentIndex + 1}/${destructiveHits.length}` : "No tweets bagged"}</h2>
      </header>

      <div className="review-carousel">
        <button className="carousel-arrow" type="button" onClick={showPreviousTweet} disabled={destructiveHits.length <= 1} aria-label="Previous bagged tweet">
          &lt;
        </button>

        {currentHit && currentTweet ? (
          <article className={`carousel-tweet ${currentIsSpared ? "spared" : ""}`}>
            <div className="tweet-meta"><span>{formatDate(currentTweet.createdAt)}</span></div>
            <blockquote>{truncate(currentTweet.text, 220)}</blockquote>
            <div className="tweet-meta">
              <span>{currentTweet.likes} likes</span>
              <span>{currentTweet.reposts} reposts</span>
              <span>{currentTweet.replies} replies</span>
              <span>{currentTweet.sourceLabel}</span>
            </div>
            <button className={currentIsSpared ? "good" : "secondary"} type="button" onClick={() => toggleSpared(currentHit)}>
              {currentIsSpared ? "Spared" : "Marked for deletion"}
            </button>
          </article>
        ) : (
          <div className="carousel-empty">
            <h3>No tweets bagged</h3>
            <p>{result.mode === "C" ? "Game C is practice only. No tweets are deleted." : "No tweet targets were hit this round."}</p>
          </div>
        )}

        <button className="carousel-arrow" type="button" onClick={showNextTweet} disabled={destructiveHits.length <= 1} aria-label="Next bagged tweet">
          &gt;
        </button>
      </div>

      <div className="review-footer">
        {result.mode === "C" ? (
          <p className="notice">Game C produced score only. No destructive action is available.</p>
        ) : (
          <div className="button-row">
            <button className="danger" type="button" disabled={selectedForDeletion.length === 0 || deleteStatus === "deleting"} onClick={confirmDelete}>
              {deleteStatus === "deleting" ? "Deleting..." : `Confirm ${selectedForDeletion.length} deletes`}
            </button>
            <button className="secondary" type="button" onClick={() => setSparedIds(new Set(destructiveHits.map((hit) => hit.tweet?.id ?? hit.targetId)))}>
              Spare all
            </button>
            <button className="secondary" type="button" onClick={() => setSparedIds(new Set())}>
              Mark all
            </button>
          </div>
        )}

        {deleteStatus === "done" ? <p className="notice">Dry-run delete request accepted. Live delete remains disabled until OAuth and server validation are wired.</p> : null}
        {error ? <p className="notice">{error}</p> : null}

        <div className="button-row">
          {result.passed ? <button className="primary" type="button" onClick={onNextRound}>Next round</button> : null}
          <button className="secondary" type="button" onClick={onChangeGame}>Change game</button>
        </div>
      </div>
    </section>
  );
}
