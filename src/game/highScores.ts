import type { GameMode } from "@/game/types";

const HIGH_SCORES_STORAGE_KEY = "tweet-hunt.high-scores.v1";

function emptyScores(): Record<GameMode, number> {
  return { A: 0, B: 0, C: 0 };
}

export function loadHighScores(): Record<GameMode, number> {
  if (typeof window === "undefined") return emptyScores();
  try {
    const raw = window.localStorage.getItem(HIGH_SCORES_STORAGE_KEY);
    if (!raw) return emptyScores();
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return emptyScores();
    const next = emptyScores();
    for (const mode of ["A", "B", "C"] as const) {
      const v = (parsed as Partial<Record<GameMode, unknown>>)[mode];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        next[mode] = Math.floor(v);
      }
    }
    return next;
  } catch {
    return emptyScores();
  }
}

export function saveHighScores(scores: Record<GameMode, number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // quota or private mode
  }
}

export function mergeBestScore(
  mode: GameMode,
  score: number
): { next: Record<GameMode, number>; isNewBest: boolean } {
  const current = loadHighScores();
  const candidate = Math.max(0, Math.floor(score));
  const previous = current[mode];
  if (candidate <= previous) {
    return { next: current, isNewBest: false };
  }
  const next = { ...current, [mode]: candidate };
  saveHighScores(next);
  return { next, isNewBest: true };
}
