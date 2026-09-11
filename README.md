# bps-volunteer-ui

React SPA for the Beecroft Public School P&C volunteer dashboard. Shows the
canteen roster and upcoming events at a glance, and links straight through to
SignUpGenius. See [`DESIGN.md`](DESIGN.md) for the full design.

- `bps-volunteer-ui` — this repo (the SPA)
- [`bps-volunteer-backend`](https://github.com/wkapri/bps-volunteer-backend) —
  hourly fetcher that builds and serves `data.json` (covers what `DESIGN.md`
  calls `bps-volunteer-cron` *and* `bps-volunteer-data` — merged into one
  repo; see that repo's README "Deviations from DESIGN.md")

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

The build reads `VITE_DATA_URL` (`bps-volunteer-backend`'s Pages URL). Without
it, the app falls back to the bundled sample fixture. In CI it defaults to
`https://wkapri.github.io/bps-volunteer-backend/data.json`, overridable via
the `VITE_DATA_URL` Actions **variable**.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on push to
`main`. Set the Pages source to "GitHub Actions". The Vite `base` defaults to
`/bps-volunteer-ui/`; override with the `VITE_BASE` env var for a user/org root
site or custom domain.

## Key files

- [`src/data.ts`](src/data.ts) — the `data.json` type + status logic
- [`schema/data.schema.json`](schema/data.schema.json) — JSON Schema (mirror; `bps-volunteer-backend` owns the canonical)
- [`src/lib/useVolunteerData.ts`](src/lib/useVolunteerData.ts) — fetch, cache, refresh
- [`src/components/`](src/components) — Header, CanteenRow, EventsGrid, Footer, Banner, Skeleton
