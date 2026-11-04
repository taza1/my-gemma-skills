# github-status

**What it does:** shows a **public** GitHub repository's basic status: description, stars, forks, open issues and pull requests, language, license, last push, latest release, the 5 most recent commits and the 3 latest open issues. It also reports how many of your 60 hourly GitHub requests are left.

**Status:** Tested locally (mocked tests using real captured GitHub responses, plus a manual live run). **Not yet tried on the phone**, and not tested in the Android WebView.

## Parameters
| Field | Type | Notes |
|---|---|---|
| `repo` | text, required | `owner/name`, or a github.com link (`https://github.com/owner/name`, with or without `.git` or extra path) |
| `show` | text, optional | `all` (default, 4 requests), `summary` (1), `release` (2), `commits` (2), `issues` (2) |

## No token, no sign-in
Only the unauthenticated public API is used (brief, section 7F). That means **public repositories only** and **60 requests per hour per IP address**, shared with everything else on your network. The skill reads the limit from GitHub's response headers and shows the remaining count on every answer, flagging "running low" at 10 or fewer. A repository GitHub says does not exist may be private.

## What leaves the phone
`api.github.com` receives the **owner/name you ask about** and the phone's IP address. Plain GETs with no custom headers, no key, no account.

## Behaviour
- The repository is requested first; if it is not found the skill stops and spends no more of your quota.
- GitHub's open-issue count includes pull requests, so it is labelled "open issues and pull requests". The listed issues exclude pull requests.
- A repository with no releases says "none published"; an empty repository says "none (the repository is empty)"; a repository with issues turned off says so. Archived repositories and forks are flagged.
- One failing extra (for example the commits request) shows "unavailable (reason)" and does not hide the rest. A rate-limit hit shows when to try again.
- Dates are shown as `DD/MM/YYYY HH:mm` in Europe/Dublin. All text from GitHub (description, commit messages, issue titles, names) is treated as untrusted: HTML stripped, capped in length and quoted.
- Responses are cached by GitHub for 60 seconds (`Cache-Control: max-age=60`), so asking again straight away may not use up requests.

## Errors (never an invented result)
Missing or malformed `repo`; unknown `show`; repository not found; rate limit (403/429, with the reset time); timeout (10 s); HTTP errors; unreadable or unexpected responses.

## Example prompts
- "How active is google-ai-edge/gallery on GitHub?"
- "What's the latest release of https://github.com/octocat/Hello-World?"
- "Show recent commits for torvalds/linux" (use `show: commits`)
- "Quick summary of the gallery repo"

## Known limitations
Not tested on a device. Public repositories only. Only the 5 most recent commits and 3 latest issues are listed; there is no exact count of real issues (that needs the stricter search API). No branch, tag, workflow or pull request details.
