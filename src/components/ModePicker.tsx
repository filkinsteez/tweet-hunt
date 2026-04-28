"use client";

import type { GameMode } from "@/game/types";

const modes: Array<{ mode: GameMode; title: string; body: string; destructive: string }> = [
  {
    mode: "A",
    title: "Game A",
    body: "One tweet bird at a time. Three shots. Hit marks the tweet for round review.",
    destructive: "Destructive after review"
  },
  {
    mode: "B",
    title: "Game B",
    body: "Two tweet birds at a time. Three shots total for both targets.",
    destructive: "Destructive after review"
  },
  {
    mode: "C",
    title: "Game C",
    body: "Clay tweets only. Practice, score, and rhythm. Nothing can be deleted here.",
    destructive: "Non-destructive"
  }
];

export function ModePicker({ selected, onSelect }: { selected: GameMode; onSelect: (mode: GameMode) => void }) {
  return (
    <div className="mode-grid">
      {modes.map((item) => (
        <button
          key={item.mode}
          type="button"
          className="mode-button"
          aria-pressed={selected === item.mode}
          onClick={() => onSelect(item.mode)}
        >
          <strong>{item.title}</strong>
          <span>{item.body}</span>
          <p className="muted">{item.destructive}</p>
        </button>
      ))}
    </div>
  );
}
