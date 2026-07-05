import type { GameMode } from "./types";

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 720;
export const PORTRAIT_FRAME_INTERVAL_MS = 1000 / 30;
/* Half a 120Hz frame of tolerance; without it vsync timestamp jitter makes the
   30fps throttle skip an extra frame and land at 20-24fps instead of a stable 30. */
export const PORTRAIT_FRAME_TOLERANCE_MS = 4;
export const TARGETS_PER_ROUND = 10;
export const SHOTS_PER_VOLLEY = 3;
export const DOG_INTRO_WALK_MS = 5500;
export const DOG_INTRO_FOUND_MS = 500;
export const DOG_INTRO_JUMP_MS = 920;
export const DOG_INTRO_JUMP_START_MS = DOG_INTRO_WALK_MS + DOG_INTRO_FOUND_MS;
export const ROUND_INTRO_DURATION_MS = DOG_INTRO_JUMP_START_MS + DOG_INTRO_JUMP_MS;
export const CLAY_SHOOTING_INTRO_DURATION_MS = 5240;
export const VOLLEY_DURATION_MS = 4700;
export const RESOLVE_DELAY_MS = 2600;
export const HIT_REACTION_DURATION_MS = 320;
export const DOG_POP_DELAY_MS = 1000;
export const DOG_RETRIEVE_TRIGGER_Y = CANVAS_HEIGHT - 245;
export const DOG_RETRIEVE_PAUSE_MS = 150;
export const DOG_RISE_DURATION_MS = 350;
export const DOG_HOLD_DURATION_MS = 700;
export const DOG_LOWER_DURATION_MS = 350;
export const BIRD_SCALE = 3;
export const DOG_SCALE = 3;
export const MAX_GOLDEN_DUCKS_PER_ROUND = 1;
export const DUCK_CALL_SUMMON_DELAY_MIN_MS = 700;
export const DUCK_CALL_SUMMON_DELAY_MAX_MS = 1400;
export const GOLDEN_DUCK_VISIBLE_MS = 1800;
export const GOLDEN_DUCK_SPEED_MULTIPLIER = 1.65;
export const GOLDEN_DUCK_POINTS = 5000;

export function targetsPerVolley(mode: GameMode) {
  return mode === "C" ? 2 : 1;
}

export function modeLabel(mode: GameMode) {
  if (mode === "A") return "Game A: real tweet bird";
  if (mode === "B") return "Game B: fake tweet bird";
  return "Game C: clay tweets, no delete";
}

export function passLineForRound(roundNumber: number) {
  if (roundNumber <= 10) return 6;
  if (roundNumber <= 12) return 7;
  if (roundNumber <= 14) return 8;
  if (roundNumber <= 19) return 9;
  return 10;
}

export function scoreForRound(roundNumber: number, targetIndex: number) {
  const scoreByColor = roundNumber <= 5 ? [500, 1000, 1500] : roundNumber <= 10 ? [800, 1600, 2400] : [1000, 2000, 3000];
  return scoreByColor[targetIndex % scoreByColor.length];
}
