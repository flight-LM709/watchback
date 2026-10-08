# `POST /api/durations`

Looks up video lengths for the watch-time estimate. Stateless apart from an in-memory cache.

```
POST /api/durations   { "ids": ["dQw4w9WgXcQ", ...] }    // 1..2000 IDs, each /^[A-Za-z0-9_-]{11}$/
200                   { "durations": { "dQw4w9WgXcQ": 213, "xxxxxxxxxxx": null } }
```

* `null` means removed, private, still live or upcoming (YouTube reports `P0D`), or unparseable.
* An ID missing from `durations` (one batch failed upstream) should be treated as `null`.
* Every error response still has `"durations": {}`, so the client's "no durations → drop slide 5" path covers them all.

| Status | `error` | When |
| --- | --- | --- |
| 400 | `invalid_json`, `ids_required`, `invalid_id`, `too_many_ids` | Bad request; more than 2,000 unique IDs |
| 413 | `body_too_large` | Body over 64 KB |
| 429 | `rate_limited` | Over 10 requests per 10 minutes from one client (`Retry-After` set) |
| 429 | `daily_budget_exhausted` | Daily unit budget spent or YouTube said `quotaExceeded`; partial results are dropped. Resets at midnight Pacific (`Retry-After` set) |
| 502 | `upstream_failed` | Every YouTube call failed |
| 503 | `not_configured` | No `YOUTUBE_API_KEY` and mock mode off |

## Cost and guards

* One `videos.list` call (`part=contentDetails`, `fields` trimmed) per 50 uncached IDs, costing 1 quota unit. A full 2,000-ID request makes 40 calls, run 8 at a time.
* The free quota is 10,000 units a day. `YOUTUBE_DAILY_UNIT_BUDGET` (default 9,000) is a per-instance soft cap. YouTube's own `quotaExceeded` is the hard stop and shuts off lookups until the reset.
* The cache is an LRU of up to 50k `id → seconds` entries. Durations are cached for 7 days and `null` results for 1 day. It is per instance and in memory only.

## Privacy

* IDs are never logged or written anywhere. A test checks that `console` stays silent.
* The cache holds only `videoId → seconds`, with no link to a user or request.
* The rate limiter keys on a salted SHA-256 of the client IP (with a random salt per process), so it never stores the raw IP, and entries expire with the window.
* Responses are `Cache-Control: no-store`.

## Env

| Var | Default | Notes |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | (none) | YouTube Data API v3 key, server-side only. Restrict it to that API. |
| `YOUTUBE_API_MOCK` | off | `1` returns deterministic fake durations so you can work locally or run QA without a key |
| `YOUTUBE_DAILY_UNIT_BUDGET` | `9000` | |
| `DURATIONS_RATE_LIMIT` / `DURATIONS_RATE_WINDOW_SEC` | `10` / `600` | |
