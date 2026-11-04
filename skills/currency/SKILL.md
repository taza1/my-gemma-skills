---
name: currency
description: Convert an amount of money between currencies using today's indicative exchange rate.
---

# Currency

Needs internet. Use it when the user asks to convert money or asks an exchange rate, for example "100 dollars in euro" or "how much is 50 GBP in yen?".

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: index.html
- data: A JSON string with the following fields:
  - amount: Number. Optional. The amount of money. Leave it out for 1.
  - from: String. Optional. The currency to convert from, as a 3-letter code such as "USD", "GBP", "JPY". Leave it out only if the user wants euros as the starting currency.
  - to: String. Optional. The currency to convert to, as a 3-letter code such as "EUR". Leave it out only if the user wants euros as the target.
  - Give at least one of `from` and `to`. A missing one means EUR.

Report the `result` text to the user as it is, including the rate time and the source line. The rates are indicative only, so never describe them as exact. If the tool returns an error, tell the user what it says and do not guess a rate.
