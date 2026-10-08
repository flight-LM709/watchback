# `POST /api/durations`

Looks up video lengths for the watch-time estimate, plus a best guess at whether each video is a Short. Stateless apart from an in-memory cache.

```
POST /api/durations   { "ids": ["dQw4w9WgXcQ", ...] }    // 1..2000 IDs, each /^[A-Za-z0-9_-]{11}$/
200                   { "durations": { "dQw4w9WgXcQ": 213, "xxxxxxxxxxx": null },
                        "isShort":   { "dQw4w9WgXcQ": false, "xxxxxxxxxxx": null } }
```

* `null` in `durations` means removed, private, still live or upcoming (YouTube reports `P0D`), or unparseable.
* `isShort` was added later and is optional for clients; anything that reads only `durations` keeps working. Error responses don't include it.

### How `isShort` is decided

Only official API data is used (no youtube.com scraping), and it costs nothing extra: `part=player` with `maxHeight` rides in the same 1-unit `videos.list` call and returns `embedWidth`/`embedHeight` in the video's own aspect ratio.

| `isShort` | Rule |
| --- | --- |
| `true` | 3 minutes (180 s) or shorter **and** the player is vertical or square (`embedHeight >= embedWidth`) |
| `false` | Longer than 3 minutes, or landscape |
| `null` | Video unavailable, or the player shape wasn't returned |

The client should also treat any play whose history link is `/shorts/…` as a Short regardless of `isShort`, and leave `null` out of the Shorts/long-form split. A vertical clip of 3 minutes or less that was uploaded as a normal video will be counted as a Short; that's the known limit of an estimate built only from official data.
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

* One `videos.list` call (`part=contentDetails,player`, `fields` trimmed) per 50 uncached IDs, costing 1 quota unit. A full 2,000-ID request makes 40 calls, run 8 at a time.
* The free quota is 10,000 units a day. `YOUTUBE_DAILY_UNIT_BUDGET` (default 9,000) is a per-instance soft cap. YouTube's own `quotaExceeded` is the hard stop and shuts off lookups until the reset.
* The cache is an LRU of up to 50k `id → { seconds, isShort }` entries. Durations are cached for 7 days and `null` results for 1 day. It is per instance and in memory only.

## Privacy

* IDs are never logged or written anywhere. A test checks that `console` stays silent.
* The cache holds only `videoId → { seconds, isShort }`, with no link to a user or request.
* The rate limiter keys on a salted SHA-256 of the client IP (with a random salt per process), so it never stores the raw IP, and entries expire with the window.
* Responses are `Cache-Control: no-store`.

## Env

| Var | Default | Notes |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | (none) | YouTube Data API v3 key, server-side only. Restrict it to that API. |
| `YOUTUBE_API_MOCK` | off | `1` returns deterministic fake durations and `isShort` flags (a mix of true/false/null) so you can work locally or run QA without a key or spending quota |
| `YOUTUBE_DAILY_UNIT_BUDGET` | `9000` | |
| `DURATIONS_RATE_LIMIT` / `DURATIONS_RATE_WINDOW_SEC` | `10` / `600` | |

---

# `POST /api/thumb`

This route proxies one video thumbnail so the browser never contacts Google.

```
POST /api/thumb   { "id": "dQw4w9WgXcQ" }
200               image/jpeg bytes (1280×720 maxres if it exists, otherwise 480×360 hq; a 16:9 cover crop removes hq's bars)
400 / 404 / 429 / 504   JSON { "error": ... }, returned fast, never an empty 200
```

* **The ID goes in the body, not the URL.** Hosting platforms like Vercel record request paths in their logs, so `/api/thumb/{id}` would leave every favorite video's ID in those logs even though our code logs nothing. A POST body doesn't get logged that way.
* **No user data reaches Google.** The upstream request to `i.ytimg.com` carries only a fixed `Accept` header: no IP, cookies, user agent, or referrer. A test checks this.
* Timeout is 2.5 s, under the client's 3 s. A removed or unknown video returns 404. Rate limit is 30 requests per 10 minutes per client. Responses are `Cache-Control: private` and `Cross-Origin-Resource-Policy: same-origin`.

Client usage (the blob URL is same-origin, so the share-card export works):

```ts
const res = await fetch("/api/thumb", { method: "POST", body: JSON.stringify({ id }), signal: AbortSignal.timeout(3000) });
const src = res.ok ? URL.createObjectURL(await res.blob()) : PLACEHOLDER;
```
