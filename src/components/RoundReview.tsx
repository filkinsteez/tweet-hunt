"use client";

import { useMemo, useState } from "react";
import { TARGETS_PER_ROUND } from "@/game/constants";
import { formatDate } from "@/game/format";
import type { HitRecord, RoundResult } from "@/game/types";

type Props = {
  result: RoundResult;
  onChangeGame: () => void;
  onNextRound: () => void;
};

export function RoundReview({ result, onChangeGame, onNextRound }: Props) {
  const [sparedIds, setSparedIds] = useState<Set<string>>(new Set());
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const destructiveHits = result.hits.filter((hit) => hit.tweet);
  const selectedForDeletion = useMemo(
    () => destructiveHits.filter((hit) => !sparedIds.has(hit.tweet?.id ?? hit.targetId)),
    [destructiveHits, sparedIds]
  );

  function toggleSpared(hit: HitRecord) {
    const id = hit.tweet?.id ?? hit.targetId;
    setSparedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const escapedTweets = result.escapes.filter((escape) => escape.tweet);

  return (
    <div className="grid">
      <section className="arcade-card">
        <p className="kicker">Round {result.roundNumber} review</p>
        <h2>{result.passed ? "Round clear" : "Game over"}</h2>
        <p className="muted">
          Hits are only bagged until this screen. Nothing from Game A or Game B is sent to deletion until you confirm here. Game C is always non-destructive.
        </p>

        <ul className="stat-list">
          <li><span>Mode</span><strong>Game {result.mode}</strong></li>
          <li><span>Targets</span><strong>{result.targetsPresented}/{TARGETS_PER_ROUND}</strong></li>
          <li><span>Hits</span><strong>{result.hits.length}</strong></li>
          <li><span>Escaped</span><strong>{result.escapes.length}</strong></li>
          <li><span>Pass line</span><strong>{result.passLine}</strong></li>
          <li><span>Score</span><strong>{result.score}</strong></li>
          <li><span>Bagged for deletion</span><strong>{selectedForDeletion.length}</strong></li>
        </ul>

        {result.mode === "C" ? (
          <div className="notice">
            Game C produced score only. No tweets were mapped to targets and no destructive action is available.
          </div>
        ) : (
          <div className="button-row" style={{ marginTop: 18 }}>
            <button className="danger" type="button" disabled={selectedForDeletion.length === 0 || deleteStatus === "deleting"} onClick={confirmDelete}>
              {deleteStatus === "deleting" ? "Deleting..." : `Confirm ${selectedForDeletion.length} deletes`}
            </button>
            <button className="secondary" type="button" onClick={() => setSparedIds(new Set(destructiveHits.map((hit) => hit.tweet?.id ?? hit.targetId)))}>
              Spare all
            </button>
            <button className="secondary" type="button" onClick={() => setSparedIds(new Set())}>
              Mark all for deletion
            </button>
          </div>
        )}

        {deleteStatus === "done" ? <p className="notice">Dry-run delete request accepted. Live delete remains disabled until OAuth and server validation are wired.</p> : null}
        {error ? <p className="notice">{error}</p> : null}

        <div className="button-row" style={{ marginTop: 18 }}>
          {result.passed ? <button className="primary" type="button" onClick={onNextRound}>Next round</button> : null}
          <button className="secondary" type="button" onClick={onChangeGame}>Change game</button>
        </div>
      </section>

      <aside className="side-panel">
        <section className="arcade-card">
          <h3>Bagged tweets</h3>
          {destructiveHits.length === 0 ? <p className="muted">No tweet targets were hit.</p> : null}
          <div className="review-grid">
            {destructiveHits.map((hit) => {
              const tweet = hit.tweet;
              if (!tweet) return null;
              const spared = sparedIds.has(tweet.id);
              return (
                <article key={`${hit.targetId}_${hit.hitOrder}`} className={`tweet-card ${spared ? "spared" : ""}`}>
                  <div className="tweet-meta">
                    <span>#{hit.hitOrder}</span>
                    <span>{formatDate(tweet.createdAt)}</span>
                    <span>+{hit.points}</span>
                  </div>
                  <blockquote>{tweet.text}</blockquote>
                  <div className="tweet-meta">
                    <span>{tweet.likes} likes</span>
                    <span>{tweet.reposts} reposts</span>
                    <span>{tweet.replies} replies</span>
                    <span>{tweet.sourceLabel}</span>
                  </div>
                  <button className={spared ? "good" : "secondary"} type="button" onClick={() => toggleSpared(hit)}>
                    {spared ? "Spared" : "Marked for deletion"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {escapedTweets.length > 0 ? (
          <section className="arcade-card">
            <h3>Escaped tweets</h3>
            <p className="muted">Missed tweet birds survive this round. They can come back in a later hunt.</p>
            <div className="review-grid">
              {escapedTweets.map((escape) => escape.tweet ? (
                <article key={escape.targetId} className="tweet-card spared">
                  <div className="tweet-meta"><span>{formatDate(escape.tweet.createdAt)}</span><span>escaped</span></div>
                  <blockquote>{escape.tweet.text}</blockquote>
                </article>
              ) : null)}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
