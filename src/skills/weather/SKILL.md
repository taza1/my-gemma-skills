---
name: weather
description: Get current weather, a short forecast and Irish weather warnings for a named place.
---

# Weather

Needs internet. Use it when the user asks about the weather, temperature, rain, wind or weather warnings for a place, for example "weather in Cork" or "will it rain in Galway tomorrow?".

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: index.html
- data: A JSON string with the following fields:
  - place: String. Required. The town or city name only, for example "Cork". Never guess a place the user did not name; ask them first.
  - country: String. Optional. A 2-letter country code such as "IE", "GB" or "US". Leave it out if the user did not say.
  - days: Number. Optional. How many forecast days, 1 to 3. Leave it out for the default of 2.

Report the `result` text to the user as it is, keeping the sources and the warnings section. Do not add weather facts that are not in the result. If the tool returns an error, tell the user what it says and do not guess.
