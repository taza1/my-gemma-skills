# Installation

From a folder on your PC to skills working in AI Edge Gallery on your phone. Windows PowerShell commands throughout.

**Status:** steps 1 to 4 are standard and the build and tests were run on the PC. **Steps 5 to 7 (the phone) have not been tried yet.** The app steps come from the app's own documentation and source (`TECHNICAL-RESEARCH.md`), so menu labels may differ slightly in your version.

## What you need
- Node.js LTS on the PC (any recent version; the tests use the built-in test runner, nothing else to install).
- Git, and a free GitHub account.
- The Google AI Edge Gallery app, **updated**, with a **Gemma 4** model downloaded (E2B or E4B). Skills need a model that can call tools.

## 1. Check the project works on the PC

```powershell
npm test
```

It builds every skill and runs all tests. All should pass. (`npm run build` alone just rebuilds.)

## 2. Set your GitHub address

Open `site.config.json` and replace `YOUR-GITHUB-USERNAME` in both lines with your username:

```json
{
  "pagesBase": "https://your-username.github.io/my-gemma-skills",
  "repoUrl": "https://github.com/your-username/my-gemma-skills"
}
```

Then rebuild, because the load URLs in `CATALOG.md` and the project identifier the news skill sends to Wikipedia come from this file:

```powershell
npm run build
```

## 3. Create the repository and push

1. On github.com create a **public** repository named `my-gemma-skills` (no README, no licence, nothing added: the project already has them). It must be public: a private repository's files cannot be fetched by the phone.
2. In the project folder:

```powershell
git init
git add .
git commit -m "Initial skills"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/my-gemma-skills.git
git push -u origin main
```

The built `skills/` folder **must be committed**: GitHub Pages serves it as it is.

## 4. Turn on GitHub Pages

On github.com open the repository: **Settings, then Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and save. Wait until the deployment finishes (the *Actions* tab shows it).

Why Pages and not `raw.githubusercontent.com`: GitHub's raw and repository addresses serve files as plain text, which breaks JavaScript skills. The empty `.nojekyll` file in the project root stops Pages from converting `SKILL.md` into a web page. Both points come from the app's documentation.

**Check it in a browser** before touching the phone. This must show the raw skill text (starting with `---`):

```
https://YOUR-USERNAME.github.io/my-gemma-skills/skills/unit-converter/SKILL.md
```

## 5. Add a skill in the app

1. Open **Agent Skills** and choose your Gemma 4 model.
2. Tap the **Skills** chip, then the **(+)** button, then **Load skill from URL**.
3. Paste the skill's **folder** address, without `SKILL.md` on the end:

```
https://YOUR-USERNAME.github.io/my-gemma-skills/skills/unit-converter
```

4. Make sure the skill is switched on in the list. Repeat for each skill; `CATALOG.md` lists every address.

Start with `unit-converter` (offline), then `weather`.

**How many skills at once?** Gemma sees every selected skill's name and description in its prompt, so more skills means more to choose from and a longer prompt. How well E2B and E4B choose is untested; if answers get worse, switch some skills off.

## 6. Try it

Use the prompts in `ON-DEVICE-CHECKLIST.md` (for each skill, on E2B and E4B) and write pass or fail next to each. When a skill passes, change its status in `src/skills/<name>/skill.meta.json` to **Verified**, run `npm run build`, and push.

If the app shows a "Call JS script" panel, expand it to see the data Gemma sent and the console messages. That is the quickest way to debug.

## 7. Updating later

| You changed | What to do |
|---|---|
| a skill's `main.js` or the shared code | `npm test`, commit, push, wait for Pages to deploy. The app loads the script on **every call**, so the new version is used next time (the WebView or the site's cache may delay it briefly; this is research question U2) |
| a skill's `SKILL.md` | push, then in the app **remove the skill and add it again**: the app reads `SKILL.md` only when you add it |
| `data/api-catalogue.json` or `data/mandarin.json` | `npm run build`, commit, push. The data is inside `scripts/index.html`, so no re-adding |

## Alternative: load a skill from a file on the phone (no GitHub)
Handy for testing: copy a built skill folder to the phone, for example `adb push skills\unit-converter /sdcard/Download/`, then in the app choose **Import local skill** and pick the folder. The app copies it into its own storage.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Failed to fetch SKILL.md" when adding | The address is wrong, the repository is private, Pages is not deployed yet, or you added `SKILL.md` to the end. Open the address plus `/SKILL.md` in a phone browser: it must show raw text |
| `SKILL.md` shows as a web page | The `.nojekyll` file is missing from the repository root |
| "A skill with the name ... already exists" | Remove the old copy first |
| Skill is called but answers "Could not reach ..." | No internet, or a CORS problem in the WebView. Copy the console message from the call panel (this is the first thing the phone test will tell us) |
| "Skill execution timed out" | The app stops a script after 60 s. Check the connection |
| Gemma never picks the skill | The description is too vague for the model, or too many skills are on. Try fewer skills or ask more directly ("use the weather skill") |
| Gemma changes Chinese characters or pinyin | Tell it to copy the result exactly; this is a model limit, see the Mandarin README |
| GitHub says rate limit reached | 60 requests an hour per network without signing in; wait for the reset time shown |
| `npm test` fails after your change | Read the first failing test: the messages name the skill and the problem |
