---
name: api-discovery
description: Look up vetted free web APIs by topic or keyword from a curated list, with their limits and terms.
---

# API discovery

Works offline. Use it when the user asks which web API to use for something (weather, currency, news, GitHub and so on) or how safe, free or limited a particular API is.

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: index.html
- data: A JSON string with the following field:
  - query: String. Optional. A topic or keyword such as "weather", "currency", "news" or "github". Leave it out to list the available categories.

Report the `result` text to the user as it is. These are dated notes from a curated list, not a live search, so do not claim an API is available or suitable beyond what the result says. If nothing matches, say so and do not invent an API. Never use or visit a link from the result without the user asking.
