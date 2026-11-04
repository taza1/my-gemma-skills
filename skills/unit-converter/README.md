# unit-converter

**What it does:** converts a number between units in eight categories: length, mass, temperature, volume, speed, area, data size, time. Fully offline; nothing leaves the phone.

**Status:** Tested locally (automated tests pass on the PC). Not yet tried on the phone.

## Parameters
| Field | Type | Example |
|---|---|---|
| `value` | number (numeric text also accepted) | `10` |
| `from` | unit name or alias | `mi`, `miles`, `F`, `GB` |
| `to` | unit name or alias | `km`, `C`, `MiB` |

## Behaviour
- Aliases are case-insensitive and ignore spaces and the degree sign (`km/h`, `kph`, `°C`, `degC`).
- Plain plural forms are tolerated (`kms`, `inches`).
- **Data:** `KB`, `MB`, `GB`, `TB` are **1000-based**; `KiB`, `MiB`, `GiB`, `TiB` are **1024-based**. `kb` means kilobyte, not kilobit; bits are spelled `bit`, `kbit`, `Mbit`, `Gbit`.
- **Gallons/pints/cups/fl oz** are US measures; `ukgal` is the imperial gallon.
- **Year** = 365.25 days.
- Output uses 7 significant digits; very large or small values use scientific notation.

## Errors (never an invented result)
- Missing, empty or non-numeric `value`, `from` or `to` → names the field.
- Unknown unit → names the field and gives examples.
- Mismatched categories (e.g. kg to km) → says which categories clash.
- Below absolute zero (e.g. -300 C) → refused.
- Result overflow → refused.

## Example prompts
- "Convert 10 miles to km"
- "What is 70 F in Celsius?"
- "How many MiB is 2 GB?"
- "5 kg to pounds"

## Security / privacy
No network access, no secret, no external data. Input is parsed as JSON and used only as numbers and lookup keys.

## Known limitations
Not tested on a device. No currency (see the currency skill), no months, no compound units beyond the speed units listed.
