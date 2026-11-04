# news

**What it does:** recent news for the last 24 or 48 hours, by topic: general, world, business, technology or AI. Every item shows a date, where it came from, and the sources line at the end.

**Status:** Tested locally (mocked tests with real captured fixtures, plus a manual live run). **Not yet tried on the phone**, and not tested in the Android WebView.

## Important: what this is and is not
Publisher RSS feeds (BBC, RTÉ, Guardian, ...) **cannot be read from the app** because they send no CORS header (tested 04/11/2026, see `research/api-candidates.md`). So this skill does **not** return outlets' own headlines. It uses:
- **Wikipedia "Portal:Current events"** for general, world, business and some technology news. These are volunteer-written one or two sentence summaries that cite an outlet (e.g. Reuters, AFP via France 24). The date shown is the **day of the event**, not the outlet's publication time. Text is CC BY-SA 4.0.
- **Hacker News** (via Algolia HN Search) for technology and AI: exact submission time, site, points. Titles are chosen by whoever submitted the story.

Real headlines with publication times would need your own small proxy (not built; needs your approval).

## Parameters
| Field | Type | Notes |
|---|---|---|
| `topic` | text, optional | `general` (default), `world`, `business`, `technology`, `ai`. Aliases: `international`, `finance`, `tech`, `headlines` ... |
| `days` | 1 or 2, optional | Default 2 (the 48-hour threshold). Older items are not shown |

| Topic | Source | Selection |
|---|---|---|
| general | Wikipedia | All categories except sports and arts, up to 2 per category per day, 8 items in total |
| world | Wikipedia | Armed conflicts, international relations, politics, disasters |
| business | Wikipedia | Business and economy |
| technology | Wikipedia + Hacker News | Science and technology (up to 4) + the Hacker News front page (up to 5) |
| ai | Hacker News | AI search, more than 20 points, AI-related titles only, by points (up to 6) |

## What leaves the phone
| Provider | Receives |
|---|---|
| Wikipedia (`en.wikipedia.org`) | The titles of the day pages requested (e.g. `Portal:Current_events/2026_November_3`), the project identifier in an `Api-User-Agent` header, and the phone's IP address |
| Hacker News search (`hn.algolia.com`) | For AI: the search word "AI" and the time filter; for the front page: nothing but the request. Plus the phone's IP address |

No key, account or personal data. The Wikipedia request carries a custom header (`Api-User-Agent`), which makes the browser send a preflight; Wikimedia's API allows it (tested 04/11/2026).

## Behaviour
- Items older than the window are not requested or are skipped and counted ("N older than 48 h skipped").
- Wikipedia entries without a cited source are skipped and counted. If a day's page has no entries yet (today's page is often empty until late) the output says so: "No entries yet on Wikipedia for: 04/11."
- If one source fails, the other is still shown with "unavailable (reason)". If all requested sources fail, the skill returns an error.
- Each item's text is treated as untrusted: wiki markup, HTML and templates are stripped, text is capped (220 characters), quoted, and never executed or followed.
- Output ends with the Wikipedia CC BY-SA 4.0 credit (when Wikipedia is used) and the retrieval time in Europe/Dublin.

## Errors (never invented news)
Unknown topic; `days` not 1 or 2; Wikipedia / Hacker News unreachable, timing out (10 s each), HTTP errors or unexpected shapes. An empty result says "no matching items", not made-up items.

## Example prompts
- "What's in the news?"
- "Business news from the last day"
- "Any world news today?"
- "Latest AI news"
- "Tech headlines"

## Known limitations
Not tested on a device. Not the outlets' own headlines. Hacker News search is an archived project with undocumented limits (it could change). Wikipedia pages can be wrong or incomplete, and coverage of technology there is patchy. English only.
