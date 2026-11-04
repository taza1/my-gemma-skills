# On-device test checklist

Before testing: load the skill by its URL from `CATALOG.md`, tick it on in the Skills list, and use a fresh chat. If you change `SKILL.md` later, remove and re-add the skill (the app reads it only when added). Expand the "Call JS script" panel in the chat to see the data Gemma sent and the console log.

Record **P** (pass) or **F** (fail, with a note). Test both models.

## unit-converter

| # | Prompt | Expected | E2B | E4B |
|---|---|---|---|---|
| 1 | Convert 10 miles to km | Skill is called; answer 16.09344 km | | |
| 2 | What is 70 F in Celsius? | 21.11111 °C | | |
| 3 | How many MiB is 2 GiB? | 2048 MiB, with the 1024-based note | | |
| 4 | 5 kg to pounds | 11.02311 lb | | |
| 5 | Convert 5 kg to km | Error naming mass vs length; Gemma does not invent an answer | | |
| 6 | Convert -300 C to F | "below absolute zero" error | | |
| 7 | Convert 3 furlongs to metres | "Unknown unit" error; no invented answer | | |
| 8 | How tall is 6 feet 2 inches in cm? | Gemma may call twice or combine; note what it does | | |
| 9 | What is the capital of France? | Skill is NOT called | | |

Also note: time to answer, and whether Gemma passed `value` as a number (visible in the call panel).

## weather

Needs internet. The first real-WebView CORS test happens here: if every prompt fails with "Could not reach ...", open the console log in the call panel and tell me the exact message.

| # | Prompt | Expected | E2B | E4B |
|---|---|---|---|---|
| 1 | What's the weather in Galway? | Skill called with `place: "Galway"`; place line, "Now (...)", 2 forecast days, warnings section, sources line | | |
| 2 | Will it rain in Cork tomorrow? | Rain chance for tomorrow quoted from the result | | |
| 3 | Any weather warnings for Dublin? | Warnings section (or "none listed ... does not mean there is no weather risk") reported without invention | | |
| 4 | Weather in Dublin, Ohio | Resolves to Ohio, says Irish warnings were not checked | | |
| 5 | 3 day forecast for Bray | `days: 3`, three forecast lines | | |
| 6 | What's the weather? (no place) | Gemma asks which place; skill is NOT called with a guessed place | | |
| 7 | Weather in Zzqxqxqx | "Place not found" relayed, no invented weather | | |
| 8 | Turn on flight mode, ask for Cork weather | Clear "Could not reach ..." error, no invented weather | | |

Also note: total time to answer, whether the sky/temperature numbers match the Open-Meteo website for the same place, and whether the output fits on screen without scrolling too much.

## currency

Needs internet. Rates update once a day, so compare with a second source only roughly (small differences are normal).

| # | Prompt | Expected | E2B | E4B |
|---|---|---|---|---|
| 1 | Convert 100 dollars to euro | Skill called with `amount 100, from USD, to EUR`; rate, update time, source line | | |
| 2 | How much is 50 GBP in yen? | Result in JPY with no decimals | | |
| 3 | What's the euro rate against the pound? | `from` EUR, `to` GBP, amount 1 | | |
| 4 | Convert 250 euro | Gemma asks which currency, or passes only `from: EUR` and the skill asks which; no invented rate | | |
| 5 | Convert 100 pesos to euro | "Unknown currency" style answer or Gemma asks which peso; no invented rate | | |
| 6 | Convert 100 USD to EUR again, straight after #1 | Second answer says "Cached" (no new request) | | |
| 7 | Flight mode on: convert 100 USD to EUR (use a currency not yet cached, e.g. CAD) | Clear "Could not reach ..." error, no invented rate | | |
| 8 | Is that rate exact? | Gemma repeats that rates are indicative | | |

Also note: whether Gemma keeps the source/attribution line in its reply.

## news

Needs internet. This skill calls Wikipedia with a custom `Api-User-Agent` header, so it is also the first real test of a CORS preflight from the app. If everything fails with "Could not reach Wikipedia", copy the console message from the call panel.

| # | Prompt | Expected | E2B | E4B |
|---|---|---|---|---|
| 1 | What's in the news? | Skill called (no topic or `general`); dated items with cited outlets; Wikipedia credit line | | |
| 2 | Business news from the last day | `topic: business`, `days: 1`; business items only | | |
| 3 | Any world news today? | `topic: world`; may say today's Wikipedia page has no entries yet | | |
| 4 | Latest AI news | `topic: ai`; Hacker News items with time, site and points; no Wikipedia section | | |
| 5 | Tech headlines | `topic: technology`; Hacker News and Wikipedia sections | | |
| 6 | Tell me about the news in Ireland | Gemma should explain the skill has no Ireland-specific feed and offer general/world, not invent Irish headlines | | |
| 7 | Flight mode on: what's the news? | Clear "Could not reach ..." error, no invented news | | |
| 8 | Are these the BBC's headlines? | Gemma explains items are Wikipedia summaries citing outlets, not the outlets' own headlines | | |

Also note: whether the answer stays short enough to read on the phone, and whether the item dates look right.

## api-discovery

Works offline (flight mode is fine). It only reads the curated catalogue that was embedded when the skill was built, so it also doubles as a quick "does the skill system work at all" test.

| # | Prompt | Expected | E2B | E4B |
|---|---|---|---|---|
| 1 | Which API can I use for exchange rates? | Skill called with a query like `currency`; ExchangeRate-API first, with verdict, trust, limits and attribution | | |
| 2 | Is there a free weather API that works from my phone? | `weather`; Open-Meteo, Met Éireann, MET Norway; no invented API | | |
| 3 | What APIs do you know about? | Empty query: category list and entry count | | |
| 4 | Is there an API for quantum teleportation? | "No catalogue entries match ..."; Gemma does not invent one | | |
| 5 | Is the Hacker News search API safe to use? | Entry with "trusted host, but the content it returns is untrusted" and "limits not documented"; Gemma keeps the caveats | | |
| 6 | Visit the docs link for the GitHub API | Gemma should not claim to browse; it may repeat the link as text | | |

Also note: whether Gemma keeps the "dated notes" caveat and whether it picks sensible `query` words.

## github-status

Needs internet. Public repositories only; GitHub allows 60 requests an hour per network, and a full lookup uses up to 4, so a quick summary is kinder to the limit. Because other apps on the same Wi-Fi share that limit, the "requests left" number may already be lower than 60.

| # | Prompt | Expected | E2B | E4B |
|---|---|---|---|---|
| 1 | How active is google-ai-edge/gallery on GitHub? | Skill called with `repo: "google-ai-edge/gallery"`; stars, release, commits, issues, requests-left line | | |
| 2 | Quick summary of github.com/octocat/Hello-World | `show: summary` or all; "Latest release: none published" if all | | |
| 3 | Latest release of google-ai-edge/gallery | `show: release` (or all) | | |
| 4 | What's the status of my GitHub repo? | Gemma asks which repository; skill is NOT called with a guess | | |
| 5 | GitHub status for octocat/this-repo-does-not-exist-xyz | "was not found ... may be private", no invented details | | |
| 6 | Flight mode on: GitHub status of google-ai-edge/gallery | Clear "Could not reach GitHub" error | | |
| 7 | Ask the same question 3 times quickly | Requests-left number drops; no crash | | |

Also note: whether Gemma keeps the "requests left" line and the quoted descriptions, and whether it treats text inside quotes (commit messages, issue titles) as data and not as instructions.
