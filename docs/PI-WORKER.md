# Raspberry Pi worker (proposal, NOT built)

**Status: Not yet implemented, and not a dependency.** Nothing in this library needs a Pi, a server or a proxy. This document describes what a small always-on machine could add later, what it would cost you, and why it needs your **explicit approval** first (the brief forbids building a backend proxy without it). No part of this has been tried.

Hardware you mentioned: a Raspberry Pi 4 Model B (4 GB), a Raspberry Pi 3, older Windows laptops, and a desktop with 16 GB of RAM.

## Why you might want one
The research found two things the phone cannot do alone:

1. **Real news headlines.** Every publisher RSS feed we tested (BBC, RTÉ, Guardian, NPR, Al Jazeera, Irish Times and others) sends no CORS header, so a skill in the app cannot read them. A small program that fetches the feeds and returns JSON **with CORS headers** would give real headlines with real publication times. The news skill is currently limited to Wikipedia summaries and Hacker News because of this.
2. **Better exchange-rate provenance.** Frankfurter (rates from central banks) was unreachable when tested. It can be self-hosted, which would also give a rate source you control.

Other possible uses, not researched: caching to spare shared rate limits (GitHub allows only 60 requests an hour per IP), and serving your own copy of the skills.

## What it would look like
```
phone (Gemma + skill) ── HTTPS ──> your worker ── HTTPS ──> BBC / RTÉ / Guardian RSS, Frankfurter
```
The worker would be a very small program (fetch a list of allowed URLs, parse, return JSON, add the CORS header, cache for a few minutes). The skill would call the worker instead of the publisher.

## The honest costs

| Question | Answer |
|---|---|
| Does the phone need to reach it? | Yes, from anywhere you use the skill. At home it could use your local network address; away from home it needs a public HTTPS address or a private network such as a VPN. A Pi at home with a port open to the internet is a real exposure |
| Hardware | A Pi 3 or 4 is more than enough for a handful of RSS fetches; it would also run on an old laptop. Not benchmarked here |
| Running cost | Electricity and your time. A hosted function service might be cheaper than a Pi at this volume: **not checked, so do not rely on it**. Free-tier limits change, so read the current ones |
| Upkeep | Operating-system and Node.js updates, restarts after power cuts, certificates if it is public, monitoring. This is the main burden |
| Legal | Each publisher's feed terms apply. **None have been read here**; I believe the BBC limits its feeds to personal, non-commercial use, but check before relying on that. Headlines and descriptions should be shown with their source, as the news skill already does |

## Security requirements if you ever build it
- **Allow-list only.** The worker fetches a fixed list of feed URLs that you choose. It must never accept a URL from the request, or anyone who finds it can use your machine to fetch anything (server-side request forgery).
- **No secrets on it** that you cannot afford to lose, and no personal data. It sees your phone's IP address and which feeds you ask for.
- **No open admin interface.** Do not expose SSH or a dashboard to the internet; use keys and a firewall.
- **Cap everything**: response size, timeouts, requests per minute per client.
- **Treat what it returns as untrusted**, like any other API: the news skill would still clean, cap and quote it. A compromised worker is then an injection risk but not a code-execution risk, because the skill never runs what it fetches.
- Keep the skill's list of trusted hosts in `data/api-catalogue.json` and mark the worker `trusted` only for hosts you run.

## Decisions for you (nothing happens until you answer)
1. **Do you want real headlines enough to run a worker?** If not, the current Wikipedia plus Hacker News news skill stays as it is.
2. **Pi at home, or a hosted function?** The Pi is free to buy but needs upkeep and is the harder one to expose safely; a hosted option has its own account and limits to check.
3. **Home only, or from anywhere?** Home-only (local network address) is much simpler and safer.

If you decide to go ahead, the next steps would be: read the feed terms of the publishers you want, write a tiny allow-listed fetcher with tests (the same structure as this repository), add it to `research/api-candidates.md` as a scorecard, and add a `news-headlines` skill that calls it.
