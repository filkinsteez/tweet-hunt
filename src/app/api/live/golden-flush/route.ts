import { type NextRequest } from "next/server";
import { z } from "zod";
import { COOKIE_ACCESS_TOKEN, X_API_BASE_URL } from "@/lib/twitterAuth";

export const dynamic = "force-dynamic";

const GoldenFlushRequest = z.object({
  mode: z.enum(["A", "B"]),
  nonce: z.string().min(8).max(128),
  tweetIds: z.array(z.string().min(1)).min(1).max(100)
});

const NONCE_TTL_MS = 10 * 60 * 1000;
const usedNonces = new Map<string, number>();

function pruneNonces(now: number) {
  for (const [key, expiresAt] of usedNonces) {
    if (expiresAt <= now) usedNonces.delete(key);
  }
}

function encodeLine(payload: Record<string, unknown>) {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

function errorStream(payload: Record<string, unknown>, status: number) {
  return new Response(encodeLine({ event: "error", ...payload }), {
    status,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_LIVE_DELETE !== "true") {
    return errorStream({ message: "Live tweet deletion is disabled for this environment." }, 403);
  }

  const token = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  if (!token) {
    return errorStream({ message: "Authorize with X before deleting tweets." }, 401);
  }

  const parsed = GoldenFlushRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorStream({ message: "Invalid golden flush payload." }, 400);
  }

  const now = Date.now();
  pruneNonces(now);
  const nonceKey = `${token.slice(0, 8)}:${parsed.data.nonce}`;
  if (usedNonces.has(nonceKey)) {
    return errorStream({ message: "Golden flush nonce already consumed." }, 409);
  }
  usedNonces.set(nonceKey, now + NONCE_TTL_MS);

  const tweetIds = Array.from(new Set(parsed.data.tweetIds));

  const stream = new ReadableStream({
    async start(controller) {
      let deleted = 0;
      let failed = 0;
      controller.enqueue(encodeLine({ event: "start", total: tweetIds.length }));

      for (const tweetId of tweetIds) {
        try {
          const response = await fetch(`${X_API_BASE_URL}/tweets/${encodeURIComponent(tweetId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store"
          });
          if (response.ok) {
            deleted += 1;
            controller.enqueue(
              encodeLine({ event: "progress", tweetId, ok: true, deleted, failed })
            );
          } else {
            failed += 1;
            controller.enqueue(
              encodeLine({
                event: "progress",
                tweetId,
                ok: false,
                deleted,
                failed,
                status: response.status,
                reason: response.status === 429 ? "rate-limited" : "x-error"
              })
            );
          }
        } catch (error) {
          failed += 1;
          controller.enqueue(
            encodeLine({
              event: "progress",
              tweetId,
              ok: false,
              deleted,
              failed,
              reason: "network-error",
              message: error instanceof Error ? error.message : "unknown"
            })
          );
        }
      }

      controller.enqueue(encodeLine({ event: "complete", deleted, failed, total: tweetIds.length }));
      controller.close();
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no"
    }
  });
}
