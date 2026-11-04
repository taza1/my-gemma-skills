# Architecture

How the library is put together, and why. For how the Gallery app itself works (verified from its source) see `TECHNICAL-RESEARCH.md`.

## The big picture

```
 you ask Gemma ──> Gemma reads the name + description of every selected skill
                      │ picks one and calls load_skill, then run_js
                      ▼
          AI Edge Gallery (on the phone)
                      │ loads  <your site>/skills/<name>/scripts/index.html  into a hidden WebView
                      │ calls  window.ai_edge_gallery_get_result(dataJson, secret)
                      ▼
            the skill's script  ── plain GET ──>  public API (Open-Meteo, GitHub, ...)
                      │ returns a JSON string:  { "result": "..." }  or  { "error": "..." }
                      ▼
          Gemma reports the result text to you
```

Gemma runs locally on the phone. A skill only goes online if it needs data. **A skill is a static website folder**, hosted on GitHub Pages, that the app loads from a URL.

## Repository layout

```
my-gemma-skills/
├── src/
│   ├── shared/            code every skill can use (inlined at build time)
│   └── skills/<name>/     the EDITABLE source of one skill
│       ├── main.js        the logic
│       ├── SKILL.md       what Gemma reads: name, description, how to call run_js
│       ├── README.md      documentation for people
│       └── skill.meta.json  type, network, secret, status (feeds CATALOG.md)
├── skills/<name>/         BUILT output. This is what the app loads. Never edit by hand.
│   ├── SKILL.md  README.md
│   └── scripts/index.html   main.js + the shared code it uses, inside one <script>
├── data/                  curated data: api-catalogue.json, mandarin.json
├── research/              API scorecards (accepted and rejected), with test dates
├── docs/                  these documents (API-CATALOGUE.md is generated)
├── tests/                 node --test suites, fixtures/ (real captured responses), live/ (manual)
├── scripts/build.js       the build
├── CATALOG.md             generated: one row per skill with its load URL
├── site.config.json       your GitHub Pages address and repository address
├── PROJECT-STATUS.md      what exists and how far it is tested
└── .nojekyll              required so GitHub Pages serves SKILL.md as raw text
```

## Why there is a build step
The app loads each skill folder **on its own**, so a script cannot import a shared file at run time. `scripts/build.js` copies every skill from `src/skills/` into `skills/` and **inlines** whatever it needs:

| Directive in `main.js` | What the build does |
|---|---|
| `// @inline shared/fetch.js` | replaces the line with that file's source (each file once) |
| `// @inline-json data/api-catalogue.json API_CATALOGUE` | embeds the JSON as `const API_CATALOGUE = {...};` with `<` escaped, so the data can never close the script tag |
| `__REPO_URL__` | replaced with `repoUrl` from `site.config.json` (used in the Wikipedia `Api-User-Agent`) |

The build also copies `SKILL.md`, `README.md` and any `assets/`, refuses source containing `</script`, and regenerates `CATALOG.md` and `docs/API-CATALOGUE.md`.

**Adding a skill is adding one folder and running one command** (`npm run build`). See `ADDING-A-SKILL.md`.

## Shared code (`src/shared/`)

| File | Provides |
|---|---|
| `skill-runtime.js` | `SkillError`, `parseInput`, `requireString`, `requireNumber`, `registerSkill(handler)`. `registerSkill` sets `window['ai_edge_gallery_get_result']`, parses the input, and turns the handler's return value into `{result}` or a `SkillError` into `{error}`. Anything unexpected becomes a generic error. |
| `fetch.js` | `fetchJson(url, opts)`: timeout (default 10 s), status handling (429 rate limit with retry hint, provider error messages, unreadable bodies), optional `onResponse`, `okStatuses` and `headers`. Sends **no headers** unless asked, which keeps the request a CORS "simple request". |
| `text.js` | `cleanText` (strip tags, decode entities, drop control characters, cap length) and `quoteData` (wrap untrusted text in quotes). |
| `time.js` | Dublin time helpers: `DD/MM/YYYY`, 24-hour times, `Europe/Dublin`, `dublinDate`. |
| `format.js` | `formatNumber` (7 significant digits, scientific notation for very large and small values). |

## The runtime contract
- Entry point: `window['ai_edge_gallery_get_result'] = async (data, secret) => string`. Always a **JSON string with only `result` or `error`**; an unknown field makes the app discard the shape and hand Gemma the raw string.
- `result` is plain text, short enough for a phone screen.
- Time limits: the app gives a script **60 seconds**; each of our network requests gets 10 s.
- No audio: the app cannot play sound from a skill.

## Conventions every skill follows
- **Few, simple parameters** (at most three), with defaults, tolerant of case, spaces and common aliases. Missing or bad input returns an error that names the field.
- **Never invent a result.** Failure returns an error or an explicit "unavailable".
- **Source and timestamp on external data**, in Dublin time unless the data is about another place.
- **Everything from outside is untrusted**: cleaned, capped and quoted.
- **Defaults** (from the brief): EUR, metric units, `Europe/Dublin`, `DD/MM/YYYY` with 24-hour time, English output.
- **Keyless.** No `require-secret` anywhere.

## Testing strategy
- Tests run against the **built** output in `skills/`, so what is tested is what the phone loads. `npm test` builds first, then runs `node --test "tests/*.test.js"`.
- `tests/helpers.js` runs a skill's script in a Node `vm` sandbox that looks like the WebView: `window`, a mock `fetch` only if the test gives one, a fixed clock (`now`), a fast clock for timeouts (`timeScale`), and a `localStorage` stand-in. A skill that tries to reach the network without a mock simply fails.
- **All tests are offline.** Fixtures in `tests/fixtures/` are real responses captured on 04/11/2026 (Wikipedia and Met Éireann text keeps its attribution in `fixtures/README.txt`).
- `tests/live/*.live.js` are **manual** smoke tests against the real services (`npm run smoke:live`). They prove the real response shapes still match, not that anything works on the phone, because Node does not enforce CORS.
- `tests/structure.test.js` checks every built skill the way the app parses it. `tests/secrets.test.js` is the secret scan. `tests/api-catalogue.test.js` validates the catalogue data.

## Status labels
Each skill carries exactly one label (in `skill.meta.json`, shown in `CATALOG.md`): **Verified** (tried by you in the app), **Tested locally** (automated tests pass on the PC), **Requires Android testing** (built, not tried on the phone), **Not yet implemented**. Nothing is labelled Verified until you have run the on-device checklist.

## Not built, on purpose
- A server or proxy of any kind (see `PI-WORKER.md` for the proposal and why it needs your approval).
- Any use of the app's secret mechanism.
- Native Android actions (they need changes to the app's own source).
