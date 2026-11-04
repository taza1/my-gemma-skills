# currency

**What it does:** converts an amount between currencies using the daily exchange rate from ExchangeRate-API's open endpoint. Shows the rate, when it was updated, the source with its required attribution, and says clearly that rates are **indicative**.

**Status:** Tested locally (mocked tests + one manual live run). **Not yet tried on the phone**, and not tested in the Android WebView.

## Parameters
| Field | Type | Notes |
|---|---|---|
| `amount` | number, optional | Default 1. Must be 0 or more |
| `from` | text, optional | 3-letter code (`USD`) or a common name/symbol (`dollars`, `pounds`, `€`) |
| `to` | text, optional | Same. **At least one of `from`/`to` is required; a missing one defaults to EUR** (your default currency) |

"Dollar" means US dollar; other dollars and ambiguous names such as "peso" must use the code (`CAD`, `MXN`).

## What leaves the phone
Only the **`from` currency code** (in the URL) and the phone's IP address go to `open.er-api.com`. The amount never leaves the phone. Plain GET, no custom headers, no key.

## Behaviour
- Output example:
  ```
  100.00 USD = 89.35 EUR
  Rate: 1 USD = 0.8935 EUR
  Rates updated 04/11/2026 00:02 (Europe/Dublin); next update about 05/11/2026 00:18. Rates are indicative only and not suitable for actual transactions.
  Source: Rates By Exchange Rate API (https://www.exchangerate-api.com). Fetched 04/11/2026 10:30 (Europe/Dublin).
  ```
- **Caching:** rates for a base currency are kept in the page's `localStorage` for 1 hour, to respect the provider's rate limit. A cached answer says "Cached" with its fetch time. If storage is unavailable the skill just fetches.
- Amounts show 2 decimals (0 for JPY, KRW and similar), thousands separators, and more precision for tiny amounts.
- Rates older than 48 hours add a warning with the age.
- Same currency in and out returns the amount without any network call.

## Errors (never an invented rate)
Neither `from` nor `to` given; unknown/empty currency; negative or non-numeric amount; currency unsupported by the provider; HTTP 429 (shows "try again in about 20 minutes" or the provider's retry time); timeout (10 s); HTTP errors; unreadable or unexpected responses; result too large.

## Limits and conditions
- Provider terms: rates are "informational or illustrative"; no redistribution; free plans may change without notice; attribution required (the source line). See `research/api-candidates.md`.
- Rates update once a day, so this is not suitable for trading or real transfers. Use your bank's rate for those.

## Example prompts
- "Convert 100 dollars to euro"
- "How much is 50 GBP in yen?"
- "What's the euro rate against the pound?"
- "250 euro in USD"

## Known limitations
Not tested on a device. Single provider (no fallback). Historical rates and crypto are not supported.
