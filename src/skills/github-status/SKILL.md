---
name: github-status
description: Show a public GitHub repository's stars, latest release, recent commits and open issues.
---

# GitHub status

Needs internet. Works for public repositories only, with no sign-in. Use it when the user asks about a GitHub repository: how active it is, its latest release, recent commits or open issues.

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: index.html
- data: A JSON string with the following fields:
  - repo: String. Required. The repository as "owner/name", for example "google-ai-edge/gallery", or its github.com link. Never guess a repository the user did not name; ask them first.
  - show: String. Optional. One of "all", "summary", "release", "commits", "issues". Leave it out for "all". Use "summary" for a quick look, because GitHub only allows 60 requests an hour without signing in.

Report the `result` text to the user as it is, including the requests-left line. Do not add facts that are not in the result. If the tool returns an error, tell the user what it says and do not guess.
