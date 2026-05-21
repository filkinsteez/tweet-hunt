import type { GameMode } from "@/game/types";

export type GoldenFlushStartEvent = {
  event: "start";
  total: number;
};

export type GoldenFlushProgressEvent = {
  event: "progress";
  tweetId: string;
  ok: boolean;
  deleted: number;
  failed: number;
  status?: number;
  reason?: string;
  message?: string;
};

export type GoldenFlushCompleteEvent = {
  event: "complete";
  deleted: number;
  failed: number;
  total: number;
};

export type GoldenFlushErrorEvent = {
  event: "error";
  message: string;
};

export type GoldenFlushEvent =
  | GoldenFlushStartEvent
  | GoldenFlushProgressEvent
  | GoldenFlushCompleteEvent
  | GoldenFlushErrorEvent;

export type GoldenFlushRequestBody = {
  mode: GameMode;
  nonce: string;
  tweetIds: string[];
};

export async function* streamGoldenFlush(body: GoldenFlushRequestBody): AsyncGenerator<GoldenFlushEvent> {
  const response = await fetch("/api/live/golden-flush", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.body) {
    yield { event: "error", message: `Golden flush returned no body (${response.status})` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        try {
          yield JSON.parse(line) as GoldenFlushEvent;
        } catch {
          // Ignore malformed lines but keep the stream alive.
        }
      }
      newlineIndex = buffer.indexOf("\n");
    }
  }

  const tail = buffer.trim();
  if (tail.length > 0) {
    try {
      yield JSON.parse(tail) as GoldenFlushEvent;
    } catch {
      // ignore
    }
  }
}
