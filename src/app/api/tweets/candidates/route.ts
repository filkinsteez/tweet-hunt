import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCESS_TOKEN, X_API_BASE_URL, X_API_ME_URL } from "@/lib/twitterAuth";
import type { TweetCandidate } from "@/game/types";

export const dynamic = "force-dynamic";

type XMeResponse = {
  data?: {
    id: string;
    username?: string;
  };
};

type XTweet = {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
  };
};

type XTweetsResponse = {
  data?: XTweet[];
};

const CANDIDATES_PER_ROUND = 10;
const CANDIDATE_POOL_SIZE = 100;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function randomSample<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function uniqueTweetsById(tweets: XTweet[]): XTweet[] {
  const seen = new Set<string>();
  return tweets.filter((tweet) => {
    if (seen.has(tweet.id)) return false;
    seen.add(tweet.id);
    return true;
  });
}

function toTweetCandidate(tweet: XTweet): TweetCandidate {
  const metrics = tweet.public_metrics ?? {};
  return {
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at ?? new Date().toISOString(),
    likes: metrics.like_count ?? 0,
    reposts: metrics.retweet_count ?? 0,
    replies: metrics.reply_count ?? 0,
    source: "random",
    sourceLabel: "live X",
    url: `https://x.com/i/web/status/${tweet.id}`
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  if (!token) {
    return jsonError("Authorize with X before loading tweet candidates.", 401);
  }

  const headers = { Authorization: `Bearer ${token}` };

  const meResponse = await fetch(X_API_ME_URL, {
    headers,
    cache: "no-store"
  });

  if (meResponse.status === 401 || meResponse.status === 403) {
    return jsonError("Your X authorization expired. Unlink and authorize again.", 401);
  }

  if (!meResponse.ok) {
    return jsonError("Could not read the linked X profile.", 502);
  }

  const me = (await meResponse.json()) as XMeResponse;
  const userId = me.data?.id;
  if (!userId) {
    return jsonError("Could not identify the linked X account.", 502);
  }

  const tweetsUrl = new URL(`${X_API_BASE_URL}/users/${userId}/tweets`);
  tweetsUrl.searchParams.set("max_results", CANDIDATE_POOL_SIZE.toString());
  tweetsUrl.searchParams.set("tweet.fields", "created_at,public_metrics");

  const tweetsResponse = await fetch(tweetsUrl, {
    headers,
    cache: "no-store"
  });

  if (tweetsResponse.status === 401 || tweetsResponse.status === 403) {
    return jsonError("X denied access to tweets. Re-authorize and make sure tweet.read is granted.", 401);
  }

  if (!tweetsResponse.ok) {
    return jsonError("Could not load live tweets from X.", 502);
  }

  const tweetsJson = (await tweetsResponse.json()) as XTweetsResponse;
  const availableTweets = uniqueTweetsById(tweetsJson.data ?? []);
  if (availableTweets.length === 0) {
    return jsonError("No live tweets were returned by X for this account.", 404);
  }
  if (availableTweets.length < CANDIDATES_PER_ROUND) {
    return jsonError(
      `This account only has ${availableTweets.length} available tweets, but a full round needs ${CANDIDATES_PER_ROUND}.`,
      409
    );
  }

  const tweets = randomSample(availableTweets, CANDIDATES_PER_ROUND).map(toTweetCandidate);

  return NextResponse.json({ tweets });
}
