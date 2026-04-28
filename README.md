# tweet-hunt

A single-player retro arcade prototype where tweets become targets, hits create fast micro-reveals, and the full deletion decision happens after each round.

## Modes

- Game A: one tweet bird at a time
- Game B: two tweet birds at a time
- Game C: clay tweets only, non-destructive

## Core rule

The arcade should feel risky. The product should not be risky.

A hit does not immediately delete a tweet. A hit marks the tweet as bagged for round review. At the end of the round, the player sees every hit tweet and can spare or confirm it.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Cursor starting point

Open the folder in Cursor, then use:

```txt
prompts/CURSOR_MASTER_PROMPT.md
```

## Current implementation

- Next.js app router
- TypeScript
- Canvas playfield
- Mock tweet data
- Game A, Game B, and Game C behavior
- 10 targets per round
- 3 shots per volley
- Micro tweet reveal during play
- Full round review after play
- Dry-run delete API endpoint
- Uploaded sprite sheet wired through an atlas

## Live deletion status

Live deletion is intentionally disabled. The current `/api/delete-round` route accepts dry runs only unless `ENABLE_LIVE_DELETE=true` is explicitly configured. Before enabling that, implement OAuth, server-owned tweet queues, queue hashing, exact review validation, rate-limit handling, retry logic, and audit logs.

## Asset note

The sprites in `public/sprites` are user-supplied prototype assets. Verify that you own or have licensed any assets before publishing or distributing the app publicly.
