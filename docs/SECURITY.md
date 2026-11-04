# Security

Threat model and mitigations for this skills library. Written 04/11/2026.

**Honest status:** the mitigations below are implemented and covered by automated tests on the PC. **Nothing has been verified inside the Android app yet** (WebView isolation, secret storage, how Gemma reacts to hostile text). Items that depend on the app are marked *unverified*.

## What is being protected
- **API keys and tokens.** There are none in this project, by design.
- **Personal information** (location, names, searches, repositories you look up).
- **Your phone's behaviour.** A skill is code that runs in the app's hidden WebView with network access, and its text goes into the model's context.

## Threat model

| # | Threat | Where it could happen | Mitigation in this project | Evidence | Residual risk |
|---|---|---|---|---|---|
| 1 | A key or token leaks (committed, or sent to the model) | The repo is **public**, and skill scripts are served to anyone | Every skill is **keyless**. No `SKILL.md` declares `require-secret`, and a structure test fails if one does. `tests/secrets.test.js` scans every text file for GitHub, Google, AWS, Slack and OpenAI-style keys, bearer tokens, private-key blocks and assigned secret literals, and checks the scanner itself still catches samples | `tests/secrets.test.js`, `tests/structure.test.js` | A secret in a form the patterns do not know. Review changes before pushing |
| 2 | **Prompt injection** through API text (headlines, descriptions, commit messages, issue titles, place names, catalogue notes) | News, weather warnings, GitHub, API discovery | All external text goes through `cleanText`: HTML tags and scripts stripped, entities decoded, control characters removed, length capped, then wrapped in quotation marks by `quoteData` so it reads as quoted data. Each `SKILL.md` tells Gemma to report the result as it is and never to follow instructions or links in it | Per-skill tests feed `<script>`, `IGNORE ALL PREVIOUS INSTRUCTIONS` and oversized text and assert the output is neutral and capped | **Quoting reduces the risk but cannot remove it:** a small model may still obey quoted text. *Unverified on E2B/E4B.* Treat unexpected behaviour after reading news or GitHub text as a possible injection |
| 3 | Unexpected or malicious **response shape** (missing fields, wrong types, huge bodies) | Every network skill | Shapes are checked before use; a wrong shape is an error, never a guess. Per-source failures are shown as "unavailable", not hidden or invented. Fetches have a 10 s timeout. Bodies are read whole but only a few fields are used and capped | Per-skill tests for unreadable, unexpected, 4xx/5xx and timed-out responses | A very large response still costs memory and time on the phone |
| 4 | **Supply chain: the code that runs on your phone can change without you re-adding the skill** | GitHub Pages hosting | The app re-fetches `scripts/index.html` from your site on **every call** (verified in the app source, see `docs/TECHNICAL-RESEARCH.md`). Whoever can push to the repository controls code that runs in the WebView, with network access. So: protect the GitHub account with 2FA, never grant repository write access casually, review before pushing, and keep the build free of dependencies (`package.json` has none; no CDN scripts) | A structure test fails if any built skill has more than one `<script>`, a `<script src>`, a `<link href>` or dynamic code loading; the build refuses source containing `</script` | A compromised GitHub account. `SKILL.md` text is stored when you add the skill, so *instructions* cannot silently change, but *scripts* can |
| 5 | Installing a **community or newly discovered** skill automatically | Skill discovery | Nothing is installed automatically. `api-discovery` is a read-only lookup over a curated list and fetches nothing. Community skills are untrusted code: read them before loading | `tests/api-discovery.test.js` (no network available to it) | You loading something unread |
| 6 | **Untrusted API providers** | API catalogue | Every API is labelled `trusted` (official provider, checked against its own docs), `trusted-host-untrusted-content` (official host, third-party text) or `untrusted` (listing only). A test enforces that any API used by a skill is keyless, rated suitable and not plain `untrusted`. The public API lists in the brief were used only for discovery on the PC | `tests/api-catalogue.test.js` | Providers can change terms; entries carry test dates |
| 7 | **Privacy**: data leaving the phone | All network skills | Send the minimum (see the table below). No account, cookie, key or phone identifier is sent. Plain GET requests with no custom headers, except one `Api-User-Agent` header to Wikipedia | Tests assert the exact URLs and that no amount, query or extra data is sent | Providers see your IP address. Requests are not private from them |
| 8 | **Abuse of free services** (rate limits, bans) | Weather, currency, GitHub, news | Timeouts, rate-limit handling (HTTP 429/403 with reset time), a 1-hour cache for exchange rates, a request-saving `show` option for GitHub, and the remaining GitHub requests shown on every answer | Rate-limit and timeout tests with mocked responses | Shared IPs (home Wi-Fi) can hit limits sooner |
| 9 | Hostile **user input** | All skills | Input is parsed as JSON, then validated field by field with an error naming the field. Repository names, currency codes, topics and place names are matched against strict patterns or fixed lists | Validation tests in every skill's test file | |
| 10 | Wrong **content** presented as fact | Mandarin, news | Mandarin content is labelled **unreviewed** on every answer. News items are labelled as Wikipedia summaries or Hacker News titles, dated, sourced and never presented as the outlet's own headline | News: tests assert the labels and credits. Mandarin: the label is in every answer, but its tests are **not written yet** | The content can still be wrong |

## What leaves the phone, per skill

| Skill | Sent to | What | Notes |
|---|---|---|---|
| unit-converter | nobody | nothing | offline |
| api-discovery | nobody | nothing | offline |
| mandarin | nobody | nothing | offline |
| weather | `geocoding-api.open-meteo.com` | the place name you typed, plus your IP | |
| weather | `api.open-meteo.com` | latitude/longitude of the matched place (not your location), plus your IP | free tier is for non-commercial use |
| weather | `www.met.ie` | only your IP; the national warnings file is filtered on the phone | only for places in the Republic of Ireland |
| currency | `open.er-api.com` | the three-letter code of the currency you convert *from*, plus your IP | the amount never leaves the phone |
| news | `en.wikipedia.org` | the page titles requested (dates), an `Api-User-Agent` header naming this project and its repository URL, plus your IP | no personal data in the header |
| news | `hn.algolia.com` | the word "AI" for the AI topic; nothing else; plus your IP | |
| github-status | `api.github.com` | the `owner/name` you ask about, plus your IP | public repositories only, no token |

Local storage: only `currency` uses `localStorage` (public exchange rates for one hour). Nothing is stored about you.

## If a key ever becomes unavoidable
This needs your explicit approval first. The app's own mechanism (`require-secret: true`) shows a dialog and passes the key to the script as the second argument. From the app source (see `docs/TECHNICAL-RESEARCH.md`): the key is saved in the app's private data store; **whether that store is encrypted is unconfirmed**; the first three characters of a newly entered key are written to the device log; and the script that receives the key is loaded from your site on every call (threat 4). Use a key with the narrowest scope, never put it in the prompt, the repository or the script, and revoke it if in doubt.

## If something looks wrong
1. Stop using the affected skill (remove it in the app).
2. Check the repository's commit history on GitHub for changes you did not make.
3. If a secret was committed: revoke it at the provider first, then remove it from the history. Deleting the file is not enough.
4. Run `npm test` locally; the secret scan and structure checks should pass.

## Open items (need the phone)
- Is the WebView isolated from the app's other data? (not verified)
- Does the app keep secrets encrypted? (not verified; no skill uses one)
- How do E2B and E4B react to injected text in quoted results? (the on-device checklist has prompts for this)
- Does the app cache scripts so an update takes longer to arrive? (question U2 in the research notes)
