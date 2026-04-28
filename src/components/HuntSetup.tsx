"use client";

import type { HuntConfig, HuntSource } from "@/game/types";

type Props = {
  config: HuntConfig;
  onChange: (config: HuntConfig) => void;
};

const sources: Array<{ value: HuntSource; label: string }> = [
  { value: "random", label: "Random from mock timeline" },
  { value: "year", label: "Specific year" },
  { value: "keyword", label: "Keyword hunt" },
  { value: "replies", label: "Replies" },
  { value: "low_engagement", label: "Low engagement" },
  { value: "high_visibility", label: "High visibility" }
];

export function HuntSetup({ config, onChange }: Props) {
  const destructive = config.mode !== "C";

  return (
    <div className="arcade-card">
      <p className="kicker">Hunt setup</p>
      <h2>Choose the flock</h2>
      <p className="muted">
        Filters happen before the round starts. During play, the cabinet stays clean: aim, shoot, review after the bell.
      </p>

      <div className="field-row">
        <label htmlFor="source">Tweet source</label>
        <select
          id="source"
          value={config.source}
          onChange={(event) => onChange({ ...config, source: event.target.value as HuntSource })}
          disabled={!destructive}
        >
          {sources.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>
      </div>

      {config.source === "year" && destructive ? (
        <div className="field-row">
          <label htmlFor="year">Year</label>
          <select id="year" value={config.year ?? "2019"} onChange={(event) => onChange({ ...config, year: event.target.value })}>
            {Array.from({ length: 11 }, (_, index) => String(2014 + index)).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {config.source === "keyword" && destructive ? (
        <div className="field-row">
          <label htmlFor="keyword">Keyword</label>
          <input
            id="keyword"
            value={config.keyword ?? ""}
            placeholder="crypto, founder, reply, delete..."
            onChange={(event) => onChange({ ...config, keyword: event.target.value })}
          />
        </div>
      ) : null}

      {!destructive ? (
        <div className="notice">
          Game C ignores tweet filters and spawns clay targets only. It is safe to play without account access.
        </div>
      ) : null}
    </div>
  );
}
