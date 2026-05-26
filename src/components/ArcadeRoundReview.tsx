"use client";

import { useCallback, useMemo, useRef, type CSSProperties } from "react";
import chatGptBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_birdsprite_fly.png";
import chatGptGoldenBirdFlyAsset from "../../Assets/Sprites/Bird/ChatGPT Sprite/chatgpt_golden_birdsprite_fly.png";
import { ArcadeScreenCanvas } from "./ArcadeScreenCanvas";
import { truncate } from "@/game/format";
import { LANDSCAPE_LAYOUT, isPortraitLayout, type GameplayLayoutProfile } from "@/game/layout";
import { drawArcadeButton, drawArcadeModalPanel, drawArcadeModalTitle, drawPixelPanel, drawPixelText, wrapPixelText, type Rect } from "@/game/uiDraw";
import type { RoundResult } from "@/game/types";

type Props = {
  layout?: GameplayLayoutProfile;
  result: RoundResult;
  onChangeGame: () => void;
  onNextRound: () => void;
};

const REVIEW_IMAGES = { bird: chatGptBirdFlyAsset.src, goldenBird: chatGptGoldenBirdFlyAsset.src };
const BIRD_COLUMNS = 4;
const BIRD_ROWS = 3;
const PANEL: Rect = { x: 36, y: 32, width: 888, height: 656 };
const CONTENT: Rect = { x: 80, y: 132, width: 800, height: 440 };
const SUMMARY_STATS_PANEL: Rect = { x: 140, y: 280, width: 680, height: 170 };
const QUIT_BUTTON: Rect = { x: 220, y: 596, width: 180, height: 68 };
const NEXT_ROUND_BUTTON: Rect = { x: 432, y: 596, width: 308, height: 68 };
const BUTTON_TEXT_SIZE_PORTRAIT = 16;
const BUTTON_TEXT_SIZE_DESKTOP = 18;
const SUMMARY_ROUND_Y = 160;
const SUMMARY_MODE_Y = 210;
const SUMMARY_STATS_LABEL_Y = 318;
const SUMMARY_STATS_VALUE_Y = 378;

function rectStyle(rect: Rect, layout: GameplayLayoutProfile): CSSProperties {
  return {
    left: `${(rect.x / layout.width) * 100}%`,
    top: `${(rect.y / layout.height) * 100}%`,
    width: `${(rect.width / layout.width) * 100}%`,
    height: `${(rect.height / layout.height) * 100}%`
  };
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
  color = "#fff9e8",
  align: CanvasTextAlign = "left"
) {
  const lines = wrapPixelText(ctx, text, maxWidth, size);
  for (let index = 0; index < Math.min(lines.length, maxLines); index += 1) {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    drawPixelText(ctx, `${lines[index]}${suffix}`, x, y + index * lineHeight, { size, color, align });
  }
}

function drawTweetBird(
  ctx: CanvasRenderingContext2D,
  birdImage: HTMLImageElement | undefined,
  centerX: number,
  centerY: number,
  size: number,
  timeMs: number
) {
  if (!birdImage) return;

  ctx.imageSmoothingEnabled = false;
  const cellWidth = birdImage.naturalWidth / BIRD_COLUMNS;
  const cellHeight = birdImage.naturalHeight / BIRD_ROWS;
  const frameIndex = Math.floor((timeMs / 1000) * 12) % BIRD_COLUMNS;
  ctx.drawImage(
    birdImage,
    frameIndex * cellWidth,
    0,
    cellWidth,
    cellHeight,
    centerX - size / 2,
    centerY - size / 2,
    size,
    size
  );
}

function drawGoldenSummaryCard(
  ctx: CanvasRenderingContext2D,
  result: RoundResult,
  panel: Rect,
  isPortrait: boolean,
  images: Record<string, HTMLImageElement>,
  timeMs: number
) {
  const summary = result.goldenFlush;
  if (!summary) return;

  const titleSize = isPortrait ? 22 : 28;
  const subtitleSize = isPortrait ? 12 : 14;
  const valueSize = isPortrait ? 36 : 48;
  const labelSize = isPortrait ? 12 : 14;

  drawPixelText(ctx, "GOLDEN FLUSH", panel.x + panel.width / 2, panel.y + (isPortrait ? 24 : 32), {
    size: titleSize,
    color: "#f5c542",
    align: "center"
  });
  drawPixelText(ctx, "ONE-SHOT MASS DELETE", panel.x + panel.width / 2, panel.y + (isPortrait ? 50 : 64), {
    size: subtitleSize,
    color: "#fff3c4",
    align: "center"
  });

  const goldenBird = images.goldenBird;
  const birdSize = isPortrait ? 88 : 110;
  const birdCenterX = panel.x + (isPortrait ? panel.width / 2 : panel.width * 0.22);
  const birdCenterY = panel.y + (isPortrait ? 130 : 150);

  if (goldenBird) {
    ctx.imageSmoothingEnabled = false;
    const cellWidth = goldenBird.naturalWidth / BIRD_COLUMNS;
    const cellHeight = goldenBird.naturalHeight / BIRD_ROWS;
    const frameIndex = Math.floor((timeMs / 1000) * 12) % BIRD_COLUMNS;
    const driftX = Math.sin(timeMs / 420) * (isPortrait ? 8 : 14);
    const driftY = Math.cos(timeMs / 360) * (isPortrait ? 4 : 6);
    ctx.drawImage(
      goldenBird,
      frameIndex * cellWidth,
      0,
      cellWidth,
      cellHeight,
      birdCenterX - birdSize / 2 + driftX,
      birdCenterY - birdSize / 2 + driftY,
      birdSize,
      birdSize
    );
  }

  const statsCenterX = isPortrait ? panel.x + panel.width / 2 : panel.x + panel.width * 0.65;
  const statsStartY = isPortrait ? panel.y + 196 : panel.y + 90;

  drawPixelText(ctx, "TWEETS DELETED", statsCenterX, statsStartY, {
    size: labelSize,
    color: "#fff9e8",
    align: "center"
  });
  drawPixelText(ctx, String(summary.tweetsDeleted), statsCenterX, statsStartY + (isPortrait ? 38 : 46), {
    size: valueSize,
    color: "#f5c542",
    align: "center"
  });

  const bonusRow = summary.scoreFromFlush + summary.goldenDuckPoints;
  drawPixelText(
    ctx,
    `+${bonusRow.toLocaleString()} BONUS`,
    statsCenterX,
    statsStartY + (isPortrait ? 92 : 108),
    {
      size: subtitleSize,
      color: "#70e27b",
      align: "center"
    }
  );

  if (summary.failed > 0) {
    drawPixelText(
      ctx,
      `${summary.failed} delete${summary.failed === 1 ? "" : "s"} failed`,
      statsCenterX,
      statsStartY + (isPortrait ? 118 : 134),
      {
        size: subtitleSize,
        color: "#ff7676",
        align: "center"
      }
    );
  }
}

function drawTweetCreditList(
  ctx: CanvasRenderingContext2D,
  hits: RoundResult["hits"],
  content: Rect,
  timeMs: number,
  isPortrait: boolean,
  images: Record<string, HTMLImageElement>
) {
  const paddingX = isPortrait ? 24 : 56;
  const textSize = isPortrait ? 16 : 20;
  const lineHeight = isPortrait ? 29 : 34;
  const metricsSize = isPortrait ? 12 : 15;
  const metricsGap = isPortrait ? 18 : 24;
  const birdSize = isPortrait ? 44 : 56;
  const birdToTweetGap = isPortrait ? 18 : 24;
  const groupGap = isPortrait ? 64 : 84;
  const maxWidth = content.width - paddingX * 2;
  const maxLines = isPortrait ? 4 : 3;
  const x = content.x + content.width / 2;
  const align: CanvasTextAlign = "center";
  const birdCenterX = content.x + content.width / 2;
  const tweetHits = hits.filter((hit) => hit.tweet);

  const items = tweetHits.map((hit) => {
    const tweet = hit.tweet!;
    const wrapped = wrapPixelText(ctx, `"${truncate(tweet.text, isPortrait ? 190 : 220)}"`, maxWidth, textSize);
    const lines = wrapped.slice(0, maxLines);
    if (wrapped.length > maxLines && lines.length > 0) lines[lines.length - 1] = `${lines[lines.length - 1]}...`;
    const itemHeight =
      birdSize + birdToTweetGap + lines.length * lineHeight + metricsGap + metricsSize;
    return {
      lines,
      metrics: `${tweet.likes} likes  ${tweet.reposts} reposts  ${tweet.replies} replies`,
      height: itemHeight
    };
  });

  const clipInset = 10;
  const viewportTop = content.y + clipInset;
  const viewportBottom = content.y + content.height - clipInset;
  const viewportHeight = viewportBottom - viewportTop;
  const totalHeight =
    items.reduce((sum, item) => sum + item.height, 0) + Math.max(items.length - 1, 0) * groupGap;
  const scrollSpeed = isPortrait ? 0.034 : 0.045;
  const scrollMax = totalHeight;
  const scrollY = scrollMax > 0 ? Math.min(timeMs * scrollSpeed, scrollMax) : 0;
  let y = viewportBottom - scrollY;
  const scrimHeight = isPortrait ? 80 : 84;
  const panelFill = "#101018";
  const scrimFadeColor = "rgba(16, 16, 24, 0)";

  ctx.save();
  ctx.beginPath();
  ctx.rect(content.x + clipInset, content.y + clipInset, content.width - clipInset * 2, content.height - clipInset * 2);
  ctx.clip();

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    if (itemIndex > 0) y += groupGap;

    const birdCenterY = y + birdSize / 2;
    drawTweetBird(ctx, images.bird, birdCenterX, birdCenterY, birdSize, timeMs);
    y += birdSize + birdToTweetGap;

    for (let index = 0; index < item.lines.length; index += 1) {
      drawPixelText(ctx, item.lines[index], x, y + index * lineHeight, {
        size: textSize,
        color: "#fff9e8",
        align
      });
    }
    y += item.lines.length * lineHeight + metricsGap;

    drawPixelText(ctx, item.metrics, content.x + content.width / 2, y, {
      size: metricsSize,
      color: "#e79a1b",
      align
    });
    y += metricsSize;
  }

  const topGradient = ctx.createLinearGradient(0, viewportTop, 0, viewportTop + scrimHeight);
  topGradient.addColorStop(0, panelFill);
  topGradient.addColorStop(1, scrimFadeColor);
  ctx.fillStyle = topGradient;
  ctx.fillRect(content.x + clipInset, viewportTop, content.width - clipInset * 2, scrimHeight);

  const bottomGradient = ctx.createLinearGradient(0, viewportBottom - scrimHeight, 0, viewportBottom);
  bottomGradient.addColorStop(0, scrimFadeColor);
  bottomGradient.addColorStop(1, panelFill);
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(content.x + clipInset, viewportBottom - scrimHeight, content.width - clipInset * 2, scrimHeight);

  ctx.restore();
}

export function ArcadeRoundReview({ layout = LANDSCAPE_LAYOUT, result, onChangeGame, onNextRound }: Props) {
  const startTimeRef = useRef<number | null>(null);
  const destructiveHits = useMemo(() => result.hits.filter((hit) => hit.tweet && !hit.isGolden), [result.hits]);
  const nonGoldenHitCount = useMemo(() => result.hits.filter((hit) => !hit.isGolden).length, [result.hits]);
  const isClayRound = result.mode === "C";
  const isArcadeFallbackRound = !isClayRound && !result.isLiveTweetRound;
  const hasTweetReview = destructiveHits.length > 0;
  const hasGoldenFlush = Boolean(result.goldenFlush && result.goldenFlush.tweetsDeleted > 0);
  const isPortrait = isPortraitLayout(layout);
  const panel = isPortrait ? { x: 24, y: 18, width: 492, height: 900 } : PANEL;
  const portraitButtonY = panel.y + panel.height - 12 - 66 - 8;
  const portraitContentY = 94;
  const portraitContentHeight = portraitButtonY - 12 - portraitContentY;
  const content = isPortrait
    ? { x: 62, y: portraitContentY, width: 416, height: portraitContentHeight }
    : CONTENT;
  const quitButton = isPortrait ? { x: 58, y: portraitButtonY, width: 180, height: 66 } : QUIT_BUTTON;
  const nextRoundButton = isPortrait ? { x: 276, y: portraitButtonY, width: 206, height: 66 } : NEXT_ROUND_BUTTON;

  const drawFrame = useCallback(
    ({ ctx, images, timeMs }: { ctx: CanvasRenderingContext2D; images: Record<string, HTMLImageElement>; timeMs: number }) => {
      if (startTimeRef.current === null) startTimeRef.current = timeMs;
      const localTimeMs = timeMs - startTimeRef.current;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#02030a";
      ctx.fillRect(0, 0, layout.width, layout.height);
      drawArcadeModalPanel(ctx, panel, { bevel: 20 });

      const title = isClayRound
        ? "CLAY SHOOTING"
        : isArcadeFallbackRound
          ? "ARCADE SCORING"
          : destructiveHits.length > 0
            ? "TWEET REVIEW"
            : "NO TWEETS DELETED";

      if (hasGoldenFlush) {
        drawArcadeModalTitle(ctx, `ROUND ${result.roundNumber} REVIEW`, layout.width / 2, isPortrait ? 42 : 72, isPortrait ? 20 : 24);
        drawPixelText(ctx, `SCORE ${String(result.score).padStart(6, "0")}    HITS ${nonGoldenHitCount}`, layout.width / 2, isPortrait ? 64 : 104, {
          size: isPortrait ? 15 : 18,
          color: "#70e27b",
          align: "center"
        });
        drawGoldenSummaryCard(ctx, result, content, isPortrait, images, localTimeMs);
      } else if (hasTweetReview) {
        drawArcadeModalTitle(ctx, `ROUND ${result.roundNumber} REVIEW`, layout.width / 2, isPortrait ? 42 : 72, isPortrait ? 20 : 24);
        drawPixelText(ctx, `SCORE ${String(result.score).padStart(6, "0")}    HITS ${result.hits.length}`, layout.width / 2, isPortrait ? 64 : 104, {
          size: isPortrait ? 15 : 18,
          color: "#70e27b",
          align: "center"
        });
        drawPixelPanel(ctx, content, {
          fill: "#101018",
          stroke: "#2a2a34",
          lineWidth: 4
        });
        drawTweetCreditList(ctx, destructiveHits, content, localTimeMs, isPortrait, images);
      } else {
        drawArcadeModalTitle(ctx, `ROUND ${result.roundNumber} REVIEW`, layout.width / 2, isPortrait ? 210 : SUMMARY_ROUND_Y, isPortrait ? 19 : 28);
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

      const buttonTextSize = isPortrait ? BUTTON_TEXT_SIZE_PORTRAIT : BUTTON_TEXT_SIZE_DESKTOP;
      drawArcadeButton(ctx, quitButton, "QUIT", { variant: "secondary", textSize: buttonTextSize });
      drawArcadeButton(ctx, nextRoundButton, isPortrait ? "NEXT" : "NEXT ROUND", { variant: "primary", textSize: buttonTextSize });
    },
    [
      content,
      destructiveHits.length,
      destructiveHits,
      hasGoldenFlush,
      hasTweetReview,
      isArcadeFallbackRound,
      isClayRound,
      isPortrait,
      layout,
      nextRoundButton,
      nonGoldenHitCount,
      panel,
      quitButton,
      result,
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
      images={REVIEW_IMAGES}
      drawFrame={drawFrame}
    >
      <div className="review-hit-regions" aria-label={`Round ${result.roundNumber} review controls`}>
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
