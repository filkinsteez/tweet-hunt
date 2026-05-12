import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { COOKIE_ACCESS_TOKEN, X_API_BASE_URL } from "@/lib/twitterAuth";

export const dynamic = "force-dynamic";

const DeleteTweetRequest = z.object({
  mode: z.enum(["A", "B"]),
  tweetId: z.string().min(1)
});

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_LIVE_DELETE !== "true") {
    return jsonError("Live tweet deletion is disabled for this environment.", 403);
  }

  const token = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  if (!token) {
    return jsonError("Authorize with X before deleting tweets.", 401);
  }

  const parsed = DeleteTweetRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid delete tweet payload.", 400);
  }

  const response = await fetch(`${X_API_BASE_URL}/tweets/${encodeURIComponent(parsed.data.tweetId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    return jsonError("X denied tweet deletion. Re-authorize and make sure tweet.write is granted.", 401);
  }

  if (response.status === 429) {
    return jsonError("X rate-limited tweet deletion. Try again later.", 429);
  }

  if (!response.ok) {
    return jsonError("X could not delete that tweet.", 502);
  }

  return NextResponse.json({ ok: true, deletedTweetId: parsed.data.tweetId });
}
