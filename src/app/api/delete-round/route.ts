import { NextResponse } from "next/server";
import { z } from "zod";

const DeleteRoundRequest = z.object({
  mode: z.enum(["A", "B", "C"]),
  roundNumber: z.number().int().positive(),
  tweetIds: z.array(z.string().min(1)).max(10),
  dryRun: z.boolean().default(true)
});

export async function POST(request: Request) {
  const parsed = DeleteRoundRequest.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delete round payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { mode, tweetIds, dryRun } = parsed.data;

  if (mode === "C") {
    return NextResponse.json({ error: "Game C is non-destructive and cannot delete tweets." }, { status: 403 });
  }

  if (!dryRun && process.env.ENABLE_LIVE_DELETE !== "true") {
    return NextResponse.json({ error: "Live deletion is disabled. Set ENABLE_LIVE_DELETE=true only after safety gates are complete." }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    acceptedTweetIds: tweetIds,
    message: dryRun ? "Dry run accepted. No tweets deleted." : "Live deletion would be queued here."
  });
}
