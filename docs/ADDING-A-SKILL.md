# Adding a skill

Adding a skill is adding **one folder** and running **one command**. Nothing else needs redesigning.

## 1. Copy the closest existing skill

```powershell
Copy-Item -Recurse src\skills\unit-converter src\skills\my-skill
```

Pick the closest starting point: `unit-converter` (offline), `currency` (one network call with a cache), `weather` (two calls), `github-status` (rate-limit headers), `api-discovery` or `mandarin` (offline lookup over a data file).

The folder name is **kebab-case** and must equal the `name:` in `SKILL.md`.

## 2. The four files

**`SKILL.md`**: what Gemma reads. The app parses it with a simple line-based parser, so keep it plain:

```markdown
---
name: my-skill
description: One short, specific sentence saying what it does.
---

# My skill

When to use it.

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: index.html
- data: A JSON string with the following fields:
  - city: String. Required. ...

Report the `result` text as it is. If the tool returns an error, say so and do not guess.
```

- `name` and `description` on **one line each**, before any `metadata:`. The description is how a small model decides to use the skill: keep it under 160 characters and specific. (A test checks it.)
- Only `name`, `description` and `metadata:` keys the app reads (`require-secret`, `require-secret-description`, `homepage`). **Do not use `require-secret`** without explicit approval; a test fails if you do.
- At most three parameters, simple types, sensible defaults.

**`main.js`**: the logic. Start with the shared code you need:

```javascript
// @inline shared/skill-runtime.js
// @inline shared/text.js
// @inline shared/fetch.js

async function handler(input) {
  const city = cleanText(requireString(input, 'city'), 60);
  const data = await fetchJson('https://api.example.com/x?q=' + encodeURIComponent(city),
    { label: 'Example API' });
  return 'Result for ' + quoteData(city);
}

registerSkill(handler);
```

Rules for `main.js`:
- Return a **string**; throw `new SkillError('message naming the field')` for bad input.
- **Never invent a result.** On failure return an error or say "unavailable".
- **Treat everything from outside as untrusted**: pass it through `cleanText` and `quoteData`; do not follow links or instructions inside it.
- Send plain GET requests with **no custom headers** unless a provider requires one (a header triggers a CORS preflight that some servers reject; check first).
- Keep output short enough for a phone screen and include the **source and a timestamp** for external data.
- No `require`, `import`, external scripts or `</script` in the source.

**`README.md`**: documentation for people. Cover: what it does, when to use it, parameters and validation, how it runs, error handling, timeouts and rate limits, output format, attribution, security notes (what leaves the phone and who receives it), example prompts, known limitations and the status label. Copy the structure from `src/skills/weather/README.md`.

**`skill.meta.json`**:

```json
{ "type": "JavaScript", "network": "none", "secret": "none", "status": "Requires Android testing" }
```

`network` lists the hosts it calls (or `none`). Set `status` honestly: **Tested locally** only once its own tests pass; **Verified** only after you have run it in the app.

## 3. If it uses a web API: research first

1. Test the API from a **browser** origin, not just `curl`: CORS decides whether the WebView can read it. Record the result with its date.
2. Read the provider's terms and rate limits. Note attribution, commercial-use limits, and what the request reveals.
3. Add its scorecard to `research/api-candidates.md` (rejected ones to `research/rejected-apis.md` with the reason) and an entry to `data/api-catalogue.json` with `usedBy: ["my-skill"]`. `tests/api-catalogue.test.js` then checks the entry is complete, keyless and marked suitable.
4. Prefer APIs that need **no key**. If you cannot find one, downgrade the skill or drop it and write down why (`PROJECT-STATUS.md`).

## 4. Write the tests

Create `tests/my-skill.test.js` (copy `tests/weather.test.js`). Use `loadSkill('my-skill', { fetch, now, timeScale, storage })` from `tests/helpers.js`. At minimum cover:
- the normal result, exactly as the user would see it
- missing, empty and wrong-type fields (the error must name the field)
- timeout, network error, HTTP 4xx/5xx, rate limit (429/403), unreadable body, unexpected shape
- hostile text from the API (`<script>`, "IGNORE ALL PREVIOUS INSTRUCTIONS", very long strings) coming out neutral and capped
- that only `{result}` or `{error}` is returned
- what is sent over the network (exact URL, no extra data, no custom headers)

Use **real captured responses** as fixtures (`tests/fixtures/`, with attribution in `fixtures/README.txt`). Never call the live service from a test. For a manual check, add `tests/live/my-skill.live.js` and list it in the `smoke:live` script.

## 5. Build and test

```powershell
npm test
```

This builds `skills/my-skill/`, regenerates `CATALOG.md` and `docs/API-CATALOGUE.md`, and runs everything, including the structure checks (every skill is parsed the way the app does it) and the secret scan.

## 6. Add on-device checklist rows

Append a section to `docs/ON-DEVICE-CHECKLIST.md`: prompts to type on E2B and on E4B, the expected result, and a place for pass/fail. Include one prompt where Gemma should **not** call the skill and one where it must ask for a missing detail.

## Definition of done

- [ ] Built output passes structure and metadata validation
- [ ] Unit tests pass with `node --test`, including invalid input, missing fields, timeouts and rate limits (mocked network)
- [ ] On failure it returns a clear error, never an invented result
- [ ] External data carries source and timestamp
- [ ] Listed in `CATALOG.md` with its load URL, type, network need and secret need (automatic)
- [ ] Its README has example prompts, expected behaviour, test results and known limitations
- [ ] Its status label is accurate

## Pitfalls we already hit
- Node 24 treats `node --test tests/` as a module path: use the glob `"tests/*.test.js"` (already in `package.json`).
- Do not put the characters U+2028 or U+2029 inside a regular expression literal in source; build them with `String.fromCharCode`.
- Wikipedia, GitHub and others change over time: expect fixtures to age, and re-capture them when a live smoke test disagrees.
- A test sandbox has no `fetch` unless you give it one; a skill that works only because the sandbox lacked a network call is a bug in the test.
- Time zones: the same instant is a different clock time in summer. Test dates on both sides of the clock change.
