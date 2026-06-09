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
    text: "You’re absolutely right! I did make a dumb game!",
    createdAt: "2024-01-11T21:11:00.000Z",
    likes: 1840,
    reposts: 410,
    replies: 260,
    source: "high_visibility",
    sourceLabel: "reply guy"
  },
  {
    id: "fake_004",
    text: "walking into a room and forgetting why. many such cases",
    createdAt: "2024-02-03T06:41:00.000Z",
    likes: 1100,
    reposts: 310,
    replies: 880,
    source: "keyword",
    sourceLabel: "many such cases guy"
  },
  {
    id: "fake_005",
    text: "what losing my airpods taught me about b2b saas",
    createdAt: "2024-02-08T01:42:00.000Z",
    likes: 430,
    reposts: 80,
    replies: 65,
    source: "keyword",
    sourceLabel: "b2b saas guy"
  },
  {
    id: "fake_006",
    text: "the vibe shift was just everyone getting a little hangry",
    createdAt: "2024-02-14T16:00:00.000Z",
    likes: 820,
    reposts: 150,
    replies: 260,
    source: "random",
    sourceLabel: "vibe shift guy"
  },
  {
    id: "fake_007",
    text: "locked in, unfortunately on the wrong thing",
    createdAt: "2024-04-01T03:19:00.000Z",
    likes: 930,
    reposts: 260,
    replies: 300,
    source: "keyword",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_008",
    text: "spiritually, i am buffering",
    createdAt: "2024-05-02T18:08:00.000Z",
    likes: 640,
    reposts: 120,
    replies: 84,
    source: "random",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_009",
    text: "after careful review, I believe this situation requires adult supervision.",
    createdAt: "2024-06-01T17:17:00.000Z",
    likes: 4200,
    reposts: 1100,
    replies: 1500,
    source: "high_visibility",
    sourceLabel: "open letter guy"
  },
  {
    id: "fake_010",
    text: "A rat stole my pizza slice. Here's what it taught me about B2B SaaS.",
    createdAt: "2024-06-12T22:06:00.000Z",
    likes: 430,
    reposts: 80,
    replies: 65,
    source: "keyword",
    sourceLabel: "b2b saas guy"
  },
  {
    id: "fake_011",
    text: "My 4AM routine is just me tweeting about my 4AM routine.",
    createdAt: "2024-07-04T13:40:00.000Z",
    likes: 2,
    reposts: 0,
    replies: 1,
    source: "low_engagement",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_012",
    text: "You are losing 8 minutes a day to blinking. Optimize.",
    createdAt: "2024-08-02T04:12:00.000Z",
    likes: 3,
    reposts: 0,
    replies: 0,
    source: "low_engagement",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_013",
    text: "i was not built for a society with calendar invites",
    createdAt: "2024-08-08T12:00:00.000Z",
    likes: 720,
    reposts: 210,
    replies: 160,
    source: "keyword",
    sourceLabel: "calendar guy"
  },
  {
    id: "fake_014",
    text: "every recipe blog be like first, the fall of rome",
    createdAt: "2024-08-13T09:09:00.000Z",
    likes: 580,
    reposts: 94,
    replies: 72,
    source: "random",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_015",
    text: "i bring a sort of “unread terms and conditions” energy to life",
    createdAt: "2024-09-11T15:00:00.000Z",
    likes: 510,
    reposts: 140,
    replies: 95,
    source: "random",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_016",
    text: "nobody warned me adulthood was mostly just resetting passwords",
    createdAt: "2024-10-03T20:00:00.000Z",
    likes: 1200,
    reposts: 420,
    replies: 310,
    source: "keyword",
    sourceLabel: "password guy"
  },
  {
    id: "fake_017",
    text: "perhaps the real productivity hack was avoidance all along",
    createdAt: "2024-12-04T19:45:00.000Z",
    likes: 1,
    reposts: 0,
    replies: 1,
    source: "low_engagement",
    sourceLabel: "productivity guy"
  },
  {
    id: "fake_018",
    text: "what oversharing at brunch taught me about customer retention",
    createdAt: "2025-02-04T21:00:00.000Z",
    likes: 930,
    reposts: 260,
    replies: 300,
    source: "keyword",
    sourceLabel: "b2b saas guy"
  },
  {
    id: "fake_019",
    text: "what a bad haircut taught me about brand repositioning",
    createdAt: "2025-02-07T21:00:00.000Z",
    likes: 480,
    reposts: 110,
    replies: 120,
    source: "keyword",
    sourceLabel: "brand guy"
  },
  {
    id: "fake_020",
    text: "i am one password reset away from living off the grid",
    createdAt: "2025-02-10T21:00:00.000Z",
    likes: 650,
    reposts: 170,
    replies: 210,
    source: "keyword",
    sourceLabel: "password guy"
  },
  {
    id: "fake_021",
    text: "every notes app title is either “ideas” or a cry for help",
    createdAt: "2025-02-13T21:00:00.000Z",
    likes: 84,
    reposts: 9,
    replies: 11,
    source: "random",
    sourceLabel: "internet brain"
  },
  {
    id: "fake_022",
    text: "concerning amount of tabs for someone “just checking one thing”",
    createdAt: "2025-02-16T21:00:00.000Z",
    likes: 980,
    reposts: 360,
    replies: 240,
    source: "keyword",
    sourceLabel: "browser tab guy"
  },
  {
    id: "fake_023",
    text: "we are so back",
    createdAt: "2025-02-19T21:00:00.000Z",
    likes: 2200,
    reposts: 760,
    replies: 1040,
    source: "high_visibility",
    sourceLabel: "cycle guy"
  },
  {
    id: "fake_024",
    text: "it's over",
    createdAt: "2025-02-22T21:00:00.000Z",
    likes: 2100,
    reposts: 720,
    replies: 990,
    source: "high_visibility",
    sourceLabel: "cycle guy"
  },
  {
    id: "fake_025",
    text: "Source?",
    createdAt: "2025-02-25T21:00:00.000Z",
    likes: 2,
    reposts: 0,
    replies: 17,
    source: "replies",
    sourceLabel: "reply guy"
  },
  {
    id: "fake_026",
    text: "hot take: soup is just wet food",
    createdAt: "2025-02-28T21:00:00.000Z",
    likes: 700,
    reposts: 140,
    replies: 180,
    source: "random",
    sourceLabel: "hot take guy"
  },
  {
    id: "fake_027",
    text: "We hear you. We are listening. We have learned nothing.",
    createdAt: "2025-03-03T21:00:00.000Z",
    likes: 3100,
    reposts: 900,
    replies: 1200,
    source: "high_visibility",
    sourceLabel: "corporate apology"
  },
  {
    id: "fake_028",
    text: "i fear the group chat has gone agentic",
    createdAt: "2025-03-06T21:00:00.000Z",
    likes: 1400,
    reposts: 420,
    replies: 280,
    source: "keyword",
    sourceLabel: "ai guy"
  },
  {
    id: "fake_029",
    text: "RT if you remember dial up",
    createdAt: "2025-03-09T21:00:00.000Z",
    likes: 900,
    reposts: 620,
    replies: 210,
    source: "keyword",
    sourceLabel: "nostalgia guy"
  },
  {
    id: "fake_030",
    text: "normalize leaving the party without announcing it",
    createdAt: "2025-03-12T21:00:00.000Z",
    likes: 1700,
    reposts: 620,
    replies: 410,
    source: "keyword",
    sourceLabel: "normalize guy"
  },
  {
    id: "fake_031",
    text: "day 4 of no caffeine. i have seen things.",
    createdAt: "2025-03-15T21:00:00.000Z",
    likes: 520,
    reposts: 86,
    replies: 74,
    source: "random",
    sourceLabel: "caffeine guy"
  },
  {
    id: "fake_032",
    text: "my sleep score said 62 so emotionally i am also a 62",
    createdAt: "2025-03-18T21:00:00.000Z",
    likes: 610,
    reposts: 120,
    replies: 90,
    source: "random",
    sourceLabel: "sleep guy"
  },
  {
    id: "fake_033",
    text: "my screen time report should be sealed by a judge",
    createdAt: "2025-03-21T21:00:00.000Z",
    likes: 1500,
    reposts: 410,
    replies: 520,
    source: "keyword",
    sourceLabel: "screen time guy"
  },
  {
    id: "fake_034",
    text: "unfortunately i am the friend who says \"we should make an app\"",
    createdAt: "2025-03-24T21:00:00.000Z",
    likes: 760,
    reposts: 150,
    replies: 130,
    source: "keyword",
    sourceLabel: "app guy"
  },
  {
    id: "fake_035",
    text: "interesting. blocked.",
    createdAt: "2025-03-27T21:00:00.000Z",
    likes: 7,
    reposts: 0,
    replies: 31,
    source: "replies",
    sourceLabel: "reply guy"
  },
  {
    id: "fake_036",
    text: "this you?",
    createdAt: "2025-03-30T21:00:00.000Z",
    likes: 4,
    reposts: 1,
    replies: 27,
    source: "replies",
    sourceLabel: "reply guy"
  },
  {
    id: "fake_037",
    text: "ok but who asked",
    createdAt: "2025-04-02T21:00:00.000Z",
    likes: 1,
    reposts: 0,
    replies: 24,
    source: "replies",
    sourceLabel: "reply guy"
  },
  {
    id: "fake_038",
    text: "my toxic trait is thinking the meeting will end early",
    createdAt: "2025-04-05T21:00:00.000Z",
    likes: 720,
    reposts: 210,
    replies: 160,
    source: "keyword",
    sourceLabel: "meeting guy"
  },
  {
    id: "fake_039",
    text: "i romanticize my life primarily through iced beverages",
    createdAt: "2025-04-08T21:00:00.000Z",
    likes: 980,
    reposts: 360,
    replies: 240,
    source: "keyword",
    sourceLabel: "iced coffee guy"
  },
  {
    id: "fake_040",
    text: "accidentally became a regular and now i must perform",
    createdAt: "2025-04-11T21:00:00.000Z",
    likes: 580,
    reposts: 94,
    replies: 72,
    source: "random",
    sourceLabel: "coffee shop guy"
  },
  {
    id: "fake_041",
    text: "my for you page knows things i have not told anyone",
    createdAt: "2025-04-14T21:00:00.000Z",
    likes: 1800,
    reposts: 540,
    replies: 390,
    source: "high_visibility",
    sourceLabel: "algorithm guy"
  },
  {
    id: "fake_042",
    text: "they should invent a Sunday that doesn't fill me with dread",
    createdAt: "2025-04-17T21:00:00.000Z",
    likes: 1300,
    reposts: 390,
    replies: 360,
    source: "high_visibility",
    sourceLabel: "sunday guy"
  },
  {
    id: "fake_043",
    text: "unpopular opinion: popular things are popular for a reason",
    createdAt: "2025-04-20T21:00:00.000Z",
    likes: 840,
    reposts: 190,
    replies: 300,
    source: "keyword",
    sourceLabel: "opinion guy"
  },
  {
    id: "fake_044",
    text: "i did not survive a global pandemic to attend this standup",
    createdAt: "2025-04-23T21:00:00.000Z",
    likes: 2600,
    reposts: 780,
    replies: 980,
    source: "high_visibility",
    sourceLabel: "meeting guy"
  },
  {
    id: "fake_045",
    text: "tipping screen flipped around. silence. locked eye contact.",
    createdAt: "2025-04-26T21:00:00.000Z",
    likes: 1600,
    reposts: 480,
    replies: 610,
    source: "high_visibility",
    sourceLabel: "checkout guy"
  },
  {
    id: "fake_046",
    text: "raw milk guys discovering refrigeration any day now",
    createdAt: "2025-04-29T21:00:00.000Z",
    likes: 670,
    reposts: 170,
    replies: 250,
    source: "keyword",
    sourceLabel: "wellness guy"
  },
  {
    id: "fake_047",
    text: "my doctor said i need to reduce stress so i blocked him",
    createdAt: "2025-05-02T21:00:00.000Z",
    likes: 860,
    reposts: 180,
    replies: 210,
    source: "keyword",
    sourceLabel: "wellness guy"
  },
  {
    id: "fake_048",
    text: "quietly googling \"is it normal to\" at 2am",
    createdAt: "2025-05-05T21:00:00.000Z",
    likes: 1150,
    reposts: 350,
    replies: 420,
    source: "high_visibility",
    sourceLabel: "health anxiety guy"
  },
  {
    id: "fake_049",
    text: "canceled plans hit different when you're the one who canceled",
    createdAt: "2025-05-08T21:00:00.000Z",
    likes: 740,
    reposts: 120,
    replies: 95,
    source: "random",
    sourceLabel: "plans guy"
  },
  {
    id: "fake_050",
    text: "respectfully, no",
    createdAt: "2025-05-11T21:00:00.000Z",
    likes: 22,
    reposts: 2,
    replies: 12,
    source: "replies",
    sourceLabel: "reply guy"
  },
  {
    id: "fake_051",
    text: "adulthood is just saying \"after this week things calm down\" until you die",
    createdAt: "2025-05-14T21:00:00.000Z",
    likes: 2400,
    reposts: 810,
    replies: 630,
    source: "high_visibility",
    sourceLabel: "adulthood guy"
  }
];

const BACK_TO_BACK_PAIR_IDS = ["fake_023", "fake_024"] as const;
const BACK_TO_BACK_PAIR_CHANCE = 0.28;

let sessionRandomCandidates: TweetCandidate[] | null = null;
let sessionRandomKey = "";
let sessionRandomCursor = 0;

function shuffleCandidates(candidates: TweetCandidate[]) {
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function maybeInsertBackToBackPair(candidates: TweetCandidate[], count: number) {
  if (Math.random() >= BACK_TO_BACK_PAIR_CHANCE) return candidates;

  const pair = BACK_TO_BACK_PAIR_IDS.map((id) => candidates.find((tweet) => tweet.id === id)).filter(
    (tweet): tweet is TweetCandidate => Boolean(tweet)
  );
  if (pair.length !== BACK_TO_BACK_PAIR_IDS.length) return candidates;

  const withoutPair = candidates.filter((tweet) => !BACK_TO_BACK_PAIR_IDS.includes(tweet.id as (typeof BACK_TO_BACK_PAIR_IDS)[number]));
  const orderedPair = Math.random() < 0.5 ? pair : [...pair].reverse();
  const maxInsertIndex = Math.max(0, Math.min(withoutPair.length, count - orderedPair.length));
  const insertIndex = Math.floor(Math.random() * (maxInsertIndex + 1));
  withoutPair.splice(insertIndex, 0, ...orderedPair);
  return withoutPair;
}

function selectSessionRandomCandidates(candidates: TweetCandidate[], count: number) {
  const key = candidates.map((tweet) => tweet.id).join("|");
  if (!sessionRandomCandidates || sessionRandomKey !== key || sessionRandomCursor + count > sessionRandomCandidates.length) {
    sessionRandomCandidates = maybeInsertBackToBackPair(shuffleCandidates(candidates), count);
    sessionRandomKey = key;
    sessionRandomCursor = 0;
  }

  const selected = sessionRandomCandidates.slice(sessionRandomCursor, sessionRandomCursor + count);
  sessionRandomCursor += count;
  return selected;
}

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
    return selectSessionRandomCandidates(candidates, count);
  }

  return candidates.slice(0, count);
}
