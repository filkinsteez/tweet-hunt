"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArcadeScreenCanvas } from "./ArcadeScreenCanvas";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/game/constants";
import { totalTweetEngagement } from "@/game/engagement";
import { formatDate, truncate } from "@/game/format";
import { drawPixelBeveledPanel, drawPixelPanel, drawPixelText, wrapPixelText, type Rect } from "@/game/uiDraw";
import type { RoundResult } from "@/game/types";

type Props = {
  result: RoundResult;
  onChangeGame: () => void;
  onNextRound: () => void;
};

const EMPTY_IMAGES = {};
const PANEL: Rect = { x: 56, y: 42, width: 848, height: 636 };
const CONTENT: Rect = { x: 112, y: 170, width: 736, height: 300 };
const SUMMARY_STATS_PANEL: Rect = { x: 150, y: 284, width: 660, height: 162 };
const PREV_BUTTON: Rect = { x: 72, y: 276, width: 56, height: 80 };
const NEXT_BUTTON: Rect = { x: 832, y: 276, width: 56, height: 80 };
const QUIT_BUTTON: Rect = { x: 190, y: 520, width: 190, height: 64 };
const NEXT_ROUND_BUTTON: Rect = { x: 430, y: 520, width: 340, height: 64 };
const BUTTON_TEXT_SIZE = 16;
const SUMMARY_ROUND_Y = 160;
const SUMMARY_MODE_Y = 210;
const SUMMARY_STATS_LABEL_Y = 320;
const SUMMARY_STATS_VALUE_Y = 376;

function rectStyle(rect: Rect): CSSProperties {
  return {
    left: `${(rect.x / CANVAS_WIDTH) * 100}%`,
    top: `${(rect.y / CANVAS_HEIGHT) * 100}%`,
    width: `${(rect.width / CANVAS_WIDTH) * 100}%`,
    height: `${(rect.height / CANVAS_HEIGHT) * 100}%`
  };
}

function drawButton(ctx: CanvasRenderingContext2D, rect: Rect, label: string, primary = false) {
  drawPixelPanel(ctx, rect, {
    fill: primary ? "#e79a1b" : "#2a2a34",
    stroke: "#08080c",
    lineWidth: 5
  });
  drawPixelText(ctx, label, rect.x + rect.width / 2, rect.y + rect.height / 2, {
    size: BUTTON_TEXT_SIZE,
    color: primary ? "#09090d" : "#fff9e8",
    align: "center",
    baseline: "middle",
    shadow: false
  });
}

function drawLimitedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  size: number,
  color = "#fff9e8"
) {
  const lines = wrapPixelText(ctx, text, maxWidth, size);
  for (let index = 0; index < Math.min(lines.length, maxLines); index += 1) {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    drawPixelText(ctx, `${lines[index]}${suffix}`, x, y + index * lineHeight, { size, color });
  }
}

export function ArcadeRoundReview({ result, onChangeGame, onNextRound }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const destructiveHits = useMemo(() => result.hits.filter((hit) => hit.tweet), [result.hits]);
  const isClayRound = result.mode === "C";
  const isArcadeFallbackRound = !isClayRound && !result.isLiveTweetRound;
  const isPartialLiveRound = result.isLiveTweetRound && result.targetLimit < 10;
  const currentHit = destructiveHits[currentIndex] ?? null;
  const currentTweet = currentHit?.tweet;
  const currentEngagement = currentTweet ? totalTweetEngagement(currentTweet) : 0;
  const showNextRound = result.passed || destructiveHits.length === 0 || isPartialLiveRound;
  const hasTweetReview = Boolean(currentHit && currentTweet);

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(destructiveHits.length - 1, 0)));
  }, [destructiveHits.length]);

  const showPreviousTweet = useCallback(() => {
    if (destructiveHits.length === 0) return;
    setCurrentIndex((index) => (index + destructiveHits.length - 1) % destructiveHits.length);
  }, [destructiveHits.length]);

  const showNextTweet = useCallback(() => {
    if (destructiveHits.length === 0) return;
    setCurrentIndex((index) => (index + 1) % destructiveHits.length);
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
  }, [showNextTweet, showPreviousTweet]);

  const drawFrame = useCallback(
    ({ ctx }: { ctx: CanvasRenderingContext2D }) => {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#02030a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawPixelBeveledPanel(ctx, PANEL, {
        fill: "rgba(5, 7, 16, 0.96)",
        stroke: "#e79a1b",
        lineWidth: 5,
        bevel: 20
      });

      const title = isClayRound
        ? "CLAY SHOOTING"
        : isArcadeFallbackRound
          ? "ARCADE SCORING"
          : destructiveHits.length > 0
            ? `DELETED TWEETS ${currentIndex + 1}/${destructiveHits.length}`
            : "NO TWEETS DELETED";

      if (hasTweetReview && currentHit && currentTweet) {
        drawPixelText(ctx, `ROUND ${result.roundNumber} REVIEW`, CANVAS_WIDTH / 2, 74, {
          size: 18,
          color: "#e79a1b",
          align: "center"
        });
        drawPixelText(ctx, title, CANVAS_WIDTH / 2, 112, {
          size: 20,
          color: "#fff9e8",
          align: "center"
        });
        drawPixelText(ctx, `SCORE ${String(result.score).padStart(6, "0")}    HITS ${result.hits.length}`, CANVAS_WIDTH / 2, 148, {
          size: 16,
          color: "#70e27b",
          align: "center"
        });
        drawPixelBeveledPanel(ctx, CONTENT, {
          fill: "#101018",
          stroke: "#2a2a34",
          lineWidth: 4,
          bevel: 12
        });
        drawPixelText(ctx, formatDate(currentTweet.createdAt), CONTENT.x + 28, CONTENT.y + 26, {
          size: 11,
          color: "#e79a1b"
        });
        drawLimitedText(ctx, `"${truncate(currentTweet.text, 220)}"`, CONTENT.x + 28, CONTENT.y + 70, CONTENT.width - 56, 28, 6, 16);
        drawPixelText(ctx, `${currentEngagement} engagement`, CONTENT.x + 28, CONTENT.y + CONTENT.height - 58, {
          size: 11,
          color: "#e79a1b"
        });
        drawPixelText(ctx, `${currentTweet.likes} likes  ${currentTweet.reposts} reposts  ${currentTweet.replies} replies`, CONTENT.x + 28, CONTENT.y + CONTENT.height - 34, {
          size: 10,
          color: "#e79a1b"
        });
        if (currentHit.deleteStatus) {
          drawPixelText(ctx, currentHit.deleteStatus.toUpperCase(), CONTENT.x + CONTENT.width - 28, CONTENT.y + CONTENT.height - 58, {
            size: 11,
            color: currentHit.deleteStatus === "deleted" ? "#70e27b" : "#ff5c51",
            align: "right"
          });
        }
      } else {
        drawPixelText(ctx, `ROUND ${result.roundNumber} REVIEW`, CANVAS_WIDTH / 2, SUMMARY_ROUND_Y, {
          size: 28,
          color: "#e79a1b",
          align: "center"
        });
        drawPixelText(ctx, title, CANVAS_WIDTH / 2, SUMMARY_MODE_Y, {
          size: 18,
          color: "#fff9e8",
          align: "center"
        });
        drawPixelPanel(ctx, SUMMARY_STATS_PANEL, {
          fill: "#101018",
          stroke: "#2a2a34",
          lineWidth: 4
        });
        const scoreCenterX = SUMMARY_STATS_PANEL.x + SUMMARY_STATS_PANEL.width * 0.3;
        const hitsCenterX = SUMMARY_STATS_PANEL.x + SUMMARY_STATS_PANEL.width * 0.75;
        drawPixelText(ctx, "SCORE", scoreCenterX, SUMMARY_STATS_LABEL_Y, {
          size: 18,
          color: "#70e27b",
          align: "center",
          shadow: false
        });
        drawPixelText(ctx, String(result.score).padStart(6, "0"), scoreCenterX, SUMMARY_STATS_VALUE_Y, {
          size: 42,
          color: "#70e27b",
          align: "center",
          shadow: false
        });
        drawPixelText(ctx, "HITS", hitsCenterX, SUMMARY_STATS_LABEL_Y, {
          size: 18,
          color: "#70e27b",
          align: "center",
          shadow: false
        });
        drawPixelText(ctx, String(result.hits.length), hitsCenterX, SUMMARY_STATS_VALUE_Y, {
          size: 42,
          color: "#70e27b",
          align: "center",
          shadow: false
        });
      }

      if (destructiveHits.length > 1) {
        drawPixelText(ctx, "<", PREV_BUTTON.x + PREV_BUTTON.width / 2, PREV_BUTTON.y + 22, {
          size: 36,
          color: "#e79a1b",
          align: "center"
        });
        drawPixelText(ctx, ">", NEXT_BUTTON.x + NEXT_BUTTON.width / 2, NEXT_BUTTON.y + 22, {
          size: 36,
          color: "#e79a1b",
          align: "center"
        });
      }

      drawButton(ctx, QUIT_BUTTON, "QUIT");
      if (showNextRound) {
        drawButton(ctx, NEXT_ROUND_BUTTON, "NEXT ROUND", true);
      }
    },
    [
      currentEngagement,
      currentHit,
      currentIndex,
      currentTweet,
      destructiveHits.length,
      hasTweetReview,
      isArcadeFallbackRound,
      isClayRound,
      result.hits.length,
      result.roundNumber,
      result.score,
      showNextRound
    ]
  );

  return (
    <ArcadeScreenCanvas
      className="review-crt"
      presentation="crisp"
      ariaLabel={`Round ${result.roundNumber} review`}
      images={EMPTY_IMAGES}
      drawFrame={drawFrame}
    >
      <div className="review-hit-regions" aria-label={`Round ${result.roundNumber} review controls`}>
        {destructiveHits.length > 1 ? (
          <>
            <button className="review-hit-button" type="button" style={rectStyle(PREV_BUTTON)} onClick={showPreviousTweet} aria-label="Previous bagged tweet">
              Previous
            </button>
            <button className="review-hit-button" type="button" style={rectStyle(NEXT_BUTTON)} onClick={showNextTweet} aria-label="Next bagged tweet">
              Next
            </button>
          </>
        ) : null}
        <button className="review-hit-button" type="button" style={rectStyle(QUIT_BUTTON)} onClick={onChangeGame}>
          Quit
        </button>
        {showNextRound ? (
          <button className="review-hit-button" type="button" style={rectStyle(NEXT_ROUND_BUTTON)} onClick={onNextRound}>
            Next round
          </button>
        ) : null}
      </div>
    </ArcadeScreenCanvas>
  );
}
