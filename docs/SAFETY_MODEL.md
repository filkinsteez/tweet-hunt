# Safety model

## Principle

The interaction can feel fast. The destructive system must remain slow and explicit.

## Current prototype

The current build uses mock tweets and a dry-run delete endpoint. No live tweet deletion can occur unless the app is extended and the environment flag is changed.

## Required live deletion gates

Before live deletion ships, add these controls:

1. OAuth with minimal scopes.
2. Server-side token storage with encryption.
3. Server-owned candidate queues.
4. Queue hash for the round.
5. Review screen signed or verified by the server.
6. Delete endpoint verifies every tweet ID belonged to the reviewed round.
7. Game C requests are rejected.
8. Live deletion flag is off by default.
9. Rate-limit handling and retry caps.
10. Audit log for every deletion attempt.

## Bad patterns to avoid

- Delete on hit without review.
- Let client-supplied arbitrary tweet IDs reach a live delete route.
- Use Game C for any destructive action.
- Hide the number of tweets being deleted.
- Continue deleting if the user aborts remaining work.
