# Rejected APIs

Reasons are stated plainly. "Not re-fetched" means the claim comes from general knowledge of the provider and was **not** re-checked against its documentation on 04/11/2026; rejection does not depend on it because each is also excluded by the keyless/no-proxy policy or by missing coverage.

## Weather
| API | Reason | Evidence |
|---|---|---|
| wttr.in | No published terms, rate limits or uptime commitment found; community-run; third-party data of unstated origin. CORS and JSON were fine in a test (200, ACAO `*`) | Tested 04/11/2026 |
| MET Norway as primary | Compact response lacks feels-like and precipitation probability; their terms say browsers and mobile apps should use a proxy (kept as documented fallback, see `api-candidates.md`) | Terms page read 04/11/2026; response fields observed |
| Met Éireann warnings RSS | Browser fetch failed (curl succeeded); marine items differ from the JSON feed; XML parsing adds weight. JSON feed preferred | Tested 04/11/2026 |
| `warning_EI16.json` | HTTP 404 | Tested 04/11/2026 |
| Met Éireann ICHEC forecast host (`metwdb-openaccess.ichec.ie`) | Host did not resolve (DNS) from this PC; stale or retired | Tested 04/11/2026 |
| OpenWeatherMap, WeatherAPI.com, Tomorrow.io, Visual Crossing, AccuWeather | Require an API key; a key in public JavaScript is not acceptable and the platform secret mechanism is off-limits without approval | Not re-fetched |
| US National Weather Service (api.weather.gov) | US locations only; cannot serve Irish places | Not re-fetched |

## Currency
| API | Reason | Evidence |
|---|---|---|
| ECB `eurofxref-daily.xml` | Reachable with curl but the **browser fetch failed** (no CORS header), so a skill in the WebView cannot read it without a proxy. XML as well | Tested 04/11/2026 |
| exchangerate.host | HTTP 401 `missing_access_key`: needs an API key | Tested 04/11/2026 |
| Frankfurter (for now) | Unreachable at test time (HTTP 522 on v1 and v2); see `api-candidates.md` | Tested 04/11/2026 |
| fawazahmed0/currency-api (for now) | Provenance of rates not stated; community-run | README read 04/11/2026 |

## News
| API | Reason | Evidence |
|---|---|---|
| BBC News RSS (`feeds.bbci.co.uk/news/*`) | Browser fetch failed (no CORS header), so a skill cannot read it without a proxy | Tested 04/11/2026 |
| RTÉ RSS (`rte.ie/news/rss/news-headlines.xml`) | curl got a 301 redirect; browser fetch failed | Tested 04/11/2026 |
| The Guardian RSS (world, AI, business) | Browser fetch failed (no CORS) | Tested 04/11/2026 |
| NPR RSS | CORS allowed only for `https://apps.npr.org`; browser fetch failed | Tested 04/11/2026 |
| Al Jazeera, The Irish Times, Ars Technica, The Verge, TechCrunch RSS | Browser fetch failed (no CORS) | Tested 04/11/2026 |
| rss2json.com (third-party RSS-to-JSON proxy) | CORS works, but it is an unvetted third party that would see every feed URL and could alter headlines in transit; terms and limits not read. Untrusted supply chain | Tested 04/11/2026 (HTTP 200) |
| NewsAPI.org | Needs a key; the browser request returned HTTP 426 | Tested 04/11/2026 |
| GDELT DOC API | Answers, but HTTP 429 "one request every 5 seconds" and about 10 s latency; CORS unconfirmed | Tested 04/11/2026 |
| Wikipedia REST "featured" feed `news` section | The `news` key was absent (keys: tfa, mostread, image, onthisday) | Tested 04/11/2026 |
| GNews, Currents, TheNewsAPI, Mediastack, New York Times, Guardian Open Platform | Require API keys | Not re-fetched |
