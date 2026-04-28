# AGENTS.md

You are building tweet-hunt, a single-player retro arcade prototype for reviewing and deleting tweets.

Game A uses one tweet bird at a time. Game B uses two tweet birds at a time. Game C uses non-destructive clay tweets.

Use the arcade loop as the product center. The canvas is not decoration. It is how the user selects candidates.

Safety is mandatory: hit means bagged for review, not deleted. Deletion happens only after the round review screen. Game C never deletes.
