---
name: news
description: Get recent news summaries (general, world, business, technology or AI) from the last 24 or 48 hours.
---

# News

Needs internet. Use it when the user asks for the news, headlines, what is happening, or news about business, the world, technology or AI.

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: index.html
- data: A JSON string with the following fields:
  - topic: String. Optional. One of "general", "world", "business", "technology", "ai". Leave it out for "general".
  - days: Number. Optional. 1 or 2, how many days back to look. Leave it out for 2.

Report the `result` text to the user as it is, keeping the dates, the cited sources and the sources line at the end. Do not add news that is not in the result. If the result says an item comes from Wikipedia, make clear it is a summary and not the outlet's own headline. If the tool returns an error or a source is unavailable, say so and do not guess.
