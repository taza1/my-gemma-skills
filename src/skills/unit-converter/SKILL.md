---
name: unit-converter
description: Convert a number between units of length, mass, temperature, volume, speed, area, data size or time.
---

# Unit converter

Works offline. Use it whenever the user asks to convert a value from one unit to another, for example "10 miles in km" or "70 F in C".

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: index.html
- data: A JSON string with the following fields:
  - value: Number. The amount to convert, for example 10.
  - from: String. The unit to convert from, for example "mi", "kg", "F", "GB".
  - to: String. The unit to convert to, for example "km", "lb", "C", "MiB".

Report the `result` text to the user as is. If the tool returns an error, tell the user what the error says and do not guess an answer.
