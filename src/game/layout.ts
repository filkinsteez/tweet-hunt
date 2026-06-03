import { CANVAS_HEIGHT, CANVAS_WIDTH, DOG_RETRIEVE_TRIGGER_Y } from "./constants";
import type { Rect } from "./uiDraw";

export type GameplayOrientation = "landscape" | "portrait";

export type GameplayLayoutProfile = {
  id: GameplayOrientation;
  width: number;
  height: number;
  className: string;
  playBounds: Rect;
  groundY: number;
  hud: {
    round: { x: number; y: number };
    shots: { x: number; y: number };
    hit: { x: number; y: number };
    score: { x: number; y: number };
  };
  microRevealPanel: Rect;
  pausePanel: Rect;
  pauseQuitButton: Rect;
  pauseResumeButton: Rect;
  duckCallButton: Rect;
  goldenFlushPanel: Rect;
  dogRetrieveTriggerY: number;
  dogSafeX: { min: number; max: number };
  tuning: {
    birdLaunchY: number;
    birdFlightTopY: number;
    birdFlightBottomY: number;
    birdHorizontalPadding: number;
    birdBaseVx: number;
    birdBaseVy: number;
    birdSpeedJitter: number;
    birdFlyAwayVy: number;
    clayLaunchY: number;
    clayBaseVx: number;
    clayBaseVy: number;
    clayGravity: number;
    touchHitRadius: number;
    clayHitRadius: number;
    targetScale: number;
  };
};

export const LANDSCAPE_LAYOUT: GameplayLayoutProfile = {
  id: "landscape",
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  className: "layout-landscape",
  playBounds: { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  groundY: CANVAS_HEIGHT - 132,
  hud: {
    round: { x: 35, y: CANVAS_HEIGHT - 132 },
    shots: { x: 41, y: CANVAS_HEIGHT - 92 },
    hit: { x: 198, y: CANVAS_HEIGHT - 92 },
    score: { x: 707, y: CANVAS_HEIGHT - 92 }
  },
  microRevealPanel: { x: 72, y: 18, width: 816, height: 146 },
  pausePanel: { x: 236, y: 178, width: 488, height: 332 },
  pauseQuitButton: { x: 292, y: 415, width: 168, height: 56 },
  pauseResumeButton: { x: 500, y: 415, width: 168, height: 56 },
  duckCallButton: { x: 460, y: CANVAS_HEIGHT - 92, width: 140, height: 58 },
  goldenFlushPanel: { x: 72, y: 180, width: 816, height: 132 },
  dogRetrieveTriggerY: DOG_RETRIEVE_TRIGGER_Y,
  dogSafeX: { min: 90, max: CANVAS_WIDTH - 90 },
  tuning: {
    birdLaunchY: CANVAS_HEIGHT - 200,
    birdFlightTopY: 96,
    birdFlightBottomY: CANVAS_HEIGHT - 210,
    birdHorizontalPadding: 52,
    birdBaseVx: 120,
    birdBaseVy: -150,
    birdSpeedJitter: 64,
    birdFlyAwayVy: -280,
    clayLaunchY: CANVAS_HEIGHT - 170,
    clayBaseVx: 145,
    clayBaseVy: -430,
    clayGravity: 260,
    touchHitRadius: 42,
    clayHitRadius: 34,
    targetScale: 1
  }
};

export const PORTRAIT_LAYOUT: GameplayLayoutProfile = {
  id: "portrait",
  width: 540,
  height: 960,
  className: "layout-portrait",
  playBounds: { x: 0, y: 96, width: 540, height: 760 },
  groundY: 800,
  hud: {
    round: { x: 231, y: 38 },
    shots: { x: 26, y: 870 },
    hit: { x: 152, y: 870 },
    score: { x: 352, y: 24 }
  },
  microRevealPanel: { x: 10, y: 8, width: 520, height: 170 },
  pausePanel: { x: 46, y: 282, width: 448, height: 330 },
  pauseQuitButton: { x: 86, y: 513, width: 154, height: 58 },
  pauseResumeButton: { x: 290, y: 513, width: 164, height: 58 },
  duckCallButton: { x: 412, y: 718, width: 116, height: 88 },
  goldenFlushPanel: { x: 18, y: 188, width: 504, height: 230 },
  dogRetrieveTriggerY: 710,
  dogSafeX: { min: 72, max: 468 },
  tuning: {
    birdLaunchY: 735,
    birdFlightTopY: 150,
    birdFlightBottomY: 720,
    birdHorizontalPadding: 62,
    birdBaseVx: 76,
    birdBaseVy: -245,
    birdSpeedJitter: 42,
    birdFlyAwayVy: -335,
    clayLaunchY: 760,
    clayBaseVx: 108,
    clayBaseVy: -640,
    clayGravity: 345,
    touchHitRadius: 56,
    clayHitRadius: 44,
    targetScale: 0.9
  }
};

export const GAMEPLAY_LAYOUTS = {
  landscape: LANDSCAPE_LAYOUT,
  portrait: PORTRAIT_LAYOUT
} as const;

export function isPortraitLayout(layout: GameplayLayoutProfile) {
  return layout.id === "portrait";
}
