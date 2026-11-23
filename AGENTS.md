# AGENTS.md — my-gemma-skills Guide for AI Agents

Canonical project guide for **Antigravity** and all AI coding agents working in `my-gemma-skills`. Claude Code users also have [`CLAUDE.md`](./CLAUDE.md).

## Project Overview
- Personal skills library for **Google AI Edge Gallery** (Gemma running on-device on Android), Apache-2.0 licensed, hosted via GitHub Pages (root of `main`, requires `.nojekyll`).
- **Layout:**
  - `src/skills/<kebab-name>/` — Skill source (`SKILL.md`, `main.js`, `README.md`, `skill.meta.json`)
  - `src/shared/` — Shared JS helpers inlined at build time by `scripts/build.js`
  - `skills/` and `CATALOG.md` — **Generated build output; NEVER edit by hand**
  - `tests/` — Offline Node unit tests (`tests/*.test.js`) and manual live API smoke tests (`tests/live/*.live.js`)
  - `docs/` — `ARCHITECTURE.md`, `ADDING-A-SKILL.md`, `SECURITY.md`, `TECHNICAL-RESEARCH.md`, `INSTALLATION.md`, `ON-DEVICE-CHECKLIST.md`, `API-CATALOGUE.md`

## Commands
Run from the repository root (Node.js LTS, zero external dependencies):

```bash
npm run build        # Compile src/skills/* -> skills/* and regenerate CATALOG.md
npm test             # Build, then run all offline unit tests (node --test "tests/*.test.js")
npm run smoke:live   # MANUAL only: live API smoke tests (requires internet)
```

## Critical Invariants
- **Never edit `skills/` or `CATALOG.md` directly:** Always edit `src/skills/` or `src/shared/` and run `npm run build` (or `npm test`).
- **Zero runtime npm dependencies:** Everything must run cleanly with built-in Node.js LTS for tests/build and vanilla JS inside AI Edge Gallery's WebView runtime.
- **Follow `docs/ADDING-A-SKILL.md` and `docs/SECURITY.md`:** Document what leaves the phone per skill, vet APIs in `research/` / `data/api-catalogue.json`, and keep `.nojekyll` at repo root so GitHub Pages serves skills properly.
- **Offline tests stay offline:** `npm test` must never make live network requests.

## Definition of Done
1. Run `npm test` (which runs `node scripts/build.js` + all `tests/*.test.js`) and confirm 100% pass.
2. Verify `git diff` includes regenerated `skills/` and `CATALOG.md` matching your `src/` changes.
3. Update `PROJECT-STATUS.md` or `docs/` when adding a skill or changing platform contracts.
