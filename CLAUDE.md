# CLAUDE.md

See [`AGENTS.md`](./AGENTS.md) and [`docs/ADDING-A-SKILL.md`](./docs/ADDING-A-SKILL.md) for full architecture and skill-authoring rules.

## Project
- **my-gemma-skills:** Zero-dependency skills library for Google AI Edge Gallery (Gemma on Android), built from `src/skills/` + `src/shared/` into `skills/` and `CATALOG.md`, hosted on GitHub Pages (`main` root + `.nojekyll`).
- User works on Windows / PowerShell with Node.js LTS.

## Commands
- Build: `npm run build` (`node scripts/build.js`)
- Offline test suite (builds first): `npm test`
- Manual live API smoke: `npm run smoke:live` (only when explicitly requested)

## Critical Invariants
- **Never edit `skills/` or `CATALOG.md` by hand** — edit `src/skills/` or `src/shared/` and rebuild.
- Keep zero npm dependencies and keep `npm test` 100% offline.
- Follow `docs/SECURITY.md` and `docs/TECHNICAL-RESEARCH.md` for Gallery runtime limits.
- Keep `.nojekyll` at the repo root.

## Definition of Done
1. Run `npm test` and confirm all tests pass.
2. Confirm generated `skills/` and `CATALOG.md` are up to date with `src/`.
3. Update `PROJECT-STATUS.md` / `docs/` when adding or modifying skills.

## Style & Memory
- Keep responses short: what changed, verification result, anything needing a decision.
- Whenever corrected or told to remember something, add a concise rule to the right section of this file.
