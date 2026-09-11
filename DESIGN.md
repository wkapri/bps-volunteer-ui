# BPS P&C Volunteer Dashboard — Design

Status: **draft** · Last updated: 2026-09-10

This is the canonical design doc for the Beecroft Public School P&C volunteer
dashboard and its supporting jobs. It spans two repositories (see
[Repositories](#repositories)) and lives in `bps-volunteer-ui`.

---

## 1. Problem & objective

BPS P&C runs volunteering through **SignUpGenius** (Silver / Pro plan). It works,
but the volunteer-facing UI is clunky: a single long list of every slot that the
user must scroll through. The recurring **canteen** roster is the worst case —
every weekday, two shifts, a whole term at a time.

**Objective:** a simple, friendly public dashboard that:

1. Shows the **next canteen days** at a glance, making it obvious which days are
   covered and which need volunteers.
2. Shows **all current one-off events** (trivia night, Father's Day stall,
   working bee, disco, …) with an at-a-glance "how badly do we need help"
   indicator.
3. Sends users to the right place in SignUpGenius to actually sign up — for
   canteen, **deep-linked to the specific day**.

The dashboard never takes sign-ups itself. SignUpGenius remains the system of
record for slots, sign-ups, reminders and (for now) confirmation emails.

### Non-goals (v1)

- No authentication, no admin UI, no write-back to SignUpGenius.
- No per-volunteer data on the dashboard (counts only).
- Notification/digest email to the canteen manager — **designed here, built
  later** (see [§8](#8-canteen-notification-job-later)).
- "Save the date" events that don't exist in SignUpGenius yet.
- Per-role breakdown within a one-off event.

---

## 2. Architecture overview

> **Deviation from the original plan (see decisions log, §11):**
> `bps-volunteer-cron` and `bps-volunteer-data` were merged into one repo,
> `bps-volunteer-backend`. It writes `docs/data.json` and commits it to
> itself using the workflow's automatic `GITHUB_TOKEN` — no cross-repo PAT to
> create/rotate/expire, and every hourly run counts as activity on the repo
> that hosts the scheduled workflow, so it can't hit GitHub's 60-day
> scheduled-workflow auto-disable. Two repos total now, not three.

```
 SignUpGenius  ──►  bps-volunteer-backend  ──►  bps-volunteer-ui
  (Pro API +        (GitHub Actions, hourly;      (React SPA,
   public sheet      writes + serves data.json      GitHub Pages)
   data)             via its own GitHub Pages)
```

- **`bps-volunteer-backend`** runs every hour on GitHub Actions. It reads
  canteen + event data from SignUpGenius, computes status, writes
  `docs/data.json`, and commits it back to itself — served by this same
  repo's GitHub Pages (`/docs` folder).
- **`bps-volunteer-ui`** is a static React SPA on GitHub Pages. On load (and
  periodically while open) it fetches `data.json` cross-origin and renders the
  dashboard.

If the cron fails, it **does not overwrite** the last good `data.json`. The UI
shows how old the data is.

---

## 3. Repositories

| Repo | Contents | Hosting | Secrets |
|---|---|---|---|
| `bps-volunteer-ui` | React + Vite + TypeScript SPA. This `DESIGN.md`. Mirrored `data.json` TS type. | GitHub Pages (project site) | – |
| `bps-volunteer-backend` | Node/TS fetcher, status logic, `data.json` writer. **Owns the `data.json` schema.** GitHub Actions workflow (hourly) writes `docs/data.json` and commits it back to this same repo. | GitHub Pages, `/docs` folder (serves `data.json`) + GitHub Actions | `SUG_API_KEY` |

**Ownership / continuity:** recommend creating a free GitHub **organisation**
(e.g. `beecroft-pnc`) to hold both repos, so ownership survives volunteers
rotating out. URLs also read better:
`https://beecroft-pnc.github.io/bps-volunteer-ui/`. A personal account works for
v1 but you can't choose an arbitrary `*.github.io` subdomain — that's the account
or org name. A custom domain (e.g. `volunteer.beecroftpnc.org.au` via `CNAME`)
can be added later if the P&C gets one.

---

## 4. Data model & `data.json` contract

`data.json` is the entire contract between cron and UI. It is public — **counts
only, never names**.

### 4.1 Shape

```jsonc
{
  "generatedAt": "2026-09-10T15:00:12+10:00", // last SUCCESSFUL data build, Sydney time
  "timezone": "Australia/Sydney",
  "schemaVersion": 1,

  "canteen": {
    "signupId": 63670841,
    "title": "Canteen Volunteer Term 4 2026",
    "signupUrl": "https://www.signupgenius.com/go/10C054FABA722AAFFC07-63670841-canteen",
    "days": [
      {
        "date": "2026-09-15",          // ISO date, Sydney
        "weekday": "Tuesday",
        "status": "amber",             // "green" | "amber" | "red" | "closed"
        "capacity": 2,                  // sum of shift capacities that day
        "filled": 1,
        "fillPct": 50,                  // rounded int; null when capacity 0 / closed
        "deepLink": "https://www.signupgenius.com/go/10C054FABA722AAFFC07-63670841-canteen#/#836678361-date-wrap",
        "shifts": [                     // detail retained for future UI; UI v1 rolls up
          { "label": "10-12", "capacity": 1, "filled": 1 },
          { "label": "12-2",  "capacity": 1, "filled": 0 }
        ]
      },
      {
        "date": "2026-09-16",
        "weekday": "Wednesday",
        "status": "closed"             // closed days: status only, no counts/deepLink
      }
    ]
  },

  "events": [
    {
      "id": 63999001,
      "title": "Trivia Night",
      "date": "2026-10-18",            // single date (v1 assumes one event = one date)
      "description": "Our biggest fundraiser of the year — grab a table!",
      "imageUrl": "https://cdn.signupgenius.com/.../thumb.jpg",
      "signupUrl": "https://www.signupgenius.com/go/....",
      "status": "red",
      "capacity": 40,
      "filled": 8,
      "fillPct": 20
    }
  ],

  "diagnostics": {                     // optional, for debugging; UI ignores
    "canteenSource": "public-sheet",   // "public-sheet" | "key-api"
    "eventsFetched": 4,
    "warnings": []
  }
}
```

### 4.2 Rules

**Canteen days included:** weekdays only (Mon–Fri). Sat/Sun are never emitted —
the UI shows Friday then Monday. A day is emitted for every weekday from "today"
(per the 3pm rule below) up to the last date SignUpGenius has published slots
for.

**"Closed" detection:** a weekday **within the published window** (≤ the latest
canteen slot date) that has **zero slots** in the source data → `status:
"closed"`. Weekdays beyond the last published slot date are simply not emitted
(term not published yet). Capacity 0 for any other reason is also treated as
`closed`.

**Day rollover ("today"):** a canteen day stops being shown at **15:00
Australia/Sydney** on that date (both shifts effectively done). Before 3pm, today
still appears with its live status. The cron runs in UTC and must convert with a
DST-aware library (`Australia/Sydney`).

**Status thresholds (v1 — same formula for canteen days and events):**

| `fillPct` | status | icon + label |
|---|---|---|
| `< 25` | `red` | ✕ Needs volunteers |
| `25–74` | `amber` | ! Some help needed |
| `≥ 75` | `green` | ✓ Well covered |

`fillPct = round(100 * filled / capacity)`. `0/0` and closed → `closed`.
Explicitly noted as a first pass; likely to be refined (e.g. force `red` if any
shift/critical role is completely empty).

**Events included:** every active one-off in the SignUpGenius account that is
**not** the canteen sign-up. Shown regardless of how far out. Dropped at **Sydney
midnight** after the event date passes. Sorted **soonest first** in the UI.

**Identifying the canteen sign-up:** match a configurable title prefix
(`Canteen Volunteer*`) with an optional explicit `signupId` override in cron
config. The canteen manager follows a runbook to name each term's sign-up
consistently.

**Event capacity math:** intended to come from a single
`/signups/report/all/{signupid}/` call per event (to be confirmed against a real
key — see [§10](#10-open-questions--to-verify)). `capacity` = sum of slot
quantities; `filled` = sum of taken quantities; roll up to one event-level
percentage.

### 4.3 Failure behaviour

- Any error fetching/parsing SignUpGenius → **abort the run, keep the previous
  `data.json`**. Never publish a partial or empty file.
- Transient partial failure (e.g. one event 500s) → skip that event, record a
  `diagnostics.warnings` entry, publish the rest. **After 3 failed events in a
  run, email William** (reuses the notification-job mail path) and still publish
  what succeeded.
- The UI treats `generatedAt` age as the single source of truth for freshness.

---

## 5. `bps-volunteer-backend`

*(covers what this doc originally split into `bps-volunteer-cron` and
`bps-volunteer-data` — merged, see §2 and §11.)*

- **Runtime:** Node + TypeScript, run by GitHub Actions on
  `schedule: cron` — hourly, every day. (Cadence may be relaxed later.)
- **Inputs:** `SUG_API_KEY` (SignUpGenius Pro key) only. Committing
  `docs/data.json` back to this same repo uses the workflow's automatic
  `GITHUB_TOKEN` (`permissions: contents: write`) — no cross-repo PAT needed.
- **Steps:**
  1. Resolve the canteen sign-up (title prefix / id override).
  2. Get canteen per-day, per-shift capacity + filled + the per-date anchor id
     needed for the deep link (`<slotid>-date-wrap`). Preferred source: the
     **public sign-up sheet data endpoint** (no key, no documented rate limit) —
     see [§10](#10-open-questions--to-verify). Fallback: key API + bare event URL
     (no deep link).
  3. List active sign-ups; treat every non-canteen one as an event; fetch its
     report, description and thumbnail.
  4. Compute `status` / `fillPct` per the rules above; apply weekday filter,
     closed detection, 3pm and midnight rollovers in `Australia/Sydney`.
  5. Serialise `data.json` to `docs/data.json`. If the SignUpGenius reads all
     succeeded, commit & push to this repo (always — `generatedAt` changes
     each run so there is always a diff; commit message tagged `[skip ci]`).
     Served via this repo's own GitHub Pages (`/docs` folder), e.g.
     `https://wkapri.github.io/bps-volunteer-backend/data.json`, with
     `Access-Control-Allow-Origin: *` so the UI fetches it cross-origin with
     no proxy.
- **API budget:** hourly × (≈1 canteen + ~4–6 events × 1 report call) ≈ **well
  under the 500/day** Silver limit even before considering the keyless canteen
  path.

---

## 6. `bps-volunteer-data` (retired)

Originally a separate repo holding only `data.json`. Merged into
`bps-volunteer-backend` (§2, §5, §11) — `data.json` now lives at
`docs/data.json` there, served by that repo's own GitHub Pages. Kept as a
numbered section so cross-references elsewhere in this doc (§8, §10, …) don't
shift.

---

## 7. `bps-volunteer-ui` — the SPA

### 7.1 Stack

- **React 19 + Vite + TypeScript**, hand-written CSS (no Tailwind / component
  lib — the app is small and has a strong custom look).
- Existing scaffold is JS; migrate to TS as first task.
- Deployed to GitHub Pages via `actions/deploy-pages` on push to `main`.
- No backend, no analytics (v1).

### 7.2 Layout

```
┌────────────────────────────────────────────────────────┐
│  [crest]  Beecroft Public School P&C — Volunteer         │  header
│           Canteen roster & upcoming events               │
├────────────────────────────────────────────────────────┤
│  CANTEEN                                    ‹  ›         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  →        │  horizontal,
│  │ Mon  │ │ Tue  │ │ Wed  │ │ Thu  │ │ Fri  │           │  5 visible,
│  │ 15/9 │ │ 16/9 │ │ 17/9 │ │ 18/9 │ │ 19/9 │           │  scroll-snap
│  │ ✓    │ │ !    │ │closed│ │ ✕    │ │ ✓    │           │
│  │ 2/2  │ │ 1/2  │ │  —   │ │ 0/4  │ │ 4/4  │           │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │
├────────────────────────────────────────────────────────┤
│  UPCOMING EVENTS                                         │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │  responsive
│  │ [thumb]       │ │ [thumb]       │ │ [thumb]       │   │  grid,
│  │ Trivia Night  │ │ Working Bee   │ │ Disco Night   │   │  soonest first
│  │ Sat 18 Oct    │ │ Sun 26 Oct    │ │ Fri 21 Nov    │   │
│  │ ✕ 8/40 (20%)  │ │ ! 6/10 (60%)  │ │ ✓ 38/40 (95%) │   │
│  │ short desc…   │ │ short desc…   │ │ short desc…   │   │
│  └───────────────┘ └───────────────┘ └───────────────┘   │
├────────────────────────────────────────────────────────┤
│  Volunteer numbers last updated 12:00 pm, 10 Sep (Sydney)│  footer
│  Full sign-up on SignUpGenius · BPS P&C website · contact│
└────────────────────────────────────────────────────────┘
```

### 7.3 Components & behaviour

- **Header:** school crest + "Beecroft Public School P&C" wordmark. Blue
  (crest blue) primary. Friendly/rounded style.
- **Canteen row:**
  - One tile per emitted canteen day. **Day name prominent**, date small
    beneath.
  - Rolled-up status: colour + **icon + short label** + raw `filled/capacity`.
  - **Closed** tiles are visually distinct (muted, "Canteen closed"), not
    clickable, shown so people don't misalign the week.
  - Open tiles are a link → the day's `deepLink` (new tab). If `deepLink` is
    absent, fall back to `canteen.signupUrl`.
  - 5 tiles visible; horizontal scroll-snap + drag on all sizes; **‹ ›
    arrow buttons on ≥ 768px**. Scrolls to end of published term.
- **Events grid:** card = thumbnail, title, date, status (colour + icon +
  label + `filled/capacity (pct%)`), short description. Whole card links to
  `signupUrl` (new tab). Responsive grid, soonest first. **If `events` is
  empty**, show a friendly placeholder ("No upcoming events right now — check
  back soon") instead of the grid.
- **Footer:** `generatedAt` rendered in Sydney local format; links (full
  SignUpGenius, P&C website [under construction], contact). Content to be
  refined.
- **Status semantics (colour + non-colour cue, always paired):**
  - `green` ✓ "Well covered"
  - `amber` ! "Some help needed"
  - `red` ✕ "Needs volunteers"
  - `closed` – "Canteen closed"

### 7.4 Data fetching & runtime states

- Fetch `data.json` on load; **re-fetch every ~15 min and on tab
  `focus`/`visibilitychange`**.
- **Loading:** skeleton tiles/cards matching final layout (gentle pulse), no
  spinner, no layout shift.
- **Success:** cache the parsed payload in `localStorage`.
- **Fetch failure:** render from the `localStorage` cache if present, with a
  banner ("Couldn't refresh just now — showing the last data we have"). If no
  cache, a friendly error card with a "Try again" button and a direct
  SignUpGenius link.
- **Stale banner:** if `now − generatedAt > 3 hours`, show a subtle strip:
  "Volunteer numbers last updated N hours ago."
- **Accessibility:** semantic landmarks, keyboard-focusable tiles/cards with
  visible focus ring, `aria-label` carrying full status text
  ("Tuesday 16 September, some help needed, 1 of 2 shifts filled"), colour
  contrast ≥ WCAG AA, respects `prefers-reduced-motion` (disable pulse/scroll
  animation).
- Responsive: single-column events grid + full-width scrollable canteen row on
  mobile.

---

## 8. Canteen notification job (later)

Not built in v1; captured so the schema/repo choices don't block it.

- **When:** every day at **09:00 Australia/Sydney** (separate scheduled workflow
  in `bps-volunteer-backend`).
- **Content:** that day's canteen sign-ups — **names per shift** (this job reads
  the SignUpGenius API directly; names never enter `data.json`). Possible future
  extension: a few days ahead / gap alerts — **out of scope, idea to ponder.**
- **Scope:** canteen only. No one-off events.
- **Channel:** email. Simplest path = **Gmail SMTP + App Password** with the
  `dawidd6/action-send-mail` action (needs 2FA on the Google account, an app
  password stored as `MAIL_USERNAME` / `MAIL_PASSWORD` secrets). Alternative:
  Resend (100/day free, wants domain verification).
- **Recipients:** canteen manager + William. A plain list in the
  `bps-volunteer-backend` repo config is fine for now.

---

## 9. Milestones

1. **M0 — this doc agreed.**
2. **M1 — schema + fixtures.** ✅ `data.json` v1 shape frozen.
   - `schema/data.schema.json` — JSON Schema (mirror; `bps-volunteer-backend`
     owns the canonical).
   - `src/data.ts` — TS types + `statusFromPct` + `STATUS_META`.
   - `public/fixtures/*.json` — sample, empty-events, between-terms, stale
     (all validate; see `public/fixtures/README.md`).
   - `ajv` schema validation wired into `bps-volunteer-backend` CI (`npm run
     validate`, run after every generate before publishing). ✅
3. **M2 — UI against fixtures.** ✅ Scaffold migrated JS→TS. Full SPA built and
   styled against the fixtures: header + crest placeholder, canteen row
   (scroll-snap, desktop arrows, closed tiles, deep links), events grid,
   skeleton loading, stale banner, error + localStorage fallback, empty/
   between-terms states. `.github/workflows/deploy.yml` publishes to Pages.
   Remaining: real school crest asset, final footer links.
4. **M3 — cron, canteen only.** ✅ *(mostly)* `bps-volunteer-backend` resolves
   the real canteen sign-up, computes per-day/per-shift status against live
   SignUpGenius data, and commits `docs/data.json` to itself hourly, served
   via its own Pages. `VITE_DATA_URL` defaults to that URL. Remaining: confirm
   the deep-link anchor against a real browser click-through (§10, still
   flagged unverified) and confirm `SUG_API_KEY`/Pages are live in production
   (see `bps-volunteer-backend`'s README).
5. **M4 — cron, events.** ✅ *(mostly)* Non-canteen active sign-ups are fetched,
   summed into `capacity`/`filled`/`status`, and included in `data.json`; UI
   events grid renders them. Remaining: real description/image source (§10).
6. **M5 — hardening.** Failure modes, stale banner, localStorage cache,
   accessibility pass, canteen-manager runbook.
7. **M6 (later) — notification job.**

---

## 10. Open questions / to verify

- [ ] **Deep-link source.** Confirm, with a real Pro API key against the real
      canteen sign-up, whether `slotid` (the per-date anchor id
      `<slotid>-date-wrap`) is obtainable from `/signups/report/all/{id}/` or
      only from the **public sign-up sheet data endpoint**
      (`SUGboxAPI.cfm?go=s.getSignupInfo`, POST, keyless). Deep linking to a
      date is **confirmed working** in the browser; the question is purely how
      the cron gets the id. Fallback: link to the bare event URL.
- [ ] **Event data in one call.** Confirm `/signups/report/all/{signupid}/`
      returns enough to compute total vs filled capacity and to read the event
      description + thumbnail, or whether extra calls
      (`/signups/created/active/`, `available`/`filled`) are needed.
- [ ] **`filled` = quantity taken, not participant count.** SignUpGenius slots
      can have qty-per-signup (Working Bee: 3 people signed up for 6 spots).
      Sum `qtytaken` / `myqty`, not `participantcount`.
- [ ] **Not every slot is a "volunteer needed" slot.** Working Bee has
      "BBQ eaters ×200", "Useful tools to bring ×20" — a naive
      `filled / Σqty` gives 7/327 = 2% and screams "desperate" when it isn't.
      Options: (a) cron config listing which slot labels/itemids count toward
      the indicator per event; (b) ignore slots with qty above a threshold
      (e.g. >30); (c) manager convention (real volunteer slots only). **v1
      ships the naive number** (per your call to keep it simple), but the
      dashboard indicator for events like this will be misleading until we
      pick one.
- [ ] **Event description + image source.** For the three real sign-ups,
      `header.description` is an empty trusted-value and `beforemessage` is
      blank — only a SignUpGenius theme banner (`og:image`) is available. Need
      to confirm where a real description/thumbnail would come from in the API,
      or decide the cron carries a small hand-maintained
      `events.overrides.json` (title → description/image) in the cron repo.
- [x] **Thu/Fri & event-day capacity** flows entirely from SignUpGenius. The
      canteen manager sets Thu/Fri quantities, and bumps slot quantities for
      special "canteen event" days that need extra help. Cron never hard-codes
      capacity.
- [x] **Partial-failure policy:** skip failed events with a warning; after **3
      failed events in one run**, email William; still publish the rest.
- [ ] **Footer content** — exact links and contact address.
- [ ] **GitHub org** — create `beecroft-pnc` (or similar) vs personal account.
- [ ] **Status thresholds** — validate 25 / 75 against a real term once live;
      decide whether an empty shift/role forces `red`.
- [ ] **Term boundaries / holidays** — behaviour between terms (no published
      slots): dashboard shows an empty canteen row with a "next term not open
      yet" message?

---

## 11. Decisions log

- SPA reads a single public `data.json`; SignUpGenius stays system of record.
- Two repos: `bps-volunteer-ui`, `bps-volunteer-backend`. Originally planned
  as three (`-ui`, `-cron`, `-data`); merged `-cron` and `-data` into
  `bps-volunteer-backend` to avoid a cross-repo PAT (expires; needs manual
  rotation) and the risk of GitHub's 60-day scheduled-workflow auto-disable
  hitting a repo that only ever pushed to a *different* repo. Trade-off:
  hourly data commits now live in the same repo as the fetcher's source code,
  rather than isolated — accepted as the smaller cost.
- `data.json` regenerated hourly, every day; cron never overwrites good data
  with a failed run.
- Data is **counts only, no names**. Names live only in the (later) email job.
- Canteen click-through = **deep link to the day** on SignUpGenius; slot
  selection + submit happen there. One-off click-through = plain event URL.
- Canteen row: weekdays only, Fri→Mon (no weekend tiles), 5 visible then
  scroll, day name prominent + small date, closed days shown as muted
  placeholders.
- One rolled-up status colour per canteen day and per event, with raw counts
  shown; colour always paired with icon + label.
- Status: `fillPct < 25` red, `25–74` amber, `≥ 75` green — same formula
  everywhere for v1.
- Day rollover 15:00 Sydney (canteen); events drop at Sydney midnight after
  their date.
- Stack: React + Vite + TypeScript + hand-written CSS. Friendly/rounded,
  crest-blue. Status needs icon + label, not colour alone.
- SPA re-fetches every ~15 min + on focus; skeleton loading; localStorage
  fallback; 3h stale banner.
- Notification email: designed, deferred; Gmail SMTP + App Password the likely
  channel; 9am Sydney; canteen only; names included.
- Capacity (incl. Thu/Fri and special canteen-event days) always flows from
  SignUpGenius slot quantities; cron never hard-codes it.
- After 3 failed events in a run, cron emails William and publishes the rest.
- Empty `events` → UI shows a placeholder message, not an empty grid.
