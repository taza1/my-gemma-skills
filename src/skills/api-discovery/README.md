# api-discovery

**What it does:** searches the project's **curated API catalogue** (`data/api-catalogue.json`) by topic or keyword and returns each match's scorecard summary: verdict, trust label, key needed, HTTPS, CORS result and test date, limits, attribution, privacy, which skill uses it, and the docs link.

**Status:** Tested locally (automated tests). **Not yet tried on the phone.** Fully offline.

## What it is not
- It is **not a live search** and does not fetch the public API lists (public-apis and the others in the brief). Those were used only on the PC as discovery sources.
- It does **not** evaluate terms, test CORS, install or load anything, or follow links.
- The catalogue is a snapshot: every entry carries the date it was tested. The data is embedded in the skill's `scripts/index.html` when `npm run build` runs. **To update it:** edit `data/api-catalogue.json`, run `npm run build`, and publish. The app reloads `scripts/index.html` on every call, so new data is picked up without touching the skill in the app; remove and re-add the skill only if `SKILL.md` itself changed.

## Parameters
| Field | Type | Notes |
|---|---|---|
| `query` | text, optional | A topic or keyword ("weather", "currency", "news", "github", "hacker news"). Common synonyms work ("forex", "forecast", "repo", "headlines"). Empty lists the categories |

## Behaviour
- Matches category names, the names of the skills that use an API, and API names/ids only (not the free-text notes or URLs, so a word like "http" matches nothing); ranks category matches first, then usable verdicts before rejected ones. Up to 4 entries are shown with a count of the rest.
- Every entry is labelled **trusted** (official provider, verified against its own docs), **untrusted** (catalogue listing only), or "trusted host, untrusted content" (for APIs that return third-party text, such as Wikipedia or Hacker News).
- Free-text fields (limits, attribution, privacy) are cleaned, capped and quoted, since catalogue text is treated as data and never as instructions. Only `https://` docs links are shown.
- No match says so, lists the categories, and does not invent an API.

## What leaves the phone
Nothing. There is no network access.

## Errors
Only malformed input (not valid JSON / not an object). An unknown topic returns "No catalogue entries match ..." rather than an error.

## Example prompts
- "Which API can I use for exchange rates?"
- "Is there a free weather API that works from my phone?"
- "What APIs do you know about for news?"
- "Tell me about the GitHub API limits"

## Known limitations
Small catalogue (see the categories it lists). Keyword matching is simple, with a short synonym list. Entries are only as current as their test date.
