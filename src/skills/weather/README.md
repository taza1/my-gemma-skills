# weather

**What it does:** current conditions (temperature, feels-like, humidity, wind and gusts, rain, sky), a 1 to 3 day forecast with rain chance, and current Met Éireann warnings for places in the Republic of Ireland.

**Status:** Tested locally (automated tests with mocked network). **Not yet tried on the phone**, and not yet tested in the Android WebView. Real-API checks so far: see `research/api-candidates.md`.

## Parameters
| Field | Type | Notes |
|---|---|---|
| `place` | text, required | Town/city name. `"Cork, IE"` or `"Dublin, Ohio"` also work |
| `country` | text, optional | 2-letter code (`IE`, `GB`, `US`) or `Ireland`, `UK`, `USA`. Location is never assumed |
| `days` | whole number 1-3, optional | Default 2 |

## What leaves the phone
| Provider | Receives |
|---|---|
| Open-Meteo geocoding | The place name you asked for, and the phone's IP address |
| Open-Meteo forecast | Latitude/longitude of the matched place (not the phone's location), and the IP address |
| Met Éireann (`warning_ALL.json`) | Only the IP address. The whole national file is downloaded and filtered on the phone. Only fetched when the matched place is in the Republic of Ireland |

No key, account, or personal data is used. Requests are plain GETs with no custom headers.

## Behaviour
- Always shows the resolved place (name, region, country). If other places share the name it lists up to two (e.g. Dublin, Georgia).
- Defaults: °C, km/h, mm, `DD/MM/YYYY`, 24-hour time. "Now" is the place's local time as reported by Open-Meteo; "Retrieved" is Europe/Dublin time.
- **Warnings:** active ones only (expired are dropped). Those whose headline names your place (or its county) are listed first with details; the rest follow as "Elsewhere in Ireland" (headline only). Matching is by name in the headline because the feed's region codes are undocumented. Warning wording is passed through unchanged apart from stripping HTML and capping length (headline 160, details 200 characters). An empty feed says "none listed ... does not mean there is no weather risk".
- **Outside Ireland** warnings are not checked and the output says so.
- If the warnings feed fails, the forecast is still returned with "Warnings: unavailable".
- All text from the APIs is treated as untrusted: tags stripped, truncated, quoted.

## Errors (never an invented result)
Missing/empty `place`; bad `days`; unknown country; place not found; timeout (10 s per service); rate limit (HTTP 429, shows retry time if given); HTTP errors; unreadable or unexpected responses.

## Limits and conditions
- Open-Meteo's free tier is for **non-commercial** use and needs attribution (included in the output). Limits: 600/min, 5,000/h, 10,000/day per IP.
- Met Éireann licence: acknowledge the source; do not materially alter warnings; keep them current.
- Forecast for tomorrow's rain chance etc. is model data and can be wrong; this is not a safety service.

## Example prompts
- "What's the weather in Galway?"
- "Will it rain in Cork tomorrow?"
- "Any weather warnings for Dublin?"
- "Weather in Dublin, Ohio"

## Known limitations
Not tested on a device. Matching of warnings to a place is text-based. Only the Republic of Ireland has warnings. Forecast limited to 3 days.
