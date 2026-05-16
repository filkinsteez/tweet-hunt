export type TweetEngagementMetrics = {
  likes: number;
  reposts: number;
  replies: number;
  quotes?: number;
};

export function totalTweetEngagement(tweet: TweetEngagementMetrics) {
  return tweet.likes + tweet.reposts + tweet.replies + (tweet.quotes ?? 0);
}
