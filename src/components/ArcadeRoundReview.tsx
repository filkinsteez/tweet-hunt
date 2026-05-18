"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArcadeScreenCanvas } from "./ArcadeScreenCanvas";
import { truncate } from "@/game/format";
import { LANDSCAPE_LAYOUT, isPortraitLayout, type GameplayLayoutProfile } from "@/game/layout";
import { drawPixelBeveledPanel, drawPixelPanel, drawPixelText, wrapPixelText, type Rect } from "@/game/uiDraw";
import type { RoundResult } from "@/game/types";

type Props = {
  layout?: GameplayLayoutProfile;
  result: RoundResult;
  onChangeGame: () => void;
  onNextRound: () => void;
};

const EMPTY_IMAGES = {};
const PANEL: Rect = { x: 56, y: 42, width: 848, height: 636 };
const CONTENT: Rect = { x: 128, y: 196, width: 704, height: 300 };
const SUMMARY_STATS_PANEL: Rect = { x: 150, y: 284, width: 660, height: 162 };
const PREV_BUTTON: Rect = { x: 70, y: 306, width: 56, height: 80 };
const NEXT_BUTTON: Rect = { x: 834, y: 306, width: 56, height: 80 };
const QUIT_BUTTON: Rect = { x: 190, y: 542, width: 190, height: 64 };
const NEXT_ROUND_BUTTON: Rect = { x: 430, y: 542, width: 340, height: 64 };
const BUTTON_TEXT_SIZE = 16;
const SUMMARY_ROUND_Y = 160;
const SUMMARY_MODE_Y = 210;
const SUMMARY_STATS_LABEL_Y = 320;
const SUMMARY_STATS_VALUE_Y = 376;

function rectStyle(rect: Rect, layout: GameplayLayoutProfile): CSSProperties {
  return {
    left: `${(rect.x / layout.width) * 100}%`,
    top: `${(rect.y / layout.height) * 100}%`,
    width: `${(rect.width / layout.width) * 100}%`,
    height: `${(rect.height / layout.height) * 100}%`
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

export function ArcadeRoundReview({ layout = LANDSCAPE_LAYOUT, result, onChangeGame, onNextRound }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const destructiveHits = useMemo(() => result.hits.filter((hit) => hit.tweet), [result.hits]);
  const isClayRound = result.mode === "C";
  const isArcadeFallbackRound = !isClayRound && !result.isLiveTweetRound;
  const currentHit = destructiveHits[currentIndex] ?? null;
  const currentTweet = currentHit?.tweet;
  const hasTweetReview = Boolean(currentHit && currentTweet);
  const isPortrait = isPortraitLayout(layout);
  const panel = isPortrait ? { x: 24, y: 42, width: 492, height: 876 } : PANEL;
  const content = isPortrait ? { x: 62, y: 250, width: 416, height: 382 } : CONTENT;
  const previousButton = isPortrait ? { x: 26, y: 656, width: 72, height: 72 } : PREV_BUTTON;
  const nextButton = isPortrait ? { x: 442, y: 656, width: 72, height: 72 } : NEXT_BUTTON;
  const quitButton = isPortrait ? { x: 58, y: 800, width: 180, height: 66 } : QUIT_BUTTON;
  const nextRoundButton = isPortrait ? { x: 276, y: 800, width: 206, height: 66 } : NEXT_ROUND_BUTTON;

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
      ctx.fillRect(0, 0, layout.width, layout.height);
      drawPixelBeveledPanel(ctx, panel, {
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
            ? "TWEET REVIEW"
            : "NO TWEETS DELETED";

      if (hasTweetReview && currentHit && currentTweet) {
        drawPixelText(ctx, `ROUND ${result.roundNumber} REVIEW`, layout.width / 2, isPortrait ? 118 : 104, {
          size: isPortrait ? 20 : 22,
          color: "#e79a1b",
          align: "center"
        });
        drawPixelText(ctx, `SCORE ${String(result.score).padStart(6, "0")}    HITS ${result.hits.length}`, layout.width / 2, isPortrait ? 174 : 148, {
          size: isPortrait ? 15 : 19,
          color: "#70e27b",
          align: "center"
        });
        drawPixelPanel(ctx, content, {
          fill: "#101018",
          stroke: "#2a2a34",
          lineWidth: 4
        });
        drawLimitedText(ctx, `"${truncate(currentTweet.text, 220)}"`, content.x + 24, content.y + 34, content.width - 48, isPortrait ? 35 : 40, isPortrait ? 7 : 5, isPortrait ? 19 : 22);
        drawPixelText(ctx, `${currentTweet.likes} likes  ${currentTweet.reposts} reposts  ${currentTweet.replies} replies`, content.x + 24, content.y + content.height - 34, {
          size: isPortrait ? 14 : 16,
          color: "#e79a1b"
        });
      } else {
        drawPixelText(ctx, `ROUND ${result.roundNumber} REVIEW`, layout.width / 2, isPortrait ? 210 : SUMMARY_ROUND_Y, {
          size: isPortrait ? 19 : 28,
          color: "#e79a1b",
          align: "center"
        });
        drawPixelText(ctx, title, layout.width / 2, isPortrait ? 270 : SUMMARY_MODE_Y, {
          size: isPortrait ? 14 : 18,
          color: "#fff9e8",
          align: "center"
        });
        const statsPanel = isPortrait ? { x: 58, y: 360, width: 424, height: 176 } : SUMMARY_STATS_PANEL;
        drawPixelPanel(ctx, statsPanel, {
          fill: "#101018",
          stroke: "#2a2a34",
          lineWidth: 4
        });
        const scoreCenterX = statsPanel.x + statsPanel.width * 0.3;
        const hitsCenterX = statsPanel.x + statsPanel.width * 0.75;
        drawPixelText(ctx, "SCORE", scoreCenterX, isPortrait ? 398 : SUMMARY_STATS_LABEL_Y, {
          size: isPortrait ? 14 : 18,
          color: "#70e27b",
          align: "center",
          shadow: false
        });
        drawPixelText(ctx, String(result.score).padStart(6, "0"), scoreCenterX, isPortrait ? 462 : SUMMARY_STATS_VALUE_Y, {
          size: isPortrait ? 24 : 42,
          color: "#70e27b",
          align: "center",
          shadow: false
        });
        drawPixelText(ctx, "HITS", hitsCenterX, isPortrait ? 398 : SUMMARY_STATS_LABEL_Y, {
          size: isPortrait ? 14 : 18,
          color: "#70e27b",
          align: "center",
          shadow: false
        });
        drawPixelText(ctx, String(result.hits.length), hitsCenterX, isPortrait ? 462 : SUMMARY_STATS_VALUE_Y, {
          size: isPortrait ? 30 : 42,
          color: "#70e27b",
          align: "center",
          shadow: false
        });
      }

      if (destructiveHits.length > 1) {
        drawPixelText(ctx, "<", previousButton.x + previousButton.width / 2, previousButton.y + 18, {
          size: 36,
          color: "#e79a1b",
          align: "center"
        });
        drawPixelText(ctx, ">", nextButton.x + nextButton.width / 2, nextButton.y + 18, {
          size: 36,
          color: "#e79a1b",
          align: "center"
        });
      }

      drawButton(ctx, quitButton, "QUIT");
      drawButton(ctx, nextRoundButton, isPortrait ? "NEXT" : "NEXT ROUND", true);
    },
    [
      currentHit,
      currentTweet,
      destructiveHits.length,
      hasTweetReview,
      isArcadeFallbackRound,
      isClayRound,
      isPortrait,
      layout,
      nextButton,
      nextRoundButton,
      panel,
      previousButton,
      quitButton,
      result.hits.length,
      result.roundNumber,
      result.score
    ]
  );

  return (
    <ArcadeScreenCanvas
      className="review-crt"
      presentation="crisp"
      layout={layout}
      ariaLabel={`Round ${result.roundNumber} review`}
      images={EMPTY_IMAGES}
      drawFrame={drawFrame}
    >
      <div className="review-hit-regions" aria-label={`Round ${result.roundNumber} review controls`}>
        {destructiveHits.length > 1 ? (
          <>
            <button className="review-hit-button" type="button" style={rectStyle(previousButton, layout)} onClick={showPreviousTweet} aria-label="Previous bagged tweet">
              Previous
            </button>
            <button className="review-hit-button" type="button" style={rectStyle(nextButton, layout)} onClick={showNextTweet} aria-label="Next bagged tweet">
              Next
            </button>
          </>
        ) : null}
        <button className="review-hit-button" type="button" style={rectStyle(quitButton, layout)} onClick={onChangeGame}>
          Quit
        </button>
        <button className="review-hit-button" type="button" style={rectStyle(nextRoundButton, layout)} onClick={onNextRound}>
          Next round
        </button>
      </div>
    </ArcadeScreenCanvas>
  );
}
