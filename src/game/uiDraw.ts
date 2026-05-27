import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";

type PixelTextOptions = {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  shadow?: boolean;
};

type PanelOptions = {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  bevel?: number;
};

type ArcadeButtonOptions = {
  variant?: "primary" | "secondary";
  textSize?: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const PIXEL_FONT = "'Press Start 2P', monospace";
const ARCADE_MODAL_FILL = "rgba(5, 7, 16, 0.96)";
const ARCADE_MODAL_STROKE = "#e79a1b";
const ARCADE_MODAL_TEXT = "#fff9e8";
const ARCADE_MODAL_PRIMARY_TEXT = "#09090d";
const ARCADE_MODAL_SECONDARY_FILL = "#2a2a34";
const ARCADE_MODAL_STROKE_DARK = "#08080c";
const ARCADE_MODAL_SCRIM = "rgba(2, 4, 10, 0.78)";

export function drawFullscreenImage(ctx: CanvasRenderingContext2D, image: CanvasImageSource | null | undefined) {
  const width = ctx.canvas.width || CANVAS_WIDTH;
  const height = ctx.canvas.height || CANVAS_HEIGHT;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  if (image) {
    ctx.drawImage(image, 0, 0, width, height);
  }
}

export function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: PixelTextOptions = {}) {
  const size = options.size ?? 16;
  const color = options.color ?? "#fff9e8";

  ctx.save();
  ctx.font = `${size}px ${PIXEL_FONT}`;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = options.baseline ?? "top";

  if (options.shadow ?? true) {
    ctx.fillStyle = "#000";
    ctx.fillText(text, x + 3, y + 3);
  }

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawPixelPanel(ctx: CanvasRenderingContext2D, rect: Rect, options: PanelOptions = {}) {
  ctx.save();
  ctx.fillStyle = options.fill ?? "rgba(5, 7, 16, 0.9)";
  ctx.strokeStyle = options.stroke ?? "#e79a1b";
  ctx.lineWidth = options.lineWidth ?? 4;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

export function drawPixelBeveledPanel(ctx: CanvasRenderingContext2D, rect: Rect, options: PanelOptions = {}) {
  const bevel = Math.min(options.bevel ?? 14, rect.width / 2, rect.height / 2);
  const step = Math.max(2, Math.floor(bevel / 2));

  ctx.save();
  ctx.fillStyle = options.fill ?? "rgba(5, 7, 16, 0.9)";
  ctx.strokeStyle = options.stroke ?? "#e79a1b";
  ctx.lineWidth = options.lineWidth ?? 4;
  ctx.beginPath();
  ctx.moveTo(rect.x + bevel, rect.y);
  ctx.lineTo(rect.x + rect.width - bevel, rect.y);
  ctx.lineTo(rect.x + rect.width - bevel, rect.y + step);
  ctx.lineTo(rect.x + rect.width - step, rect.y + step);
  ctx.lineTo(rect.x + rect.width - step, rect.y + bevel);
  ctx.lineTo(rect.x + rect.width, rect.y + bevel);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height - bevel);
  ctx.lineTo(rect.x + rect.width - step, rect.y + rect.height - bevel);
  ctx.lineTo(rect.x + rect.width - step, rect.y + rect.height - step);
  ctx.lineTo(rect.x + rect.width - bevel, rect.y + rect.height - step);
  ctx.lineTo(rect.x + rect.width - bevel, rect.y + rect.height);
  ctx.lineTo(rect.x + bevel, rect.y + rect.height);
  ctx.lineTo(rect.x + bevel, rect.y + rect.height - step);
  ctx.lineTo(rect.x + step, rect.y + rect.height - step);
  ctx.lineTo(rect.x + step, rect.y + rect.height - bevel);
  ctx.lineTo(rect.x, rect.y + rect.height - bevel);
  ctx.lineTo(rect.x, rect.y + bevel);
  ctx.lineTo(rect.x + step, rect.y + bevel);
  ctx.lineTo(rect.x + step, rect.y + step);
  ctx.lineTo(rect.x + bevel, rect.y + step);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawArcadeModalScrim(ctx: CanvasRenderingContext2D, alphaFill = ARCADE_MODAL_SCRIM) {
  ctx.save();
  ctx.fillStyle = alphaFill;
  ctx.fillRect(0, 0, ctx.canvas.width || CANVAS_WIDTH, ctx.canvas.height || CANVAS_HEIGHT);
  ctx.restore();
}

export function drawArcadeModalPanel(ctx: CanvasRenderingContext2D, rect: Rect, options: PanelOptions = {}) {
  drawPixelBeveledPanel(ctx, rect, {
    fill: options.fill ?? ARCADE_MODAL_FILL,
    stroke: options.stroke ?? ARCADE_MODAL_STROKE,
    lineWidth: options.lineWidth ?? 5,
    bevel: options.bevel ?? 18
  });
}

export function drawArcadeModalTitle(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 30, color: string = ARCADE_MODAL_STROKE) {
  drawPixelText(ctx, text, x, y, {
    size,
    color,
    align: "center"
  });
}

export function drawArcadeButton(ctx: CanvasRenderingContext2D, rect: Rect, label: string, options: ArcadeButtonOptions = {}) {
  const variant = options.variant ?? "secondary";
  const isPrimary = variant === "primary";
  drawPixelPanel(ctx, rect, {
    fill: isPrimary ? ARCADE_MODAL_STROKE : ARCADE_MODAL_SECONDARY_FILL,
    stroke: ARCADE_MODAL_STROKE_DARK,
    lineWidth: 5
  });
  drawPixelText(ctx, label, rect.x + rect.width / 2, rect.y + rect.height / 2, {
    size: options.textSize ?? 16,
    color: isPrimary ? ARCADE_MODAL_PRIMARY_TEXT : ARCADE_MODAL_TEXT,
    align: "center",
    baseline: "middle",
    shadow: false
  });
}

export function drawWrappedPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options: PixelTextOptions = {}
) {
  const size = options.size ?? 16;
  const lines = wrapPixelText(ctx, text, maxWidth, size);

  for (let index = 0; index < lines.length; index += 1) {
    drawPixelText(ctx, lines[index], x, y + index * lineHeight, options);
  }

  return lines.length;
}

export function wrapPixelText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size = 16) {
  ctx.save();
  ctx.font = `${size}px ${PIXEL_FONT}`;

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);

    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
      continue;
    }

    current = "";
    let fragment = "";
    for (const char of word) {
      const candidateFragment = `${fragment}${char}`;
      if (ctx.measureText(candidateFragment).width <= maxWidth) {
        fragment = candidateFragment;
      } else {
        if (fragment) lines.push(fragment);
        fragment = char;
      }
    }
    current = fragment;
  }

  if (current) lines.push(current);
  ctx.restore();
  return lines;
}

export function pointInRect(point: { x: number; y: number }, rect: Rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}
