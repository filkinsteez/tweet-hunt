# Cursor Task: Duck Call + Golden Duck Mass Delete

Project: `tweet-hunt`

Implement a keyboard and mobile duck call mechanic that can summon a golden duck. Do not add any Zapper, Raspberry Pi, RetroPie, Sinden, CRT, or hardware logic. This is browser-only input.

## Product intent

Normal gameplay:

```txt
normal bird = one tweet
hit normal bird = immediately delete that tweet
miss normal bird = tweet survives
```

New special mechanic:

```txt
duck call = summons a golden duck
golden duck = rare/special target
golden duck hit = immediately delete as many remaining tweets as possible from the current armed hunt set
```

This should feel like a secret arcade cartridge mechanic, not like a normal mass-delete button. The duck call is visible enough to use on mobile, but the UI should not over-explain the golden duck.

Core line:

```txt
The duck call does not delete anything. It calls the thing that can.
```

## Non-negotiables

1. No review flow.
2. No after-round confirmation.
3. No hardware/Zapper code.
4. Pressing `D` on desktop triggers the duck call.
5. A mobile/touch UI button must trigger the same duck call handler.
6. The duck call itself never deletes tweets.
7. Hitting the golden duck starts the mass delete immediately.
8. Golden duck mass delete is scoped only to the current armed hunt set.
9. Golden duck must never delete outside the selected mode/filter/scope.
10. Game C remains non-destructive unless explicitly converted later. For now, duck call in Game C can summon a non-destructive golden clay target for score only.

## Recommended behavior

### Eligibility

Duck call is available only when:

```txt
round is active
mode is Game A or Game B
live mode is armed
a hunt set exists
golden duck has not already appeared this round
golden flush is not already running
```

In Game C:

```txt
D key or mobile duck call button can trigger a harmless golden clay target
no tweets are deleted
no golden flush endpoint is called
```

### Summon flow

When user presses `D` or taps the mobile duck call button:

```txt
1. Play duck call UI state.
2. Briefly interrupt normal spawn rhythm, but do not freeze the entire app.
3. Show suspense beat for 700ms to 1400ms.
4. Spawn a golden duck from the edge of the playfield.
5. Golden duck flies faster than normal birds and stays on screen for a short window.
6. If missed, it escapes and nothing is deleted.
7. If hit, start Golden Flush.
```

The golden duck should feel surprising because of timing, animation, audio, and rarity, not because the deletion scope is hidden.

### Suggested tuning

```ts
const MAX_GOLDEN_DUCKS_PER_ROUND = 1
const DUCK_CALL_SUMMON_DELAY_MIN_MS = 700
const DUCK_CALL_SUMMON_DELAY_MAX_MS = 1400
const GOLDEN_DUCK_VISIBLE_MS = 1800
const GOLDEN_DUCK_SPEED_MULTIPLIER = 1.65
const GOLDEN_DUCK_POINTS = 5000
```

If an existing round system has difficulty/speed scaling, apply the golden duck multiplier on top of the current round speed.

## UI requirements

### Desktop HUD

Add a small HUD affordance:

```txt
D: DUCK CALL
```

States:

```txt
READY
CALLING
GOLDEN DUCK
SPENT
DISABLED
```

Do not label it as `MASS DELETE` during normal play. Keep it arcade-native.

### Mobile UI

Add an explicit touch affordance because mobile users do not have a keyboard.

Button requirements:

```txt
label: DUCK CALL
secondary text/state: READY, CALLING, SPENT, or DISABLED
location: fixed inside gameplay HUD, bottom-right or lower control strip
minimum touch target: 44px x 44px
calls the exact same handler as pressing D
```

Example:

```tsx
<button
  className="duck-call-button"
  disabled={!duckCall.canCall}
  aria-label="Use duck call. May summon a bonus target."
  onClick={handleDuckCall}
>
  <span>DUCK CALL</span>
  <small>{duckCall.label}</small>
</button>
```

Mobile copy should say `DUCK CALL`, not `SUMMON GOLDEN DUCK`, so the surprise remains.

## State model

Add or adapt these types in the game layer.

```ts
export type DuckCallStatus =
  | 'disabled'
  | 'ready'
  | 'calling'
  | 'summoned'
  | 'spent'

export type GoldenDuckState =
  | 'spawning'
  | 'flying'
  | 'impact'
  | 'falling'
  | 'escaped'
  | 'flush-active'
  | 'resolved'

export type DuckCallState = {
  status: DuckCallStatus
  callsUsedThisRound: number
  maxCallsPerRound: number
  canCall: boolean
  label: 'READY' | 'CALLING' | 'SPENT' | 'DISABLED'
}

export type GoldenDuckTarget = {
  id: string
  nonce: string
  state: GoldenDuckState
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  points: number
  spawnedAt: number
  expiresAt: number
  scopeId: string
  roundId: string
}

export type GoldenFlushProgress = {
  status: 'idle' | 'starting' | 'running' | 'paused' | 'complete' | 'failed'
  totalEligible: number
  deleted: number
  failed: number
  remaining: number
  currentSnippet?: string
  error?: string
}
```

## Keyboard input

Add a global game input handler that listens for `D`.

Important details:

```txt
Use keydown, not keypress.
Ignore repeated keydown events while key is held.
Ignore if focus is inside input, textarea, select, or contenteditable.
Call the same handleDuckCall function used by mobile button.
```

Example:

```ts
useEffect(() => {
  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null
    const tag = target?.tagName?.toLowerCase()
    const isTyping =
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      target?.isContentEditable

    if (isTyping) return
    if (event.repeat) return
    if (event.key.toLowerCase() !== 'd') return

    event.preventDefault()
    handleDuckCall()
  }

  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [handleDuckCall])
```

## Duck call handler

Implement the handler as the single source of truth.

```ts
async function handleDuckCall() {
  if (!canUseDuckCall()) {
    playDuckCallFailFeedback()
    return
  }

  setDuckCallStatus('calling')
  playDuckCallSoundOrVisualPulse()

  const delay = randomBetween(
    DUCK_CALL_SUMMON_DELAY_MIN_MS,
    DUCK_CALL_SUMMON_DELAY_MAX_MS
  )

  await sleep(delay)

  if (currentMode === 'C') {
    spawnGoldenClayTarget()
    setDuckCallStatus('summoned')
    return
  }

  spawnGoldenDuck()
  setDuckCallStatus('summoned')
}
```

`canUseDuckCall()` must check round state, live mode, scope, mode, and whether the call was already used this round.

## Golden duck hit behavior

When the golden duck is hit:

```txt
1. Set golden duck state to impact.
2. Show score popup.
3. Trigger golden duck falling animation.
4. Start Golden Flush immediately.
5. Display Golden Flush progress in HUD.
6. Continue animation while backend deletes.
```

Do not open a modal.
Do not ask for confirmation.
Do not run review.

Example client function:

```ts
async function onGoldenDuckHit(target: GoldenDuckTarget) {
  target.state = 'impact'
  addScore(GOLDEN_DUCK_POINTS)
  showGoldenDuckHitFeedback()

  setGoldenFlushProgress({
    status: 'starting',
    totalEligible: 0,
    deleted: 0,
    failed: 0,
    remaining: 0,
  })

  const stream = await startGoldenFlush({
    scopeId: target.scopeId,
    roundId: target.roundId,
    goldenDuckId: target.id,
    nonce: target.nonce,
  })

  consumeGoldenFlushProgress(stream)
}
```

## Server endpoint

Add or update this endpoint:

```txt
POST /api/live/golden-flush
```

Request:

```ts
type GoldenFlushRequest = {
  scopeId: string
  roundId: string
  goldenDuckId: string
  nonce: string
}
```

Server validation:

```txt
user is authenticated
live hard-delete mode is enabled
scope belongs to authenticated user
scope is currently armed
round belongs to that scope
goldenDuckId exists and was spawned by the server or trusted game session
nonce matches
golden duck has not already been consumed
mode is destructive mode A or B
Game C is rejected for deletion
tweet IDs are drawn only from remaining tweets in current armed hunt set
```

Deletion scope:

```txt
remaining tweets in current hunt set that have not already been deleted or escaped due to current game rules
```

If rate limits exist, delete as many as the backend can safely process and surface progress.

Return progress as either:

```txt
Server-Sent Events
WebSocket events
polling endpoint
```

Use whichever progress system already exists in the project. If none exists, implement simple polling first.

## Golden Flush HUD

During mass delete, show an in-world progress panel:

```txt
GOLDEN FLUSH
DELETED 041 / 842
CURRENT:
"tweet snippet..."
```

If the API pauses or fails:

```txt
GOLDEN FLUSH PAUSED
DELETED 217
REMAINING 625
REASON: RATE LIMIT
```

If complete:

```txt
FLOCK CLEARED
DELETED: 842
FAILED: 0
```

## Visual direction

Golden duck should be visually distinct from normal birds.

Implementation options:

1. Reuse bird sprite frames with a golden/yellow palette filter.
2. Add a CSS/canvas tint overlay.
3. Add sparkle pixels around the sprite.
4. Use faster motion and a slightly different arc.

Do not require new art assets for first implementation. Use tinting first.

Suggested canvas rendering approach:

```ts
ctx.save()
ctx.filter = 'sepia(1) saturate(2.2) hue-rotate(5deg) brightness(1.25)'
renderBirdSprite(ctx, goldenDuck)
ctx.restore()
```

If canvas filter does not work well with pixel art, draw the sprite normally and add a few 1px or 2px sparkle rectangles around it.

## Collision behavior

Golden duck uses the same hit detection as a normal bird in browser mode:

```txt
mouse click / touch shot intersects golden duck bounds
keyboard shoot, if supported, uses current aiming behavior
```

Duck call itself is separate from shooting.

## Round reset behavior

At the start of every round:

```ts
resetDuckCallState({
  status: liveMode && mode !== 'C' ? 'ready' : 'disabled',
  callsUsedThisRound: 0,
  maxCallsPerRound: 1,
})
clearGoldenDuck()
clearGoldenFlushProgress()
```

If Game C:

```ts
status can be ready for score-only golden clay target
but never destructive
```

## Copy deck

Use this copy.

Desktop HUD:

```txt
D: DUCK CALL
```

Mobile button:

```txt
DUCK CALL
READY
```

Call used:

```txt
CALLING...
```

Golden duck appears:

```txt
GOLDEN DUCK
```

Golden duck hit:

```txt
GOLDEN HIT
```

Mass delete running:

```txt
GOLDEN FLUSH
```

Mass delete complete:

```txt
FLOCK CLEARED
```

Golden duck missed:

```txt
GOLDEN DUCK ESCAPED
```

Rate-limited:

```txt
FLOCK RESTING
```

Disabled state:

```txt
NO CALL
```

## Acceptance criteria

Desktop:

```txt
Pressing D during an eligible live Game A or Game B round triggers duck call.
Holding D does not repeatedly trigger duck call.
Pressing D while typing in an input does nothing.
Duck call spawns one golden duck per round maximum.
Golden duck can be shot using existing browser shooting input.
Hitting golden duck starts golden flush immediately.
Golden flush deletes only tweets from the current armed hunt set.
Golden flush does not affect Game C.
```

Mobile:

```txt
A visible DUCK CALL button appears in the gameplay HUD.
The touch target is at least 44px x 44px.
Tapping it calls the same handler as pressing D.
Button state updates to CALLING, SPENT, or DISABLED.
The button does not say MASS DELETE or GOLDEN DUCK before the summon.
```

Safety/scope:

```txt
Golden duck never deletes outside the armed hunt set.
Golden duck cannot be triggered if no hunt set is armed.
Golden duck cannot be triggered on title screen, setup screen, or non-live states.
Golden duck nonce prevents replaying the endpoint.
Game C never calls the destructive golden flush endpoint.
```

## Implementation order

1. Add duck call state and UI affordance.
2. Add keyboard `D` handler.
3. Add mobile duck call button.
4. Add golden duck target rendering using existing bird sprite with tint.
5. Add golden duck spawn timing and one-per-round rule.
6. Add golden duck hit detection using existing collision system.
7. Add Golden Flush HUD progress.
8. Add `/api/live/golden-flush` endpoint with strict scope validation.
9. Wire endpoint to delete remaining tweets in current armed hunt set.
10. Test Game A, Game B, and Game C separately.

## Final note for Cursor

Preserve the arcade feel. Do not turn this into a dashboard, modal, or settings panel. The only visible affordance should feel like part of the game HUD:

```txt
D: DUCK CALL
```

and on mobile:

```txt
DUCK CALL
```
