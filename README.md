# bps-volunteer-ui

React SPA for the Beecroft Public School P&C volunteer dashboard. Shows the
canteen roster and upcoming events at a glance, and links straight through to
SignUpGenius. See [`DESIGN.md`](DESIGN.md) for the full design.

- `bps-volunteer-ui` — this repo (the SPA)
- [`bps-volunteer-backend2`](https://github.com/wkapri/bps-volunteer-backend2) —
  Google Apps Script fetcher that computes and serves the data

## Develop

```bash
npm install
npm run dev
```

Opens against `public/fixtures/data.sample.json`. Switch fixture with a query
param: `?data=stale`, `?data=empty-events`, `?data=between-terms`, or
`?data=https://…` for a real URL. Fixtures are described in
[`public/fixtures/README.md`](public/fixtures/README.md).

## Scripts

| | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run preview` | serve the built `dist/` |

## Data source

The build reads `VITE_DATA_URL` (the `bps-volunteer-backend2` Apps Script web
app's `/exec` URL). Without it, the app falls back to the bundled sample
fixture.

## Deploy

Firebase Hosting. Build with the right base path and data URL, then deploy:

```bash
VITE_BASE=/ VITE_DATA_URL="https://script.google.com/macros/s/.../exec" npm run build
firebase deploy --only hosting
```

(On Windows Git Bash, prefix with `MSYS_NO_PATHCONV=1` — otherwise
`VITE_BASE=/` gets mangled into a local filesystem path.)

## Key files

- [`src/data.ts`](src/data.ts) — the `data.json` type + status logic
- [`schema/data.schema.json`](schema/data.schema.json) — JSON Schema (mirror; `bps-volunteer-backend2` owns the canonical)
- [`src/lib/useVolunteerData.ts`](src/lib/useVolunteerData.ts) — fetch, cache, refresh
- [`src/components/`](src/components) — Header, CanteenRow, EventsGrid, Footer, Banner, Skeleton
