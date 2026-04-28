import type { GameMode } from "./types";

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 720;
export const TARGETS_PER_ROUND = 10;
export const SHOTS_PER_VOLLEY = 3;
export const VOLLEY_DURATION_MS = 4700;
export const RESOLVE_DELAY_MS = 900;
export const BIRD_SCALE = 3;
export const DOG_SCALE = 3;

export function targetsPerVolley(mode: GameMode) {
  return mode === "A" ? 1 : 2;
}

export function modeLabel(mode: GameMode) {
  if (mode === "A") return "Game A: one tweet bird";
  if (mode === "B") return "Game B: two tweet birds";
  return "Game C: clay tweets, no delete";
}

export function passLineForRound(roundNumber: number) {
  if (roundNumber <= 2) return 6;
  if (roundNumber <= 5) return 7;
  if (roundNumber <= 8) return 8;
  if (roundNumber <= 12) return 9;
  return 10;
}

export function scoreForRound(roundNumber: number, targetIndex: number) {
  const base = 500 + Math.min(roundNumber - 1, 9) * 100;
  return base + (targetIndex % 3) * 200;
}
