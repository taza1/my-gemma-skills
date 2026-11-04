# Technical research: AI Edge Gallery Agent Skills

Source of truth: `google-ai-edge/gallery`, `main` at commit `9acbd4e1719924d7c7bb2f292cfdbe28a8224354` (4 Nov 2026), shallow clone read locally.
Paths below are relative to that repo. `A/` = `Android/src/app/src/main/java/com/google/ai/edge/gallery/`.

Status of this document: **source-code reading only. Nothing here has been tested on a device.**

## 1. Leads from third-party projects: confirmed or corrected

| Lead | Verdict | Evidence |
|---|---|---|
| Text skill = one `SKILL.md`; JS skill adds `scripts/index.html` run in a hidden WebView | **Confirmed** | `skills/README.md` ("How JS Skills Work"); `A/customtasks/agentchat/AgentChatScreen.kt` (hidden `GalleryWebView`, `Modifier.size(300.dp)`) |
| Model calls a tool named `run_js` | **Confirmed in docs, name derivation unverified** | `skills/README.md` tells skill authors to "call the `run_js` tool". The Kotlin method is `RunJsTool.runJs(skillName, scriptName, data)` with `@Tool` (`A/tools/RunJsTool.kt`); the snake_case wire name comes from the LiteRT-LM annotation processor, which is not in this repo |
| Result returned via `ai_edge_gallery_get_result` | **Confirmed, with detail** | `AgentChatScreen.kt` (~L393-403): the app polls up to 10 s for `window.ai_edge_gallery_get_result`, then calls it as `await ai_edge_gallery_get_result(data, secret)` and passes the return value to `AiEdgeGallery.onResultReady` |
| `require-secret` metadata flag | **Confirmed** | `A/skills/SkillManager.kt` `convertSkillMdToProto`; `skills/README.md` "Passing Secrets"; `proto/skill.proto` fields 8 and 10 |
| Skills loadable from a URL | **Confirmed, but the URL rule differs from common advice** | See section 3. The URL is the **skill folder**, and JS skills need real MIME types, so `raw.githubusercontent.com` does **not** work |

## 2. SKILL.md format (verified)

Parser: `SkillManager.convertSkillMdToProto` (`A/skills/SkillManager.kt`, ~L984-1062).

- The file is split on `---`. Needs at least two `---` separators; header is part 1, instructions are everything after (re-joined, so `---` inside the body is fine; `---` inside the header would break parsing).
- Parsing is **line-based, not YAML**. Recognised keys:
  - top level: `name:`, `description:` (both required, single line only)
  - after a `metadata:` line: `require-secret:` (boolean), `require-secret-description:`, `homepage:`
- Any other key is ignored silently. Top-level keys placed *after* `metadata:` are treated as metadata and ignored.
- `name` should be kebab-case and equal the folder name (README requirement; the app locates built-in/imported skills by name/directory).
- A skill whose `name` already exists is rejected ("A skill with the name ... already exists").

**How the description is used:** `skills/README.md` "How Skills Work": the model sees the *name and description* of each *selected* skill in its system prompt. When it picks one it calls `LoadSkillTool` (`A/tools/LoadSkillTool.kt`), which returns the full instructions body into context. The body then tells it to call `run_js` with exact parameters. So: description = routing, body = parameter contract (progressive disclosure).

Available tools exposed to the model (`A/customtasks/agentchat/AgentTools.kt`): `loadSkill`, `runMcp`, `runJs`, `runIntent`.

## 3. Importing, loading, caching, updating

Three routes (`skills/README.md` "How to Add Skills"): featured list, **Load skill from URL**, **Import local skill** (folder picked with the Android file picker, copied into app-private storage).

### URL import (`SkillManager.addSkillFromUrl`, ~L199-250)
- Input is the **skill folder URL**. A trailing `/SKILL.md` or `/` is stripped. The app fetches `<folder>/SKILL.md` once with `URL.openConnection()`.
- Parsed metadata and the instructions text are **stored in the app's DataStore** (`skill_url` = folder URL).
- **SKILL.md is not re-fetched at run time.** I found no refresh path in `SkillManager.kt`. Editing description/instructions/metadata in the repo therefore requires **removing and re-adding the skill** (unresolved question U1: confirm on device).
- **Scripts are loaded live on every call:** `Skill.getJsSkillUrl` (`A/skills/SkillExtensions.kt`) returns `<skill_url>/scripts/<scriptName>`, and `AgentChatScreen` calls `webView.loadUrl(...)` each time. So changes to `scripts/*.html` take effect without re-adding (subject to HTTP caching by the WebView and by GitHub Pages' `Cache-Control`; unresolved U2).
- Webview results resolve `assets/<file>` relative to the same folder URL (`getJsSkillWebviewUrl`).

### Hosting rule (README, "Add from a URL", IMPORTANT note)
- JS skills must be served with correct MIME types. `github.com` and `raw.githubusercontent.com` serve `text/plain`, so they fail for JS skills.
- Use **GitHub Pages** (or Cloudflare etc.) and add an empty **`.nojekyll`** at the repo root so `.md` files are served raw.
- Expected load URL pattern: `https://<user>.github.io/my-gemma-skills/skills/<name>` (no trailing `SKILL.md`). Check by opening `.../skills/<name>/SKILL.md` in a browser; it must show raw text.
- This **corrects earlier advice in this session** that a `raw.githubusercontent.com` link could be pasted into the app.

### Local import
Copied into `filesDir`, then served to the WebView at `https://appassets.androidplatform.net/<importDir>/...` by `BaseGalleryWebViewClient` (`A/ui/common/GalleryWebView.kt`). Useful for offline testing with `adb push` (README documents this).

## 4. JavaScript execution interface (verified)

- Model call: `runJs(skillName, scriptName, data)`; `scriptName` defaults to `index.html`; `data` is a **string** (a JSON string the SKILL.md instructions describe). Empty data becomes `"{}"`.
- Entry point: `window['ai_edge_gallery_get_result'] = async (data, secret) => string`. `data` is a JSON string; return value must be a **JSON string**.
- Return shape (`CallJsSkillResult`, parsed with Moshi `failOnUnknown()` in `RunJsTool.kt`): `result` (string), `error` (string), `image: {base64}`, `webview: {url, aspectRatio}`. Unknown fields make parsing fail, in which case the **whole raw string is passed to the model as the result**.
- If `error` is present the model receives `{error, status: "failed"}`.
- Hard limits in `AgentChatScreen.kt`: **60 s** overall timeout (returns `{"error":"Skill execution timed out. Please check network connection."}`); **10 s** wait for the function to be defined after page load.
- Console output from the WebView is shown in the app's execution panel (README "Debug JS Skill In App").
- Native: `run_intent` supports only `send_email` and send-SMS out of the box; new intents need app source changes (README).
- Also present: an MCP tool path (`RunMcpTool`, `McpManagerBottomSheet`). Out of scope for now but a possible alternative for things a WebView cannot do (U6).

## 5. Network access and CORS

- WebView settings: `javaScriptEnabled`, `domStorageEnabled`, `allowFileAccess`, no custom CORS relaxation (`GalleryWebView.kt` ~L153).
- The page's origin is the skill's host (for URL skills, e.g. `https://<user>.github.io`; for local imports `https://appassets.androidplatform.net`). **Standard browser CORS applies to every `fetch()`**: the target API must send `Access-Control-Allow-Origin` that permits that origin.
- Evidence it works for suitable APIs: the built-in Wikipedia skill calls `https://<lang>.wikipedia.org/w/api.php` with `origin=*` (the MediaWiki anonymous CORS switch) from `skills/built-in/query-wikipedia/scripts/index.html`.
- **No CORS result is recorded yet for any API.** Every API needs a browser-context CORS test with a date (U3). The Open-Meteo, Frankfurter, GitHub and Nominatim claims must be tested before the skill is built.
- `fetch()` cannot set a `User-Agent` header from a browser context. APIs that require one (e.g. Nominatim's usage policy asks for identification) need `Referer`/origin identification or must be dropped; to be decided in API scorecards.

## 6. Secrets (verified)

- Declaration: `metadata: require-secret: true` (+ optional `require-secret-description`).
- Entry: on the first `run_js` call, if no saved secret exists, the app shows a native "Enter secret" dialog (`AskInfoToolAction`, `RunJsTool.kt`). The secret never passes through the LLM prompt.
- Storage: `DataStoreRepository.saveSecret/readSecret` writes to `userDataDataStore` under the key `skill___<skillName>` (`A/data/DataStoreRepository.kt`, `getSkillSecretKey`). Whether that DataStore is encrypted at rest is **not shown in the code I read** (U4); assume app-private, plain proto.
- Delivery: passed as the **second argument** of `ai_edge_gallery_get_result`.
- Caveat: `RunJsTool` logs the first 3 characters of a newly entered secret to logcat (`Log.d`). Low risk, worth knowing.
- Caveat: the page that receives the secret is loaded from the skill host on every call, so whoever controls that host controls the code that sees the key. **The project plan is keyless skills; no skill here will use this mechanism without approval.**

## 7. Gemma 4 and small-model limits

Verified in `model_allowlists/1_0_22.json` (latest list in the clone):
- `Gemma-4-E2B-it`: `maxContextLength` 32000, `maxTokens` 4000, `minDeviceMemoryInGb` 8, task types include `llm_agent_chat`, defaults `topK 64, topP 0.95, temperature 1.0`. E4B entry not yet read in full (U5).
- `AgentChatSamplingParamsManager` forces **TopK = 1 (greedy)** when entering Agent Skills unless the user changed it. Good for tool-argument reliability.
- Skill instructions are loaded into context on selection; every selected skill's name+description is in the system prompt, so more skills means more fixed prompt cost.

**Not documented anywhere in the repo, so unresolved (U7):** tool-calling reliability of E2B vs E4B, behaviour with malformed or missing arguments, and how many skills can be selected before routing degrades. These can only be measured on the phone. The on-device checklist will test them directly.

## 8. Unsupported or constrained features, with alternatives

| Wanted | Status | Practical alternative |
|---|---|---|
| Load JS skill from `raw.githubusercontent.com` | Unsupported (MIME type) | GitHub Pages + `.nojekyll` |
| Auto-update SKILL.md when repo changes | Not found | Remove and re-add skill; keep SKILL.md stable, put logic in scripts |
| Setting a `User-Agent` header | Not possible in browser `fetch` | Choose APIs that do not require it |
| Native Android features beyond email/SMS | Needs app source changes | Out of scope |
| Audio output (Mandarin) | No audio-return field in `CallJsSkillResult` (only text, image, webview) | Text/pinyin only; a webview could use browser speech synthesis (untested, U8) |
| Arbitrary YAML in frontmatter | Parser is line-based | Keep frontmatter to `name`, `description`, `metadata:` keys listed above |

## 9. Implementation decisions so far

1. Host on **GitHub Pages**; load URL = skill folder URL.
2. Keep each skill's `SKILL.md` frontmatter minimal and single-line; put everything variable in `scripts/`.
3. `scripts/index.html` per skill, with shared helpers **inlined** by `scripts/build.js` (each skill is fetched independently).
4. Always return `{result}` or `{error}` only (unknown fields break parsing).
5. Keep tool-call parameters to 1-3 simple string/number fields.
6. Keyless APIs only; no `require-secret` without approval.
7. Budget well under the 60 s limit; use an explicit fetch timeout (target 10 s).

## 10. Unresolved questions

- **U1** Is SKILL.md ever refreshed for URL skills? (code says no; confirm on device)
- **U2** Script caching in the WebView / GitHub Pages after an update.
- **U3** CORS result for each candidate API from the real skill origin.
- **U4** Is the secrets DataStore encrypted at rest?
- **U5** E4B allowlist settings (context, tokens).
- **U6** Whether MCP is a better route for anything in the plan.
- **U7** Tool-calling reliability and skill-count limits for E2B/E4B.
- **U8** Whether browser speech synthesis works inside the skill webview.
- **U9** Does `.nojekyll` + Pages serve `SKILL.md` with a MIME type the app's `URL.openConnection()` accepts (it does not check MIME, so likely yes).


---

## Updates since the first draft (04/11/2026)

What the later work added or settled. Original question numbers (U1 to U9) are kept.

| Question | Now |
|---|---|
| U3 CORS per API | **Tested from a desktop browser origin** (`https://example.com`, real `fetch`, plus `curl` with an `Origin` header) for every API a skill uses, with dates in `data/api-catalogue.json`. All used APIs pass. Every mainstream publisher RSS feed **fails** (no CORS header), which is why the news skill uses Wikipedia and Hacker News. **Still not tested inside the Android WebView**, which is the real question |
| Preflights | Wikimedia's Action API allows an `Api-User-Agent` request header (preflight answered with `access-control-allow-headers: api-user-agent`). Met Éireann's JSON answers a plain GET but **rejects a preflight (405)**, so skills send no custom headers unless a provider needs one. GitHub's API exposes its rate-limit headers to browsers |
| Storage | The app's WebView enables DOM storage (`domStorageEnabled = true`), so the currency skill's `localStorage` cache should work; **unverified on the device**, and the skill works without it |
| U1, U2, U4, U7, U8 | **Unchanged: only the phone can answer them** (is `SKILL.md` ever refreshed; script caching after an update; whether stored secrets are encrypted; Gemma tool-calling reliability and how many skills are too many; whether browser speech synthesis works in the skill WebView) |
| U5 | The E4B allowlist entry was not read in full; still open |
| U6 | MCP as an alternative route: not investigated and not needed so far |
| New | The app reloads `scripts/index.html` from the skill's site on **every call**, so changing the repository changes the code running in the WebView immediately (see `SECURITY.md`, threat 4) |

Everything in the main text above still stands. The skill-by-skill scorecards live in `api-candidates.md`, the security reasoning in `SECURITY.md`, and the build and test design in `ARCHITECTURE.md`.
