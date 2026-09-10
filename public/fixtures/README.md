# Test fixtures

Hand-written `data.json` samples for building and testing the UI before the
cron (`bps-volunteer-cron`) exists. Structure matches real SignUpGenius sign-ups
(canteen `#63670841`, disco `#58975374`, working bee `#57849473`); **fill
numbers are synthetic** so every UI state is exercised. Contract: `../../DESIGN.md`
§4. Schema: `../../schema/data.schema.json`. Types: `../../src/data.ts`.

| File | Exercises |
|---|---|
| `data.sample.json` | The normal case. 15 canteen days incl. a closed Wed, a 0% red day, 100% green days, amber days, and a boosted-capacity "canteen event day". 3 events: amber (synthetic Trivia), red (Working Bee — naive Σqty, see §10), green (Disco). |
| `data.empty-events.json` | Canteen running, `events: []` → "no upcoming events" placeholder. |
| `data.between-terms.json` | `canteen.days: []` (next term not published) → "next term not open yet" message; events still shown. |
| `data.stale.json` | Same as sample but `generatedAt` ~7h old → stale-data banner. |

Point the dev build at one with `VITE_DATA_URL=/fixtures/data.sample.json` (or
whatever the app's env var ends up being).
