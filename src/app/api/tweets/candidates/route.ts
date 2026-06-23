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
    quote_count?: number;
  };
};

type XTweetsResponse = {
  data?: XTweet[];
  meta?: {
    next_token?: string;
  };
};

const CANDIDATES_PER_ROUND = 10;
const CANDIDATE_PAGE_SIZE = 100;
const MAX_CANDIDATE_PAGES = 10;

class TweetLoadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "TweetLoadError";
  }
}

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
    quotes: metrics.quote_count ?? 0,
    source: "random",
    sourceLabel: "live X",
    url: `https://x.com/i/web/status/${tweet.id}`
  };
}

async function loadAccessibleTweets(headers: { Authorization: string }, userId: string): Promise<XTweet[]> {
  const tweets: XTweet[] = [];
  let nextToken: string | undefined;

  for (let page = 0; page < MAX_CANDIDATE_PAGES; page += 1) {
    const tweetsUrl = new URL(`${X_API_BASE_URL}/users/${userId}/tweets`);
    tweetsUrl.searchParams.set("max_results", CANDIDATE_PAGE_SIZE.toString());
    tweetsUrl.searchParams.set("tweet.fields", "created_at,public_metrics");
    if (nextToken) tweetsUrl.searchParams.set("pagination_token", nextToken);

    const tweetsResponse = await fetch(tweetsUrl, {
      headers,
      cache: "no-store"
    });

    if (tweetsResponse.status === 401 || tweetsResponse.status === 403) {
      throw new TweetLoadError("X denied access to tweets. Re-authorize and make sure tweet.read is granted.", 401);
    }

    if (tweetsResponse.status === 429) {
      throw new TweetLoadError("X rate-limited tweet loading. Try again later.", 429);
    }

    if (!tweetsResponse.ok) {
      throw new TweetLoadError("Could not load live tweets from X.", 502);
    }

    let tweetsJson: XTweetsResponse;
    try {
      tweetsJson = (await tweetsResponse.json()) as XTweetsResponse;
    } catch {
      throw new TweetLoadError("Could not load live tweets from X.", 502);
    }

    tweets.push(...(tweetsJson.data ?? []));
    nextToken = tweetsJson.meta?.next_token;
    if (!nextToken) break;
  }

  return tweets;
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

  let me: XMeResponse;
  try {
    me = (await meResponse.json()) as XMeResponse;
  } catch {
    return jsonError("Could not read the linked X profile.", 502);
  }
  const userId = me.data?.id;
  if (!userId) {
    return jsonError("Could not identify the linked X account.", 502);
  }

  try {
    const availableTweets = uniqueTweetsById(await loadAccessibleTweets(headers, userId));
    const tweets = randomSample(availableTweets, CANDIDATES_PER_ROUND).map(toTweetCandidate);

    return NextResponse.json({ tweets });
  } catch (error) {
    if (error instanceof TweetLoadError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("Could not load live tweets from X.", 502);
  }
}
