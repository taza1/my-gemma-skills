# API candidates: weather (skill B)

Tested 04/11/2026. **CORS method:** real `fetch()` from a page at `https://example.com` in a Chromium browser (cross-origin, no custom headers), plus `curl` with `Origin: https://example.github.io`. This is strong evidence but **not** the Android WebView and not the final origin (`https://<user>.github.io`). Re-test on the phone (checklist item to add). Provider terms were read from the provider's own pages on the same date.

Discovery source for the shortlist: provider documentation and the Irish open-data portal; the four public-API catalogues were not needed because the candidates were already known. Catalogue listings are never trusted as providers.

## Accepted

### 1. Open-Meteo Forecast API (primary: current, forecast, feels-like, rain probability, wind, humidity)
| Criterion | Record |
|---|---|
| Provider and docs | Open-Meteo, https://open-meteo.com/en/docs |
| Authentication | None |
| HTTPS | Yes |
| CORS | Pass. Browser fetch from example.com: 200. `access-control-allow-origin: *`, exposes `retry-after` and `x-ratelimit-*` headers (04/11/2026) |
| Free tier and pricing | Free for **non-commercial** use only; "subscriptions or advertising make a site commercial"; personal use qualifies. https://open-meteo.com/en/terms |
| Rate limits | < 600/min, < 5,000/h, < 10,000/day, 300,000/month, per IP. Response headers `X-RateLimit-Limit/Remaining/Reset` observed (limit 600, window 60 s). https://open-meteo.com/en/terms |
| Terms | Data under CC BY 4.0, so **attribution required**. No User-Agent requirement. Terms page says nothing about browser/client-side use. No service guarantee |
| Data freshness | `current.interval` = 900 s (15 min) in the observed response |
| Privacy | Receives latitude/longitude of the chosen place (not the phone's location) plus the phone's IP. Logs may hold coordinates; deleted after 90 days (terms) |
| Maintenance | Actively served and documented; no changelog evidence collected beyond live responses |
| Fields verified | `current`: temperature_2m, apparent_temperature, relative_humidity_2m, wind_speed_10m, wind_gusts_10m, precipitation, weather_code. `daily`: temperature_2m_max/min, precipitation_probability_max, wind_speed_10m_max, weather_code. `wind_speed_unit=kmh` and `timezone=Europe/Dublin` honoured |
| Error shape | HTTP 400 `{"error":true,"reason":"Latitude must be in range..."}` (verified). 429 shape not triggered, assumed same JSON; mock in tests |
| **Verdict** | **Yes, with conditions:** personal non-commercial use only; show "Weather data by Open-Meteo.com (CC BY 4.0)"; stay far under limits |

### 2. Open-Meteo Geocoding API (place name to coordinates)
| Criterion | Record |
|---|---|
| Provider and docs | Open-Meteo, https://open-meteo.com/en/docs/geocoding-api |
| Authentication / HTTPS | None / Yes |
| CORS | Pass (browser fetch 200; `access-control-allow-origin: *`; `cache-control: public, max-age=86400`) |
| Free tier, limits, terms | Same terms page as above; same non-commercial condition |
| Data freshness | Static gazetteer (cached 24 h by the server) |
| Privacy | Receives the **place name typed by the user** and the phone's IP |
| Behaviour verified | `Dublin` returns 5 distinct places (Ireland, Georgia, California, Ohio, Texas), so the skill must show country/region and offer an optional `country` filter. No match returns HTTP 200 with **no `results` key** (not an error), so the skill must treat that as "place not found" |
| **Verdict** | **Yes, with conditions:** same as above; always display the resolved place (name, region, country) so the user can catch a wrong match |

### 3. Met Éireann warnings, national JSON (warnings)
| Criterion | Record |
|---|---|
| Provider and docs | Met Éireann via data.gov.ie, https://data.gov.ie/en_GB/dataset/weather-warnings ; feed `https://www.met.ie/Open_Data/json/warning_IRELAND.json` |
| Authentication / HTTPS | None / Yes |
| CORS | Pass for plain GET: browser fetch 200, `access-control-allow-origin: *`, `cache-control: public, max-age=60`. **OPTIONS preflight returns 405**, so the skill must send a simple GET with no custom headers (it will) |
| Licence | "Met Éireann Custom Open Data Licence", based on CC BY 4.0 plus: **acknowledge Met Éireann**; you **must not materially change** time of issue, onset, expiration, area, description, severity, certainty, event or headline; **keep warnings current and remove expired ones**; no liability for errors/omissions/availability. Commercial reuse allowed. Source: data.gov.ie dataset page (full licence ODT not read) |
| Rate limits | Not stated on the dataset page |
| Data freshness | "Continuous" per dataset page; edge cache 60 s |
| Privacy | The national file is fetched whole; **no location leaves the phone** (filtering is local). Met Éireann sees only the phone's IP |
| Schema | **Verified 04/11/2026** from Met Éireann's official `JSONExample.zip` (downloaded with your OK, 2,006 bytes) and from the live `warning_ALL.json`. Array of objects: `id`, `capId`, `type` (e.g. Wind, Rain, low-temperature, Gale, small-craft, Advisory, Blight), `severity`, `certainty`, `level` (yellow/orange/red), `issued`, `updated`, `onset`, `expiry` (ISO 8601 with offset), `headline` (area names appear in this text), `description` (**HTML**, e.g. `<p>`/`<ul>`), `status` ("Warning" or "Advisory"), `regions` (codes like `EI14`, marine `EI811`). Empty array = none. The code-to-county mapping is not documented, so the skill must not filter by region code |
| Which file | `warning_IRELAND.json` = land warnings only (empty live, 3 land examples in the sample). **`warning_ALL.json` is a superset** that also carries marine (Gale, small-craft) and Advisory items; live it held 3 small-craft warnings while IRELAND was `[]`. CORS for ALL: browser fetch 200, ACAO `*`, `cache-control: public, max-age=60`. **Use `warning_ALL.json`** and label marine items as such |
| Fixtures | `tests/fixtures/` holds the official sample and a live capture, unmodified, with attribution |
| Related | `warning_EI16.json` returned 404. The RSS feed `https://www.met.ie/warningsxml/rss.xml` is reachable by curl (ACAO `*`) but a **browser fetch failed**, so it is not used. It contained marine "Small Craft" items while the JSON was empty, so the two feeds are not equivalent |
| **Verdict** | **Yes, with conditions:** pass warning text through unchanged and quoted; treat `[]` as "no warnings listed in this feed", never as "no weather risk"; if the shape is unrecognised say warnings could not be read; link met.ie. Descriptions are HTML and must be stripped to text (untrusted data); drop items whose `expiry` has passed |

## Conditional / not primary

### 4. MET Norway Locationforecast 2.0 (fallback forecast only)
| Criterion | Record |
|---|---|
| Docs / terms | https://api.met.no/weatherapi/locationforecast/2.0/documentation ; https://api.met.no/doc/TermsOfService |
| Authentication / HTTPS | None / Yes |
| CORS | Pass (browser fetch 200; ACAO `*`; `Access-Control-Allow-Headers: Origin` only) |
| Terms | CC BY 4.0, attribution required. Identifying User-Agent required "if possible"; where it cannot be set (simple cross-origin JS) the `Origin` header identifies the site. **Terms say browsers and mobile apps should not call the API directly but use a proxy**, with low-volume simple requests tolerated; CORS preflights and custom headers not supported. >20 req/s needs agreement |
| Fields | `compact` response had air_temperature, relative_humidity, wind speed/direction, pressure, cloud cover, precipitation_amount. **No feels-like and no precipitation probability observed** in the compact format |
| **Verdict** | **No for the primary role** (missing required fields; terms discourage direct app use). Kept only as a documented fallback |

### 5. wttr.in
CORS passes (ACAO `*`), returns JSON with feels-like, humidity, rain chance. **Rejected**: community service with no published terms, rate limits or uptime commitments that I could find; a personal reliability risk. See `rejected-apis.md`.

## Design implications for the weather skill
- Two-step call (geocode, then forecast) with one overall 10 s timeout budget; well inside the app's 60 s limit.
- Parameters: `place` (required text), `country` (optional text, e.g. "IE"), `days` (optional, proposed 1-3, default 2). Defaults: °C, km/h, mm, Europe/Dublin, dates DD/MM/YYYY, 24 h time.
- Output always names the resolved place, shows the data timestamp (`current.time`, Europe/Dublin) and the sources, and ends with the CC BY 4.0 attribution line.
- Warnings are a separate, clearly labelled section; a failed warnings fetch must say "Warnings unavailable" and never be silently dropped.
- All API text is treated as untrusted: strip, truncate, mark quoted.

---

# API candidates: currency (skill D)

Tested 04/11/2026 with the same method as the weather section (browser `fetch` from `https://example.com`, plus `curl` with an `Origin` header). Terms read from provider pages the same day. Not yet tested in the Android WebView.

## Accepted

### ExchangeRate-API, open-access endpoint (`https://open.er-api.com/v6/latest/{CODE}`)
| Criterion | Record |
|---|---|
| Provider and docs | ExchangeRate-API. Docs https://www.exchangerate-api.com/docs/free ; terms https://www.exchangerate-api.com/terms |
| Authentication | None |
| HTTPS | Yes |
| CORS | Pass. Browser fetch 200; `access-control-allow-origin: *`; `Cache-Control: public, max-age=3600` (04/11/2026) |
| Free tier and pricing | Free, no key. Terms: free and paid accounts are "suitable for either commercial or personal use"; the licence is "non-transferable, non-exclusive, revocable and limited"; free plans can change or be discontinued "without notice" |
| Rate limits | Docs say the open endpoint "has to be rate limited", suggest at most one request per 24 h (or per hour if you cannot cache); over-limit IPs get **HTTP 429**, lifted after **20 minutes**. No numeric quota published |
| Terms | **Attribution:** the docs page requires a link "Rates By Exchange Rate API"; the terms page states none. The stricter docs wording is followed. **No redistribution**, and not for products that give programmatic access to rates. **Caching for end-use only is allowed.** Client-side/browser use: not addressed |
| Data freshness | Once per day. Observed `time_last_update_utc` 00:02 UTC, `time_next_update_utc` about 24 h later; response carries both |
| Privacy | Receives the **base currency code** in the URL and the phone's IP. No amount, no personal data |
| Maintenance | Response includes `time_eol_unix` (0 = no planned retirement). 166 currencies in the EUR response |
| Accuracy | Terms: "informational or illustrative purposes"; use for actual transactions "is explicitly not recommended"; no accuracy guarantee. The page does not name where the rates come from, so the skill calls them **indicative** |
| Error shapes | Unsupported base (`/latest/XXX`) returns **HTTP 200** with `{"result":"error","error-type":"unsupported-code"}` (verified). Lower-case base accepted (verified) |
| **Verdict** | **Yes, with conditions:** show the attribution link; never present rates as transaction-grade; cache (1 h in the skill) to stay polite; send only the base code |

## Conditional / not used

### fawazahmed0/currency-api via jsDelivr (`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json`)
CORS passes (browser 200; ACAO `*`). Licence CC0-1.0, daily updated, "no rate limits" per its README, fallback host recommended by the author. **The README does not say where the rates come from**, and it mixes crypto and metals with fiat. Community-run, unverifiable provenance, so **not used** (candidate fallback only if ever needed; would be marked untrusted).

### Frankfurter (`api.frankfurter.dev`, v1 deprecated, v2 current)
Docs (https://frankfurter.dev/) describe central-bank/official sources, no key, no hard quotas, daily updates, and say nothing about CORS. **At test time every v1 and v2 request returned Cloudflare HTTP 522 (origin unreachable) from curl, and the browser fetch timed out**, while the docs site itself returned 200. CORS could therefore not be tested. **Verdict: could not be assessed; revisit later.** Better provenance than the chosen API, so worth re-testing; self-hosting would need a server and your approval.

---

# API candidates: news (skill C)

Tested 04/11/2026 (same method: real browser `fetch()` from `https://example.com`, plus `curl` with an `Origin` header; not yet tested in the Android WebView).

## Headline finding
**Every mainstream publisher RSS feed failed the browser CORS test**: BBC (top, technology, business, world), RTÉ, The Guardian (world, AI, business), NPR (sends `Access-Control-Allow-Origin: https://apps.npr.org` only), Al Jazeera, The Irish Times, Ars Technica, The Verge, TechCrunch. A skill running in the WebView cannot read them without a proxy. This is the "many news APIs forbid client-side use" case the brief anticipated. What does work is below.

## Accepted (with conditions)

### 1. Wikipedia "Portal:Current events" day pages, via the MediaWiki Action API (general, international, business, some technology)
| Criterion | Record |
|---|---|
| Provider and docs | Wikimedia. https://www.mediawiki.org/wiki/API:Main_page ; etiquette https://www.mediawiki.org/wiki/API:Etiquette |
| Endpoint | `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content\|timestamp&rvslots=main&format=json&formatversion=2&origin=*&titles=Portal:Current_events/2026_November_3\|...` (several day pages in **one** request, verified with 3 titles) |
| Authentication / HTTPS | None / Yes |
| CORS | Pass with `origin=*` (browser fetch 200; `access-control-allow-origin: *`). **Preflight for a custom `Api-User-Agent` header also passes** (`access-control-allow-headers: api-user-agent`) |
| Terms | Text is **CC BY-SA 4.0**: credit by linking the page URLs, state the licence with a link, indicate changes, adaptations stay CC BY-SA (reuse page read 04/11/2026; not legal advice). Wikimedia asks for a meaningful User-Agent; browsers may send `Api-User-Agent` instead |
| Rate limits | "No hard speed limit on read requests, but be considerate"; serial requests; batch titles with `\|` |
| Data shape (verified) | Wikitext: category headings such as `'''Business and economy'''`, nested bullets `*`/`**`/`***`, each leaf ends with an editor-cited source link like `[https://www.reuters.com/... (Reuters)]` or `(AFP via France 24)`. Categories seen on 3 Nov: Armed conflicts and attacks, Art and culture, Business and economy, Disasters and accidents, Law and crime, Politics and elections, Sports. The set varies by day |
| Dates | Per **day page** (the event day), plus the page's last-edit timestamp. This is the event date, **not the publisher's timestamp** |
| Freshness | Edited continuously, but the page for the current day can be a near-empty stub for much of the day (4 Nov page was a 190-byte stub at about 10:50 Dublin; 3 Nov had 38 lines). Technology coverage is patchy (no Science and technology section on 3 Nov) |
| Privacy | Only the page titles (dates) are requested; Wikimedia sees the phone IP |
| Trust | Volunteer-written summaries that can be wrong or vandalised, and the "(Reuters)" label is an editor's claim. Treated as untrusted data, quoted, with the cited source and link kept |
| **Verdict** | **Yes, with conditions:** CC BY-SA attribution line; send `Api-User-Agent`; say plainly that items are Wikipedia summaries citing a source, not the outlet's own headlines |

### 2. Hacker News via the Algolia HN Search API (technology, AI)
| Criterion | Record |
|---|---|
| Provider | Hacker News (Y Combinator) data via Algolia, `https://hn.algolia.com/api/v1/` |
| Authentication / HTTPS | None / Yes |
| CORS | Pass for a simple GET (browser fetch 200; `access-control-allow-origin` echoes the origin) |
| Fields (verified) | `title`, `url` (absent for Ask HN posts), `created_at` (ISO UTC), `created_at_i`, `points`, `num_comments`, `objectID`. Supports `tags=front_page`, `tags=story`, `numericFilters=created_at_i>N,points>N`. One request returns the 48 h AI list |
| Terms and limits | **Not documented** on the pages I could read. The `algolia/hn-search` repository was **archived (read-only) on 10/02/2026**, though the API still answered on 04/11/2026 |
| Privacy | Receives the search word (e.g. "AI") and the phone IP |
| Trust | Titles are chosen by the submitter, and the linked articles belong to third parties. Untrusted data, quoted |
| **Verdict** | **Yes, with conditions:** undocumented limits and an archived project mean it could change or vanish; on failure the skill says so and Wikipedia still works. Documented alternative: item 3 |

### 3. Hacker News official Firebase API (fallback, not built)
Documented at https://github.com/HackerNews/API : "no rate limit", MIT, fields `title`, `url`, `time`, `score`. CORS passes (ACAO echoes origin). But it needs one request per story (about 31 requests for 30 stories) and local keyword filtering for AI. **Verdict: acceptable fallback if Algolia disappears; heavier on battery and data, so not the primary.**

## Not usable now (see rejected-apis.md)
Publisher RSS (CORS), rss2json (third-party proxy), NewsAPI (key; HTTP 426 in browser), GDELT (rate limited to one request per 5 s, about 10 s latency), keyed APIs.

## Option that needs your approval: your own small proxy
A tiny Cloudflare Worker could fetch the BBC / RTÉ / Guardian RSS feeds and return JSON with CORS headers, giving **real headlines with real publication times** for general, Irish, world and business news. Cost and effort (to be verified before relying on them): the free Cloudflare tier is believed to be ample for personal use but I have not checked the current limits; you would own a Cloudflare account and deploy with `wrangler`; the publishers' RSS terms (BBC's are non-commercial/personal) have not been read. **Not built. Requires your explicit approval** (brief, section 9).

## Proposed design if approved (Wikipedia + Hacker News)
- `topic`: `general` (default), `world`, `business`, `technology`, `ai`. `days`: 1 or 2 (default 2, matching the 48-hour threshold).
- `general` / `world` / `business`: Wikipedia current-events items from today and the previous days, grouped by category (world = Armed conflicts, International relations, Politics, Disasters; business = Business and economy). `technology`: Hacker News front page (48 h) plus Wikipedia Science and technology. `ai`: Hacker News "AI" search (48 h, points threshold).
- Every item shows its date, its source (cited outlet for Wikipedia, site domain for HN) and a link; items older than the threshold are dropped and counted; nothing is invented when a day is empty.
- Output ends with the CC BY-SA line (Wikipedia) and a note that HN titles are submitter-written.

---

# API candidates: GitHub status (skill F)

Tested 04/11/2026 with the same method as the other sections: real browser `fetch()` from `https://example.com`, plus `curl` with an `Origin` header. Not yet tested in the Android WebView. Docs read the same day: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api and https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests

## Accepted

### GitHub REST API, unauthenticated, public repositories (`https://api.github.com`)
| Criterion | Record |
|---|---|
| Provider and docs | GitHub. https://docs.github.com/en/rest |
| Authentication | **None used.** No personal access token (brief, section 7F) |
| HTTPS | Yes |
| CORS | Pass. Browser fetch 200 for `/repos/{o}/{r}`, `/releases/latest`, `/commits`, `/issues`, `/rate_limit`, and 404 bodies readable. `Access-Control-Allow-Origin: *`; `Access-Control-Expose-Headers` lists `X-RateLimit-Limit/Remaining/Used/Reset/Resource` and `Retry-After`, so the page can read its own rate limit. GitHub's CORS page states the REST API supports CORS "from any origin". Preflight allows `User-Agent` and `X-GitHub-Api-Version`, but the skill sends **no** custom headers (plain GET) |
| Free tier and pricing | Free |
| Rate limits | **60 requests per hour per IP address when unauthenticated** (docs). Reported in `x-ratelimit-limit/remaining/used/reset/resource` on every response (observed 60, counting down). Exceeding returns **403 or 429** with `x-ratelimit-remaining: 0`; secondary limits (concurrency 100, 900 points/min for REST) apply; wait for `retry-after` or `x-ratelimit-reset`. The limit is shared by everything on the same IP (home Wi-Fi, other apps), so the remaining count can be lower than expected |
| Terms | GitHub's API terms apply; no attribution requirement found. The docs state no User-Agent rule for browsers |
| Data freshness | `Cache-Control: public, max-age=60, s-maxage=60` observed, so repeated lookups within a minute may come from cache (not counted) |
| Privacy | Receives the **owner/repo names you look up** and the phone's IP address. No account, token or personal data |
| Maintenance | Versioned (`x-github-api-version-selected: 2022-11-28` observed) |
| Fields verified | Repo: `full_name`, `description`, `stargazers_count`, `forks_count`, `open_issues_count` (**includes pull requests**), `pushed_at`, `created_at`, `archived`, `fork`, `default_branch`, `language`, `license.spdx_id`, `has_issues`. Release: `tag_name`, `name`, `published_at`, `prerelease`, `body`. Commits: `sha`, `commit.message`, `commit.author.{name,date}`. Issues: `number`, `title`, `created_at`, `user.login`, `comments`, and a `pull_request` key on **pull requests, which the issues endpoint mixes in** (3 of 10 in the fixture) |
| Error shapes | Missing repo or no releases: HTTP 404 `{"message":"Not Found","documentation_url":...,"status":"404"}` (verified). Empty repository commits: HTTP 409 per GitHub docs (not triggered here). Rate limit: 403/429 (not triggered; mocked) |
| **Verdict** | **Yes, with conditions:** public repositories only; each full lookup costs up to 4 of the 60 hourly requests, so the skill offers cheaper views (`show`) and always reports the remaining count; treat every returned string as untrusted |

## Not used
Authenticated access (a personal access token would have to live in the page or be typed into the secret dialog; the brief forbids tokens for this skill), the GraphQL API (needs authentication), the GitHub search API (separate, stricter limit; only needed for an exact open-issue count).

## Design notes
- Parameters: `repo` (required, `owner/name` or a github.com URL) and `show` (`all` default, `summary`, `release`, `commits`, `issues`).
- Request plan: one request for the repository first (a 404 stops everything, saving the quota), then the requested extras in parallel. `all` = 4 requests, `summary` = 1.
- "Open issues" from GitHub's own count includes pull requests, so it is labelled "open issues and pull requests". The listed issues exclude pull requests.
- Output ends with a line showing the remaining requests and the reset time (Europe/Dublin), marked "running low" at 10 or fewer.
