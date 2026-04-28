export type GameMode = "A" | "B" | "C";

export type HuntSource =
  | "random"
  | "year"
  | "keyword"
  | "replies"
  | "low_engagement"
  | "high_visibility";

export type TweetCandidate = {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  reposts: number;
  replies: number;
  source: HuntSource;
  sourceLabel: string;
  url?: string;
};

export type HuntConfig = {
  mode: GameMode;
  source: HuntSource;
  year?: string;
  keyword?: string;
};

export type TargetKind = "bird" | "clay";
export type TargetStatus = "flying" | "hit" | "escaped";
export type BirdColor = "blue" | "green" | "red";

export type TargetEntity = {
  id: string;
  kind: TargetKind;
  tweet?: TweetCandidate;
  color: BirdColor;
  status: TargetStatus;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  createdAtMs: number;
  hitAtMs?: number;
  escapedAtMs?: number;
  points: number;
  direction: 1 | -1;
  flight: "side" | "diag" | "up";
};

export type HitRecord = {
  targetId: string;
  tweet?: TweetCandidate;
  points: number;
  hitOrder: number;
  hitAtMs: number;
  mode: GameMode;
};

export type EscapeRecord = {
  targetId: string;
  tweet?: TweetCandidate;
  escapedAtMs: number;
  mode: GameMode;
};

export type RoundResult = {
  mode: GameMode;
  roundNumber: number;
  score: number;
  hits: HitRecord[];
  escapes: EscapeRecord[];
  shotsFired: number;
  targetsPresented: number;
  passLine: number;
  passed: boolean;
};
