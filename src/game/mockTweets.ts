import type { TweetCandidate } from "./types";
import { totalTweetEngagement } from "./engagement";

export const mockTweets: TweetCandidate[] = [
  {
    id: "fake_001",
    text: "lol why did i even make this",
    createdAt: "2024-01-02T02:14:00.000Z",
    likes: 48,
    reposts: 6,
    replies: 4,
    source: "random",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_002",
    text: "I spent $10K in AI credits and only got this stupid app",
    createdAt: "2024-01-06T18:33:00.000Z",
    likes: 3500,
    reposts: 1200,
    replies: 1800,
    source: "high_visibility",
    sourceLabel: "ai guy"
  },
  {
    id: "fake_003",
    text: "walking into a room and forgetting why. many such cases",
    createdAt: "2024-02-03T06:41:00.000Z",
    likes: 1100,
    reposts: 310,
    replies: 880,
    source: "keyword",
    sourceLabel: "many such cases guy"
  },
  {
    id: "fake_004",
    text: "what losing my airpods taught me about b2b saas",
    createdAt: "2024-02-08T01:42:00.000Z",
    likes: 430,
    reposts: 80,
    replies: 65,
    source: "keyword",
    sourceLabel: "b2b saas guy"
  },
  {
    id: "fake_005",
    text: "the vibe shift was just everyone getting a little hangry",
    createdAt: "2024-02-14T16:00:00.000Z",
    likes: 820,
    reposts: 150,
    replies: 260,
    source: "random",
    sourceLabel: "vibe shift guy"
  },
  {
    id: "fake_006",
    text: "locked in, unfortunately on the wrong thing",
    createdAt: "2024-04-01T03:19:00.000Z",
    likes: 930,
    reposts: 260,
    replies: 300,
    source: "keyword",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_007",
    text: "spiritually, i am buffering",
    createdAt: "2024-05-02T18:08:00.000Z",
    likes: 640,
    reposts: 120,
    replies: 84,
    source: "random",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_008",
    text: "after careful review, I believe this situation requires adult supervision.",
    createdAt: "2024-06-01T17:17:00.000Z",
    likes: 4200,
    reposts: 1100,
    replies: 1500,
    source: "high_visibility",
    sourceLabel: "open letter guy"
  },
  {
    id: "fake_009",
    text: "A rat stole my pizza slice. Here's what it taught me about B2B SaaS.",
    createdAt: "2024-06-12T22:06:00.000Z",
    likes: 430,
    reposts: 80,
    replies: 65,
    source: "keyword",
    sourceLabel: "b2b saas guy"
  },
  {
    id: "fake_010",
    text: "My 4AM routine is just me tweeting about my 4AM routine.",
    createdAt: "2024-07-04T13:40:00.000Z",
    likes: 2,
    reposts: 0,
    replies: 1,
    source: "low_engagement",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_011",
    text: "You are losing 8 minutes a day to blinking. Optimize.",
    createdAt: "2024-08-02T04:12:00.000Z",
    likes: 3,
    reposts: 0,
    replies: 0,
    source: "low_engagement",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_012",
    text: "i was not built for a society with calendar invites",
    createdAt: "2024-08-08T12:00:00.000Z",
    likes: 720,
    reposts: 210,
    replies: 160,
    source: "keyword",
    sourceLabel: "calendar guy"
  },
  {
    id: "fake_013",
    text: "every recipe blog be like first, the fall of rome",
    createdAt: "2024-08-13T09:09:00.000Z",
    likes: 580,
    reposts: 94,
    replies: 72,
    source: "random",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_014",
    text: "i bring a sort of “unread terms and conditions” energy to life",
    createdAt: "2024-09-11T15:00:00.000Z",
    likes: 510,
    reposts: 140,
    replies: 95,
    source: "random",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_015",
    text: "nobody warned me adulthood was mostly just resetting passwords",
    createdAt: "2024-10-03T20:00:00.000Z",
    likes: 1200,
    reposts: 420,
    replies: 310,
    source: "keyword",
    sourceLabel: "password guy"
  },
  {
    id: "fake_016",
    text: "perhaps the real productivity hack was avoidance all along",
    createdAt: "2024-12-04T19:45:00.000Z",
    likes: 1,
    reposts: 0,
    replies: 1,
    source: "low_engagement",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_017",
    text: "what oversharing at brunch taught me about customer retention",
    createdAt: "2025-02-04T21:00:00.000Z",
    likes: 930,
    reposts: 260,
    replies: 300,
    source: "keyword",
    sourceLabel: "b2b saas guy"
  },
  {
    id: "fake_018",
    text: "what a bad haircut taught me about brand repositioning",
    createdAt: "2025-02-07T21:00:00.000Z",
    likes: 480,
    reposts: 110,
    replies: 120,
    source: "keyword",
    sourceLabel: "brand guy"
  },
  {
    id: "fake_019",
    text: "i am one password reset away from living off the grid",
    createdAt: "2025-02-10T21:00:00.000Z",
    likes: 650,
    reposts: 170,
    replies: 210,
    source: "keyword",
    sourceLabel: "password guy"
  },
  {
    id: "fake_020",
    text: "every notes app title is either “ideas” or a cry for help",
    createdAt: "2025-02-13T21:00:00.000Z",
    likes: 84,
    reposts: 9,
    replies: 11,
    source: "random",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_021",
    text: "concerning amount of tabs for someone “just checking one thing”",
    createdAt: "2025-02-16T21:00:00.000Z",
    likes: 980,
    reposts: 360,
    replies: 240,
    source: "keyword",
    sourceLabel: "browser tab guy"
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
