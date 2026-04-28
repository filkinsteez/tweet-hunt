# Cursor master prompt for tweet-hunt

You are working in the `tweet-hunt` repository.

Build a single-player retro arcade tweet deletion game. The app is not a dashboard. The arcade loop is the primary experience.

## Product shape

- Game A: one tweet bird at a time
- Game B: two tweet birds at a time
- Game C: clay tweets only, non-destructive
- 10 targets per round
- 3 shots per volley
- hit means bagged for review
- miss means escaped
- actual deletion happens only after the round review screen

## Hybrid reveal

On hit, show a fast micro-reveal inside the gameplay HUD. Do not open a modal and do not stop the playfield. After the round, show the full list of hit tweets in shot order. Let the user spare individual tweets before confirming deletion.

## Safety rules

The game can feel reckless, but the delete system cannot be reckless.

Never implement live deletion directly from the canvas. Never let a client-provided arbitrary tweet ID list reach a live delete call. Add server-owned queues, queue hashes, OAuth, rate-limit handling, and review verification before enabling live delete.

Game C must never call a destructive route.

## First implementation steps

1. Run the app and verify Game A works with mock tweets.
2. Tighten Game B so two targets resolve cleanly with three shots total.
3. Improve Game C with better clay movement and scoring.
4. Improve the round review screen so it feels like a trophy wall, not an admin table.
5. Add server-side round IDs and queue hashing.
6. Only after that, begin OAuth and live tweet integration.

## Keep the product voice

Use short arcade language: hit, escaped, bagged, spared, round clear, game over, practice mode.

Avoid SaaS terms during play.
