import type { TweetCandidate } from "./types";
import { totalTweetEngagement } from "./engagement";

export const mockTweets: TweetCandidate[] = [
  {
    id: "space_ceo_001",
    text: "Posting through it has never failed me before.",
    createdAt: "2024-01-02T02:14:00.000Z",
    likes: 8200,
    reposts: 2100,
    replies: 3900,
    source: "high_visibility",
    sourceLabel: "space ceo"
  },
  {
    id: "space_ceo_002",
    text: "Huge if true. True if huge.",
    createdAt: "2024-01-06T18:33:00.000Z",
    likes: 6400,
    reposts: 1700,
    replies: 2600,
    source: "high_visibility",
    sourceLabel: "space ceo"
  },
  {
    id: "space_ceo_003",
    text: "Legacy media won't tell you this app is the future of civilization.",
    createdAt: "2024-01-11T21:11:00.000Z",
    likes: 9300,
    reposts: 2400,
    replies: 5100,
    source: "high_visibility",
    sourceLabel: "space ceo"
  },
  {
    id: "open_letter_investor_001",
    text: "I have prepared a 47-page open letter about this neighborhood bagel shop.",
    createdAt: "2024-02-03T06:41:00.000Z",
    likes: 3100,
    reposts: 900,
    replies: 1200,
    source: "high_visibility",
    sourceLabel: "open letter investor"
  },
  {
    id: "open_letter_investor_002",
    text: "As a customer, taxpayer, and guy in the replies, I must speak out.",
    createdAt: "2024-02-08T01:42:00.000Z",
    likes: 2600,
    reposts: 780,
    replies: 980,
    source: "high_visibility",
    sourceLabel: "open letter investor"
  },
  {
    id: "open_letter_investor_003",
    text: "After careful review, I believe this situation requires adult supervision.",
    createdAt: "2024-02-14T16:00:00.000Z",
    likes: 4200,
    reposts: 1100,
    replies: 1500,
    source: "high_visibility",
    sourceLabel: "open letter investor"
  },
  {
    id: "founder_mode_guy_001",
    text: "My Uber driver asked one question that changed how I think about product forever.",
    createdAt: "2024-03-04T14:25:00.000Z",
    likes: 680,
    reposts: 190,
    replies: 220,
    source: "keyword",
    sourceLabel: "founder mode guy"
  },
  {
    id: "founder_mode_guy_002",
    text: "I stopped sleeping and my pipeline immediately respected me more.",
    createdAt: "2024-03-09T09:04:00.000Z",
    likes: 920,
    reposts: 240,
    replies: 310,
    source: "keyword",
    sourceLabel: "founder mode guy"
  },
  {
    id: "founder_mode_guy_003",
    text: "Most people do not understand distribution. That's the tweet.",
    createdAt: "2024-03-17T23:18:00.000Z",
    likes: 1500,
    reposts: 410,
    replies: 520,
    source: "keyword",
    sourceLabel: "founder mode guy"
  },
  {
    id: "ai_prophet_001",
    text: "In 18 months your manager will be a prompt with calendar access.",
    createdAt: "2024-04-01T03:19:00.000Z",
    likes: 3500,
    reposts: 1200,
    replies: 1800,
    source: "high_visibility",
    sourceLabel: "ai prophet"
  },
  {
    id: "ai_prophet_002",
    text: "Few understand this. The agent layer is the new electricity.",
    createdAt: "2024-04-09T20:20:00.000Z",
    likes: 4100,
    reposts: 1400,
    replies: 2200,
    source: "high_visibility",
    sourceLabel: "ai prophet"
  },
  {
    id: "ai_prophet_003",
    text: "If you're not rebuilding your entire life around AI, you're already behind.",
    createdAt: "2024-04-18T12:55:00.000Z",
    likes: 2200,
    reposts: 760,
    replies: 1040,
    source: "high_visibility",
    sourceLabel: "ai prophet"
  },
  {
    id: "reply_guy_001",
    text: "Source?",
    createdAt: "2024-05-02T18:08:00.000Z",
    likes: 2,
    reposts: 0,
    replies: 17,
    source: "replies",
    sourceLabel: "reply guy"
  },
  {
    id: "reply_guy_002",
    text: "Actually...",
    createdAt: "2024-05-05T19:30:00.000Z",
    likes: 1,
    reposts: 0,
    replies: 24,
    source: "replies",
    sourceLabel: "reply guy"
  },
  {
    id: "reply_guy_003",
    text: "Wrong.",
    createdAt: "2024-05-11T14:02:00.000Z",
    likes: 7,
    reposts: 0,
    replies: 31,
    source: "replies",
    sourceLabel: "reply guy"
  },
  {
    id: "linkedin_shaman_001",
    text: "A pigeon stole my bagel. Here's what it taught me about B2B SaaS.",
    createdAt: "2024-06-01T17:17:00.000Z",
    likes: 430,
    reposts: 80,
    replies: 65,
    source: "keyword",
    sourceLabel: "linkedin shaman"
  },
  {
    id: "linkedin_shaman_002",
    text: "Just saw a man order coffee wrong. Whole timeline needs to discuss this.",
    createdAt: "2024-06-07T08:18:00.000Z",
    likes: 610,
    reposts: 120,
    replies: 90,
    source: "keyword",
    sourceLabel: "linkedin shaman"
  },
  {
    id: "linkedin_shaman_003",
    text: "This should be illegal: saying circle back in a personal relationship.",
    createdAt: "2024-06-12T22:06:00.000Z",
    likes: 300,
    reposts: 55,
    replies: 48,
    source: "keyword",
    sourceLabel: "linkedin shaman"
  },
  {
    id: "crypto_evangelist_001",
    text: "Still early.",
    createdAt: "2024-07-04T13:40:00.000Z",
    likes: 1200,
    reposts: 420,
    replies: 310,
    source: "keyword",
    sourceLabel: "crypto evangelist"
  },
  {
    id: "crypto_evangelist_002",
    text: "The chart is down, which is actually the strongest bull signal.",
    createdAt: "2024-07-09T00:12:00.000Z",
    likes: 980,
    reposts: 360,
    replies: 240,
    source: "keyword",
    sourceLabel: "crypto evangelist"
  },
  {
    id: "crypto_evangelist_003",
    text: "The opportunity is generational.",
    createdAt: "2024-07-16T11:32:00.000Z",
    likes: 1700,
    reposts: 620,
    replies: 410,
    source: "keyword",
    sourceLabel: "crypto evangelist"
  },
  {
    id: "productivity_monk_001",
    text: "My 4:12am routine is just me tweeting about my 4:12am routine.",
    createdAt: "2024-08-02T04:12:00.000Z",
    likes: 2,
    reposts: 0,
    replies: 1,
    source: "low_engagement",
    sourceLabel: "productivity monk"
  },
  {
    id: "productivity_monk_002",
    text: "I replaced lunch with deep work and one almond.",
    createdAt: "2024-08-08T12:00:00.000Z",
    likes: 1,
    reposts: 0,
    replies: 1,
    source: "low_engagement",
    sourceLabel: "productivity monk"
  },
  {
    id: "productivity_monk_003",
    text: "You are losing 8 minutes a day to blinking. Optimize.",
    createdAt: "2024-08-13T09:09:00.000Z",
    likes: 3,
    reposts: 0,
    replies: 0,
    source: "low_engagement",
    sourceLabel: "productivity monk"
  },
  {
    id: "vc_oracle_001",
    text: "The next billion-dollar company will look like a bad weekend project.",
    createdAt: "2024-09-01T15:00:00.000Z",
    likes: 5900,
    reposts: 1800,
    replies: 900,
    source: "high_visibility",
    sourceLabel: "vc oracle"
  },
  {
    id: "vc_oracle_002",
    text: "The future belongs to builders who post daily build notes.",
    createdAt: "2024-09-06T15:00:00.000Z",
    likes: 4200,
    reposts: 1400,
    replies: 700,
    source: "high_visibility",
    sourceLabel: "vc oracle"
  },
  {
    id: "vc_oracle_003",
    text: "Few understand this: distribution is the new moat is the new distribution.",
    createdAt: "2024-09-11T15:00:00.000Z",
    likes: 7600,
    reposts: 2500,
    replies: 1300,
    source: "high_visibility",
    sourceLabel: "vc oracle"
  },
  {
    id: "political_capslock_uncle_001",
    text: "EVERYONE KNOWS THIS BUT NOBODY IS ALLOWED TO SAY IT.",
    createdAt: "2024-10-01T20:00:00.000Z",
    likes: 900,
    reposts: 260,
    replies: 740,
    source: "high_visibility",
    sourceLabel: "political capslock uncle"
  },
  {
    id: "political_capslock_uncle_002",
    text: "TOTAL DISASTER. MANY SUCH CASES.",
    createdAt: "2024-10-03T20:00:00.000Z",
    likes: 1100,
    reposts: 310,
    replies: 880,
    source: "high_visibility",
    sourceLabel: "political capslock uncle"
  },
  {
    id: "political_capslock_uncle_003",
    text: "I HAVE BEEN PROVEN CORRECT AGAIN BY A SCREENSHOT I CROPPED MYSELF.",
    createdAt: "2024-10-05T20:00:00.000Z",
    likes: 1300,
    reposts: 390,
    replies: 1010,
    source: "high_visibility",
    sourceLabel: "political capslock uncle"
  },
  {
    id: "finance_doomer_001",
    text: "The yield curve explains why your sandwich costs $19.",
    createdAt: "2024-11-01T17:30:00.000Z",
    likes: 330,
    reposts: 90,
    replies: 70,
    source: "keyword",
    sourceLabel: "finance doomer"
  },
  {
    id: "finance_doomer_002",
    text: "No one wants to talk about what rates are doing to brunch culture.",
    createdAt: "2024-11-04T17:30:00.000Z",
    likes: 720,
    reposts: 210,
    replies: 160,
    source: "keyword",
    sourceLabel: "finance doomer"
  },
  {
    id: "finance_doomer_003",
    text: "Every friendship is a duration trade if you are honest about it.",
    createdAt: "2024-11-08T17:30:00.000Z",
    likes: 510,
    reposts: 140,
    replies: 95,
    source: "keyword",
    sourceLabel: "finance doomer"
  },
  {
    id: "main_character_poster_001",
    text: "What's a hill you'll die on?",
    createdAt: "2024-12-01T19:45:00.000Z",
    likes: 700,
    reposts: 140,
    replies: 180,
    source: "random",
    sourceLabel: "main character poster"
  },
  {
    id: "main_character_poster_002",
    text: "Drop your hot takes below.",
    createdAt: "2024-12-04T19:45:00.000Z",
    likes: 820,
    reposts: 150,
    replies: 260,
    source: "random",
    sourceLabel: "main character poster"
  },
  {
    id: "main_character_poster_003",
    text: "This should be illegal: people who board planes slowly.",
    createdAt: "2024-12-07T19:45:00.000Z",
    likes: 540,
    reposts: 95,
    replies: 130,
    source: "random",
    sourceLabel: "main character poster"
  },
  {
    id: "well_actually_historian_001",
    text: "Actually...",
    createdAt: "2025-01-02T10:10:00.000Z",
    likes: 4,
    reposts: 0,
    replies: 19,
    source: "replies",
    sourceLabel: "well actually historian"
  },
  {
    id: "well_actually_historian_002",
    text: "Minor correction no one asked for:",
    createdAt: "2025-01-05T10:10:00.000Z",
    likes: 3,
    reposts: 0,
    replies: 22,
    source: "replies",
    sourceLabel: "well actually historian"
  },
  {
    id: "well_actually_historian_003",
    text: "Source?",
    createdAt: "2025-01-08T10:10:00.000Z",
    likes: 6,
    reposts: 1,
    replies: 27,
    source: "replies",
    sourceLabel: "well actually historian"
  },
  {
    id: "podcast_maxxer_001",
    text: "We unpacked one tweet for four hours and still need a part two.",
    createdAt: "2025-02-01T21:00:00.000Z",
    likes: 650,
    reposts: 170,
    replies: 210,
    source: "keyword",
    sourceLabel: "podcast maxxer"
  },
  {
    id: "podcast_maxxer_002",
    text: "There's a deeper conversation here. Link in bio.",
    createdAt: "2025-02-04T21:00:00.000Z",
    likes: 930,
    reposts: 260,
    replies: 300,
    source: "keyword",
    sourceLabel: "podcast maxxer"
  },
  {
    id: "podcast_maxxer_003",
    text: "Let's zoom out and ask what this says about men.",
    createdAt: "2025-02-07T21:00:00.000Z",
    likes: 480,
    reposts: 110,
    replies: 120,
    source: "keyword",
    sourceLabel: "podcast maxxer"
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
