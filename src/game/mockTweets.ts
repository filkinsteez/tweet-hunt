import type { TweetCandidate } from "./types";
import { totalTweetEngagement } from "./engagement";

export const mockTweets: TweetCandidate[] = [
  {
    id: "fake_001",
    text: "Posting through it has never failed me before.",
    createdAt: "2024-01-02T02:14:00.000Z",
    likes: 8200,
    reposts: 2100,
    replies: 3900,
    source: "high_visibility",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_002",
    text: "Huge if true. True if huge.",
    createdAt: "2024-01-06T18:33:00.000Z",
    likes: 6400,
    reposts: 1700,
    replies: 2600,
    source: "high_visibility",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_003",
    text: "I have prepared a 47-page open letter about this neighborhood bagel shop.",
    createdAt: "2024-02-03T06:41:00.000Z",
    likes: 3100,
    reposts: 900,
    replies: 1200,
    source: "high_visibility",
    sourceLabel: "open letter guy"
  },
  {
    id: "fake_004",
    text: "As a customer, taxpayer, and guy in the replies, I must speak out.",
    createdAt: "2024-02-08T01:42:00.000Z",
    likes: 2600,
    reposts: 780,
    replies: 980,
    source: "high_visibility",
    sourceLabel: "open letter guy"
  },
  {
    id: "fake_005",
    text: "after careful review, I believe this situation requires adult supervision.",
    createdAt: "2024-02-14T16:00:00.000Z",
    likes: 4200,
    reposts: 1100,
    replies: 1500,
    source: "high_visibility",
    sourceLabel: "open letter guy"
  },
  {
    id: "fake_006",
    text: "I’ve spent $5,402 in AI credits and have nothing to show for it.",
    createdAt: "2024-04-01T03:19:00.000Z",
    likes: 3500,
    reposts: 1200,
    replies: 1800,
    source: "high_visibility",
    sourceLabel: "ai guy"
  },
  {
    id: "fake_007",
    text: "Source?",
    createdAt: "2024-05-02T18:08:00.000Z",
    likes: 2,
    reposts: 0,
    replies: 17,
    source: "replies",
    sourceLabel: "reply guy"
  },
  {
    id: "fake_008",
    text: "A rat stole my pizza slice. Here's what it taught me about B2B SaaS.",
    createdAt: "2024-06-01T17:17:00.000Z",
    likes: 430,
    reposts: 80,
    replies: 65,
    source: "keyword",
    sourceLabel: "b2b saas guy"
  },
  {
    id: "fake_009",
    text: "this should be illegal: saying “this should be illegal”",
    createdAt: "2024-06-12T22:06:00.000Z",
    likes: 300,
    reposts: 55,
    replies: 48,
    source: "keyword",
    sourceLabel: "discourse bait"
  },
  {
    id: "fake_010",
    text: "bro we’re soooo early!!!",
    createdAt: "2024-07-04T13:40:00.000Z",
    likes: 1200,
    reposts: 420,
    replies: 310,
    source: "keyword",
    sourceLabel: "crypto guy"
  },
  {
    id: "fake_011",
    text: "My 4AM routine is just me tweeting about my 4AM routine.",
    createdAt: "2024-08-02T04:12:00.000Z",
    likes: 2,
    reposts: 0,
    replies: 1,
    source: "low_engagement",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_012",
    text: "I replaced lunch with deep work and one almond.",
    createdAt: "2024-08-08T12:00:00.000Z",
    likes: 1,
    reposts: 0,
    replies: 1,
    source: "low_engagement",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_013",
    text: "You are losing 8 minutes a day to blinking. Optimize.",
    createdAt: "2024-08-13T09:09:00.000Z",
    likes: 3,
    reposts: 0,
    replies: 0,
    source: "low_engagement",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_014",
    text: "Few understand this: distribution is the new moat is the new distribution.",
    createdAt: "2024-09-11T15:00:00.000Z",
    likes: 7600,
    reposts: 2500,
    replies: 1300,
    source: "high_visibility",
    sourceLabel: "vc guy"
  },
  {
    id: "fake_015",
    text: "TOTAL DISASTER. MANY SUCH CASES.",
    createdAt: "2024-10-03T20:00:00.000Z",
    likes: 1100,
    reposts: 310,
    replies: 880,
    source: "high_visibility",
    sourceLabel: "capslock guy"
  },
  {
    id: "fake_016",
    text: "Drop your hot takes below.",
    createdAt: "2024-12-04T19:45:00.000Z",
    likes: 820,
    reposts: 150,
    replies: 260,
    source: "random",
    sourceLabel: "engagement bait"
  },
  {
    id: "fake_017",
    text: "There's a deeper conversation here. Link in bio.",
    createdAt: "2025-02-04T21:00:00.000Z",
    likes: 930,
    reposts: 260,
    replies: 300,
    source: "keyword",
    sourceLabel: "podcast guy"
  },
  {
    id: "fake_018",
    text: "let's zoom out and double click",
    createdAt: "2025-02-07T21:00:00.000Z",
    likes: 480,
    reposts: 110,
    replies: 120,
    source: "keyword",
    sourceLabel: "podcast guy"
  }
];

export function selectTweetCandidates(config: { source: string; year?: string; keyword?: string }, count = 10) {
  let candidates = [...mockTweets];

  if (config.source === "year" && config.year) {
    const year = config.year;
    candidates = candidates.filter((tweet) => tweet.createdAt.startsWith(year));
  }

  if (config.source === "keyword" && config.keyword?.trim()) {
    const term = config.keyword.trim().toLowerCase();
    candidates = candidates.filter((tweet) => tweet.text.toLowerCase().includes(term));
  }

  if (config.source === "replies") {
    candidates = candidates.filter((tweet) => tweet.source === "replies" || tweet.replies >= 8);
  }

  if (config.source === "low_engagement") {
    candidates = candidates.filter((tweet) => totalTweetEngagement(tweet) <= 3);
  }

  if (config.source === "high_visibility") {
    candidates = candidates.filter((tweet) => totalTweetEngagement(tweet) >= 30);
  }

  if (candidates.length < count) {
    const seen = new Set(candidates.map((tweet) => tweet.id));
    for (const tweet of mockTweets) {
      if (!seen.has(tweet.id)) candidates.push(tweet);
      if (candidates.length >= count) break;
    }
  }

  if (config.source === "random") {
    candidates.sort(() => Math.random() - 0.5);
  }

  return candidates.slice(0, count);
}
