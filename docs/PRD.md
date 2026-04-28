# tweet-hunt PRD

## 1. Product summary

tweet-hunt is a single-player retro arcade experience where deleting tweets becomes the game mechanic. The user chooses a hunt mode, plays a round, hits tweet targets, sees quick flashes of what was hit, then reviews every bagged tweet before confirming deletion.

This is not a dashboard and not a bulk admin tool. The game is the selector. The review screen is the safety gate.

## 2. Product thesis

Deleting old tweets can be funny, tense, humiliating, and satisfying. The product should let that emotional texture exist inside a simple arcade loop.

The user should feel the pace of a game, then be slowed down by the review screen before anything destructive happens.

## 3. Modes

### Game A

One tweet bird appears at a time.

- 1 tweet target per volley
- 3 shots per volley
- Hit marks that tweet as bagged
- Miss lets that tweet escape
- Round contains 10 tweet targets

### Game B

Two tweet birds appear at a time.

- 2 tweet targets per volley
- 3 shots total for both targets
- Each bird maps to one tweet
- Hit marks the corresponding tweet as bagged
- Missed birds escape
- Round contains 10 tweet targets across 5 volleys

### Game C

Clay tweets are practice targets.

- 2 clay targets per volley
- 3 shots total per volley
- No tweet IDs
- No destructive action
- Score only

## 4. Core loop

1. User chooses Game A, Game B, or Game C.
2. If Game A or Game B, user chooses a tweet source: random, year, keyword, replies, low engagement, high visibility.
3. Round starts.
4. Targets fly.
5. Player shoots.
6. Hit target creates an immediate micro-reveal.
7. Hit tweets are bagged for review.
8. Missed tweets escape.
9. After 10 targets, round summary appears.
10. User reviews every bagged tweet.
11. User can spare tweets.
12. User confirms dry-run or live deletion.
13. User advances to next round or changes hunt.

## 5. Hybrid reveal model

### During play

A hit should not open a modal. It should flash a compact panel with:

- tweet snippet
- date
- points

This keeps the arcade rhythm intact.

### After the round

The user reviews the full text of every bagged tweet, in shot order. Each card includes:

- full text
- date
- engagement counts
- source label
- spare or delete state

## 6. Safety model

The arcade can look reckless, but the system cannot be reckless.

Required before live deletion:

- OAuth handled server-side
- no passwords requested
- tokens encrypted at rest
- tweet candidates generated server-side
- round queue hash generated server-side
- review state submitted to server
- delete endpoint verifies tweet IDs are from the reviewed round
- Game C is blocked from deletion at the API layer
- live deletion is feature flagged
- retries and rate-limit handling are implemented
- audit event created for every attempted delete

## 7. Functional requirements

### Gameplay

- Game A supports one active tweet target.
- Game B supports two active tweet targets.
- Game C supports two clay targets with no tweet data.
- Each volley has three shots.
- Each round has ten targets.
- Pass line increases by round.
- Targets have hit, fall, and escape states.
- Score increments on hit.
- Missed tweet targets are not deleted.

### Review

- Review appears after every round.
- Bagged tweets appear in hit order.
- User can spare individual tweets.
- User can spare all or mark all for deletion.
- Deletion cannot be confirmed from the playfield.

### API

- Dry-run deletion endpoint returns accepted tweet IDs.
- Game C requests must be rejected by deletion endpoint.
- Live deletion remains disabled by default.

## 8. Non-goals

- No scheduling
- No posting
- No engagement analytics platform
- No AI moral judgment of tweet content
- No one-click live deletion

## 9. Success criteria

- The game loop is understandable within 10 seconds.
- The user can complete Game A and Game B with mock tweets.
- The user sees tweet context immediately after hits.
- The user can review and spare tweets after the round.
- No live deletion can occur in the prototype by accident.
