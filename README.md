# bps-volunteer-ui

React SPA for the Beecroft Public School P&C volunteer dashboard. Shows the
canteen roster and upcoming events at a glance, and links straight through to
SignUpGenius. One of three repos — see [`DESIGN.md`](DESIGN.md).

- `bps-volunteer-ui` — this repo (the SPA)
- `bps-volunteer-cron` — hourly fetcher that builds `data.json`
- `bps-volunteer-data` — hosts the generated `data.json`

## Develop

```bash
npm install
npm run dev
```

Opens against `public/fixtures/data.sample.json`. Switch fixture with a query
param: `?data=stale`, `?data=empty-events`, `?data=between-terms`, or
`?data=https://…/data.json` for a real URL. Fixtures are described in
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

The build reads `VITE_DATA_URL` (the `bps-volunteer-data` Pages URL). Without it,
the app falls back to the bundled sample fixture. In CI it comes from the
`VITE_DATA_URL` Actions **variable**.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on push to
`main`. Set the Pages source to "GitHub Actions". The Vite `base` defaults to
`/bps-volunteer-ui/`; override with the `VITE_BASE` env var for a user/org root
site or custom domain.

## Key files

- [`src/data.ts`](src/data.ts) — the `data.json` type + status logic
- [`schema/data.schema.json`](schema/data.schema.json) — JSON Schema (mirror; cron owns the canonical)
- [`src/lib/useVolunteerData.ts`](src/lib/useVolunteerData.ts) — fetch, cache, refresh
- [`src/components/`](src/components) — Header, CanteenRow, EventsGrid, Footer, Banner, Skeleton
