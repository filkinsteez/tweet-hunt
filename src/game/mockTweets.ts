import type { TweetCandidate } from "./types";
import { totalTweetEngagement } from "./engagement";

export const mockTweets: TweetCandidate[] = [
  {
    id: "t_001",
    text: "I am 100% convinced this side project is going to replace email within eighteen months.",
    createdAt: "2014-03-12T02:14:00.000Z",
    likes: 0,
    reposts: 0,
    replies: 1,
    source: "year",
    sourceLabel: "2014"
  },
  {
    id: "t_002",
    text: "The future of work is obviously everyone living in a Slack channel forever.",
    createdAt: "2015-08-01T18:33:00.000Z",
    likes: 4,
    reposts: 0,
    replies: 0,
    source: "keyword",
    sourceLabel: "future"
  },
  {
    id: "t_003",
    text: "Hot take: resumes are dead and vibes are the new credentials.",
    createdAt: "2016-02-22T21:11:00.000Z",
    likes: 12,
    reposts: 2,
    replies: 7,
    source: "keyword",
    sourceLabel: "hot take"
  },
  {
    id: "t_004",
    text: "Every founder should learn to code, sell, design, recruit, cook, and probably levitate.",
    createdAt: "2016-11-10T06:41:00.000Z",
    likes: 2,
    reposts: 0,
    replies: 2,
    source: "keyword",
    sourceLabel: "founder"
  },
  {
    id: "t_005",
    text: "Replying to a stranger at 1:42am because someone is wrong about middleware.",
    createdAt: "2017-05-05T01:42:00.000Z",
    likes: 1,
    reposts: 0,
    replies: 8,
    source: "replies",
    sourceLabel: "reply"
  },
  {
    id: "t_006",
    text: "I cannot believe we briefly called this growth hacking and all agreed to be normal about it.",
    createdAt: "2017-12-19T16:00:00.000Z",
    likes: 9,
    reposts: 1,
    replies: 1,
    source: "keyword",
    sourceLabel: "growth"
  },
  {
    id: "t_007",
    text: "Starting the week strong by pretending my inbox does not have jurisdiction over me.",
    createdAt: "2018-04-09T14:25:00.000Z",
    likes: 44,
    reposts: 6,
    replies: 3,
    source: "high_visibility",
    sourceLabel: "high visibility"
  },
  {
    id: "t_008",
    text: "I have decided that coffee is an operating system.",
    createdAt: "2018-10-28T09:04:00.000Z",
    likes: 0,
    reposts: 0,
    replies: 0,
    source: "low_engagement",
    sourceLabel: "0 engagement"
  },
  {
    id: "t_009",
    text: "This app idea has no business model but an incredible amount of emotional accuracy.",
    createdAt: "2019-01-17T23:18:00.000Z",
    likes: 7,
    reposts: 1,
    replies: 0,
    source: "year",
    sourceLabel: "2019"
  },
  {
    id: "t_010",
    text: "The group chat is the only institution I still trust.",
    createdAt: "2019-07-02T03:19:00.000Z",
    likes: 22,
    reposts: 4,
    replies: 2,
    source: "high_visibility",
    sourceLabel: "high visibility"
  },
  {
    id: "t_011",
    text: "If you need me I will be overexplaining a joke I should have simply deleted.",
    createdAt: "2020-04-30T20:20:00.000Z",
    likes: 15,
    reposts: 2,
    replies: 4,
    source: "keyword",
    sourceLabel: "delete"
  },
  {
    id: "t_012",
    text: "Reply guy mode is a public health concern and I am patient zero.",
    createdAt: "2020-09-13T12:55:00.000Z",
    likes: 3,
    reposts: 0,
    replies: 10,
    source: "replies",
    sourceLabel: "reply"
  },
  {
    id: "t_013",
    text: "Crypto feels like performance art for people who think accounting needs more adrenaline.",
    createdAt: "2021-02-07T18:08:00.000Z",
    likes: 33,
    reposts: 5,
    replies: 6,
    source: "keyword",
    sourceLabel: "crypto"
  },
  {
    id: "t_014",
    text: "I have never met a dashboard that did not eventually become a prison.",
    createdAt: "2021-08-21T19:30:00.000Z",
    likes: 67,
    reposts: 9,
    replies: 4,
    source: "high_visibility",
    sourceLabel: "high visibility"
  },
  {
    id: "t_015",
    text: "We are all just five bad screenshots away from becoming context collapse case studies.",
    createdAt: "2022-03-08T14:02:00.000Z",
    likes: 112,
    reposts: 18,
    replies: 12,
    source: "high_visibility",
    sourceLabel: "high visibility"
  },
  {
    id: "t_016",
    text: "This meeting could have been a calendar event declining itself.",
    createdAt: "2022-09-09T17:17:00.000Z",
    likes: 2,
    reposts: 0,
    replies: 0,
    source: "low_engagement",
    sourceLabel: "low engagement"
  },
  {
    id: "t_017",
    text: "At some point every timeline becomes an autobiography written by a person who was not done changing.",
    createdAt: "2023-01-15T08:18:00.000Z",
    likes: 78,
    reposts: 11,
    replies: 5,
    source: "random",
    sourceLabel: "random"
  },
  {
    id: "t_018",
    text: "Replying to this because apparently I have chosen public pedantry as today's cardio.",
    createdAt: "2023-06-06T22:06:00.000Z",
    likes: 5,
    reposts: 0,
    replies: 12,
    source: "replies",
    sourceLabel: "reply"
  },
  {
    id: "t_019",
    text: "There is no reason for my lunch opinion to be preserved with infrastructure-grade durability.",
    createdAt: "2024-02-02T13:40:00.000Z",
    likes: 17,
    reposts: 2,
    replies: 1,
    source: "low_engagement",
    sourceLabel: "low stakes"
  },
  {
    id: "t_020",
    text: "Building a thing where deleting posts feels less like admin and more like an arcade mistake.",
    createdAt: "2024-12-18T00:12:00.000Z",
    likes: 19,
    reposts: 3,
    replies: 2,
    source: "random",
    sourceLabel: "random"
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
