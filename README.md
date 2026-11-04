# my-gemma-skills

Personal skills library for [Google AI Edge Gallery](https://github.com/google-ai-edge/gallery), run by Gemma on an Android phone. Licensed Apache-2.0.

- Skills the app loads: [`skills/`](skills) (built output, do not edit by hand)
- Skill sources: [`src/skills/`](src/skills); shared code in [`src/shared/`](src/shared) is inlined at build time
- What exists and how far it is tested: [`PROJECT-STATUS.md`](PROJECT-STATUS.md)
- Load URLs: [`CATALOG.md`](CATALOG.md)
- How the platform works (verified from source): [`docs/TECHNICAL-RESEARCH.md`](docs/TECHNICAL-RESEARCH.md)
- On-device testing: [`docs/ON-DEVICE-CHECKLIST.md`](docs/ON-DEVICE-CHECKLIST.md)

## Documentation
| Document | What it covers |
|---|---|
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | From this folder to skills running on your phone: GitHub, Pages, adding skills in the app, updating, troubleshooting |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How it fits together: layout, the build, shared code, the runtime contract, testing |
| [`docs/ADDING-A-SKILL.md`](docs/ADDING-A-SKILL.md) | Add one folder, run one command; the rules and the definition of done |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, mitigations, what leaves the phone per skill |
| [`docs/API-CATALOGUE.md`](docs/API-CATALOGUE.md) | Generated list of the vetted APIs (full scorecards in [`research/`](research)) |
| [`docs/TECHNICAL-RESEARCH.md`](docs/TECHNICAL-RESEARCH.md) | What the Gallery app supports, verified from its source |
| [`docs/PI-WORKER.md`](docs/PI-WORKER.md) | Proposal only: an optional always-on worker for real news headlines (not built, needs your approval) |

## Commands (Windows PowerShell, Node.js LTS, no dependencies)

```powershell
npm run build   # src/skills/* -> skills/*, regenerates CATALOG.md
npm test        # build, then run all tests with node --test (no network)
npm run smoke:live   # MANUAL: runs the weather skill against the real APIs (needs internet)
```

## Adding a skill
Add a folder `src/skills/<kebab-name>/` containing `SKILL.md`, `main.js`, `README.md` and `skill.meta.json` (copy `unit-converter`), write tests in `tests/`, then run `npm test`. Full steps and rules: [`docs/ADDING-A-SKILL.md`](docs/ADDING-A-SKILL.md).

## Hosting
Serve from GitHub Pages (branch `main`, root). The empty `.nojekyll` file is required. In the app use **Load skill from URL** with the skill *folder* URL, e.g. `https://<username>.github.io/my-gemma-skills/skills/unit-converter`. Do not use `raw.githubusercontent.com`; JS skills fail there.
