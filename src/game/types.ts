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
  quotes?: number;
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
export type MechanicsState = "idle" | "init" | "waiting" | "flying" | "hit_pause" | "falling" | "fragmenting" | "clear";
export type BirdColor = "blue" | "green" | "red" | "golden";

export type TargetEntity = {
  id: string;
  kind: TargetKind;
  tweet?: TweetCandidate;
  color: BirdColor;
  status: TargetStatus;
  mechanicsState?: MechanicsState;
  isGolden?: boolean;
  goldenNonce?: string;
  expiresAtMs?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  nesX?: number;
  nesY?: number;
  radius: number;
  createdAtMs: number;
  hitAtMs?: number;
  escapedAtMs?: number;
  points: number;
  direction: 1 | -1;
  flight: "side" | "diag";
  slotIndex?: number;
  pathId?: number;
  pathData?: number[];
  pathIndex?: number;
  motionCode?: number;
  motionPatternIndex?: number;
  speedIndex?: number;
  segmentTimer?: number;
  zapperShape?: number;
  flyAwayFlag?: boolean;
  flyAwayTimer?: number;
  launchFlag?: boolean;
  hitPauseTimer?: number;
  clayMemory?: number[];
  distanceClass?: number;
  clayImageIndex?: number;
  shootable?: boolean;
  erraticPhase?: number;
  erraticStrength?: number;
  erraticRate?: number;
  fliesBehindTree?: boolean;
  pingPongEdges?: boolean;
  launchSoundPlayed?: boolean;
  fallSoundPlayed?: boolean;
  groundSoundPlayed?: boolean;
  flyAwaySoundPlayed?: boolean;
};

export type HitRecord = {
  targetId: string;
  tweet?: TweetCandidate;
  points: number;
  hitOrder: number;
  hitAtMs: number;
  mode: GameMode;
  deleteStatus?: "pending" | "deleted" | "failed" | "flushed";
  isGolden?: boolean;
};

export type EscapeRecord = {
  targetId: string;
  tweet?: TweetCandidate;
  escapedAtMs: number;
  mode: GameMode;
};

export type DuckCallStatus = "disabled" | "ready" | "calling" | "summoned" | "spent";

export type GoldenFlushPhase = "idle" | "starting" | "running" | "complete" | "failed";

export type GoldenFlushProgress = {
  phase: GoldenFlushPhase;
  totalEligible: number;
  deleted: number;
  failed: number;
  currentSnippet?: string;
  error?: string;
  startedAtMs?: number;
  completedAtMs?: number;
};

export type GoldenFlushSummary = {
  tweetsDeleted: number;
  failed: number;
  scoreFromFlush: number;
  goldenDuckPoints: number;
};

export type RoundResult = {
  mode: GameMode;
  roundNumber: number;
  score: number;
  hits: HitRecord[];
  escapes: EscapeRecord[];
  shotsFired: number;
  targetsPresented: number;
  targetLimit: number;
  isLiveTweetRound: boolean;
  passLine: number;
  passed: boolean;
  goldenFlush?: GoldenFlushSummary;
};
