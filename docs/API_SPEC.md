# API spec

## POST /api/delete-round

Accepts a reviewed round deletion request.

### Request

```json
{
  "mode": "A",
  "roundNumber": 1,
  "tweetIds": ["t_001", "t_002"],
  "dryRun": true
}
```

### Rules

- `mode` must be `A` or `B` for deletion.
- `mode` `C` is rejected.
- `tweetIds` cannot exceed 10 per round.
- `dryRun` is true by default.
- Live deletion requires `ENABLE_LIVE_DELETE=true`, plus future OAuth and queue verification.

### Response

```json
{
  "ok": true,
  "dryRun": true,
  "acceptedTweetIds": ["t_001", "t_002"],
  "message": "Dry run accepted. No tweets deleted."
}
```

## Future endpoints

```txt
GET  /api/oauth/start
GET  /api/oauth/callback
POST /api/tweets/scan
POST /api/rounds/create
POST /api/rounds/:id/review
POST /api/rounds/:id/delete
GET  /api/jobs/:id
POST /api/jobs/:id/abort
```
