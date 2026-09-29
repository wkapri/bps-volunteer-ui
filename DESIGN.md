# BPS P&C Volunteer Dashboard — Design

Status: **draft** · Last updated: 2026-09-29

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
- "Save the date" events that don't exist in SignUpGenius yet.
- Per-role breakdown within a one-off event.

---

## 2. Architecture overview

```
 SignUpGenius  ──►  bps-volunteer-backend2  ──►  bps-volunteer-ui
  (Pro API +        (Google Apps Script,          (React SPA,
   public sheet      hourly time trigger;          Firebase Hosting)
   data)             PropertiesService +
                      doGet web app)
```

- **`bps-volunteer-backend2`** runs hourly on a Google Apps Script time
  trigger. It reads canteen + event data from SignUpGenius, computes status,
  and stores the result in `PropertiesService`. A `doGet` web app serves that
  as JSON.
- **`bps-volunteer-ui`** is a static React SPA on Firebase Hosting. On load (and
  periodically while open) it fetches the JSON cross-origin and renders the
  dashboard.

If a run fails, it **does not overwrite** the last good data — `doGet` keeps
serving whatever was last stored successfully. The UI shows how old the data
is.

---

## 3. Repositories

| Repo | Contents | Hosting | Secrets |
|---|---|---|---|
| `bps-volunteer-ui` | React + Vite + TypeScript SPA. This `DESIGN.md`. Mirrored `data.json` TS type. | Firebase Hosting | – |
| `bps-volunteer-backend2` | Apps Script fetcher, status logic, `data.json`-shaped web app. **Owns the `data.json` schema.** | Google Apps Script (time trigger + web app) | `SUG_API_KEY` (Script Property) |

Both repos live under the P&C's own accounts (GitHub + the school's Google
Workspace), so ownership survives volunteers rotating out.

---

## 4. Data model & `data.json` contract

`data.json` is the entire contract between the backend and UI. It is public —
**counts only, never names**.

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
still appears with its live status. The backend runs in UTC and must convert with
a DST-aware method (`Australia/Sydney`).

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
(`Canteen Volunteer*`) against the live active sign-ups list — fully automatic,
every run. The canteen manager follows a runbook to name each term's sign-up
consistently. No manual sign-up ID anywhere; a new term's sign-up or a new event
is picked up on the next hourly run with zero config changes.

**Event capacity math:** from a single `/signups/report/all/{signupid}/` call
per event (fallback path — the public sheet endpoint is tried first). `capacity`
= sum of slot quantities; `filled` = sum of taken quantities; roll up to one
event-level percentage.

### 4.3 Failure behaviour

- Any error fetching/parsing SignUpGenius → **abort the run, keep the previous
  data**. Never publish a partial or empty result.
- Transient partial failure (e.g. one event 500s) → skip that event, record a
  `diagnostics.warnings` entry, publish the rest.
- The UI treats `generatedAt` age as the single source of truth for freshness.

---

## 5. `bps-volunteer-backend2`

- **Runtime:** Google Apps Script, on an hourly time-driven trigger.
- **Inputs:** `SUG_API_KEY` (SignUpGenius Pro key), stored as a Script
  Property.
- **Steps:**
  1. Resolve the canteen sign-up (title prefix match — automatic).
  2. Get canteen per-day, per-shift capacity + filled + the per-date anchor id
     needed for the deep link (`<slotid>-date-wrap`). Preferred source: the
     **public sign-up sheet data endpoint** (no key, no documented rate limit,
     confirmed working — see [§9](#9-open-questions--to-verify)). Fallback: key
     API + bare event URL (no deep link).
  3. List active sign-ups; treat every non-canteen one as an event; fetch its
     report, description and thumbnail the same way (public endpoint first,
     key-API fallback).
  4. Compute `status` / `fillPct` per the rules above; apply weekday filter,
     closed detection, 3pm and midnight rollovers in `Australia/Sydney`.
  5. On full success, store the result in `PropertiesService`. A `doGet` web
     app serves whatever's currently stored, success or not — a failed run
     just leaves the last good data in place, never overwrites it.
- **API budget:** hourly × (≈1 canteen + a handful of events, mostly served by
  the keyless public endpoint) is well under any SignUpGenius rate limit.
- **Canteen notification email:** a separate function (`sendCanteenSummary`,
  optional daily trigger) emails the canteen manager the upcoming days' actual
  volunteer names and contact info — see [§7](#7-canteen-notification-job).

---

## 6. `bps-volunteer-ui` — the SPA

### 6.1 Stack

- **React 19 + Vite + TypeScript**, hand-written CSS (no Tailwind / component
  lib — the app is small and has a strong custom look).
- Deployed to Firebase Hosting (`firebase deploy`).
- No analytics backend of its own; a GA4 tag is embedded for basic usage stats.

### 6.2 Layout

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

### 6.3 Components & behaviour

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

### 6.4 Data fetching & runtime states

- Fetch data on load; **re-fetch every ~15 min and on tab
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

## 7. Canteen notification job

Built in `bps-volunteer-backend2` (`Notify.js`, `sendCanteenSummary`).

- **When:** optional daily trigger (`setupNotifyTrigger`, ~9pm Sydney); can
  also be run manually.
- **Content:** upcoming canteen sign-ups — **names, phone, email per shift**
  (this job calls the SignUpGenius key API directly; names never enter the
  public `data.json`).
- **Window:** configurable via `NOTIFY_DAYS_AHEAD` Script Property (default 7
  days ahead).
- **Scope:** canteen only. No one-off events.
- **Channel:** email via Apps Script's `MailApp` — free under the Workspace, no
  SMTP/app-password setup.
- **Recipients:** `NOTIFY_EMAILS` Script Property, comma-separated list.

---

## 8. Milestones

1. **M0 — this doc agreed.**
2. **M1 — schema + fixtures.** ✅ `data.json` v1 shape frozen.
   - `schema/data.schema.json` — JSON Schema (mirror; `bps-volunteer-backend2`
     owns the canonical).
   - `src/data.ts` — TS types + `statusFromPct` + `STATUS_META`.
   - `public/fixtures/*.json` — sample, empty-events, between-terms, stale
     (all validate; see `public/fixtures/README.md`).
3. **M2 — UI against fixtures.** ✅ Full SPA built and styled against the
   fixtures: header + crest, canteen row (scroll-snap, desktop arrows, closed
   tiles, deep links), events grid, skeleton loading, stale banner, error +
   localStorage fallback, empty/between-terms states. Deployed via Firebase
   Hosting.
4. **M3 — backend, canteen.** ✅ `bps-volunteer-backend2` resolves the real
   canteen sign-up automatically, computes per-day/per-shift status against
   live SignUpGenius data hourly, served via its web app. Deep-link anchor
   confirmed working against a real browser click-through.
5. **M4 — backend, events.** ✅ Non-canteen active sign-ups are fetched, summed
   into `capacity`/`filled`/`status`, and included in the served data; UI
   events grid renders them.
6. **M5 — hardening.** ✅ Failure modes (never overwrite good data), stale
   banner, localStorage cache, accessibility pass in place. Canteen-manager
   runbook still to write.
7. **M6 — notification job.** ✅ Built — see [§7](#7-canteen-notification-job).

---

## 9. Open questions / to verify

- [x] **Deep-link source.** Confirmed: the per-date `slotid` comes from the
      **public sign-up sheet data endpoint**
      (`SUGboxAPI.cfm?go=s.getSignupInfo`, POST, keyless), not the key API.
- [ ] **Event data in one call.** Confirm `/signups/report/all/{signupid}/`
      returns enough to compute total vs filled capacity and to read the event
      description + thumbnail, or whether extra calls
      (`/signups/created/active/`, `available`/`filled`) are needed.
- [x] **`filled` = quantity taken, not participant count.** SignUpGenius slots
      can have qty-per-signup (Working Bee: 3 people signed up for 6 spots).
      Sum `qtytaken` / `myqty`, not `participantcount`.
- [ ] **Not every slot is a "volunteer needed" slot.** Working Bee has
      "BBQ eaters ×200", "Useful tools to bring ×20" — a naive
      `filled / Σqty` gives 7/327 = 2% and screams "desperate" when it isn't.
      Options: (a) config listing which slot labels/itemids count toward
      the indicator per event; (b) ignore slots with qty above a threshold
      (e.g. >30); (c) manager convention (real volunteer slots only). **v1
      ships the naive number** (per your call to keep it simple), but the
      dashboard indicator for events like this will be misleading until we
      pick one.
- [ ] **Event description + image source.** For real sign-ups so far,
      `header.description` is an empty trusted-value and `beforemessage` is
      blank — only a SignUpGenius theme banner (`og:image`) is available. Need
      to confirm where a real description/thumbnail would come from in the
      API, or decide the backend carries a small hand-maintained
      `events.overrides.json` (title → description/image).
- [x] **Thu/Fri & event-day capacity** flows entirely from SignUpGenius. The
      canteen manager sets Thu/Fri quantities, and bumps slot quantities for
      special "canteen event" days that need extra help. Backend never
      hard-codes capacity.
- [ ] **Failed-event threshold email.** DESIGN.md previously specced emailing
      an admin after 3+ failed events in a run; not wired yet. `MailApp` is now
      proven working (§7), so this is cheap to add if wanted.
- [ ] **Footer content** — exact links and contact address.
- [ ] **Status thresholds** — validate 25 / 75 against a real term once live;
      decide whether an empty shift/role forces `red`.
- [ ] **Term boundaries / holidays** — behaviour between terms (no published
      slots): dashboard shows an empty canteen row with a "next term not open
      yet" message?

---

## 10. Decisions log

- SPA reads a single public JSON payload; SignUpGenius stays system of record.
- Two repos: `bps-volunteer-ui`, `bps-volunteer-backend2`.
- Backend runs hourly; never overwrites good data with a failed run.
- Data is **counts only, no names**. Names live only in the canteen
  notification email.
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
- Stack: React + Vite + TypeScript + hand-written CSS. Firebase Hosting.
  Friendly/rounded, crest-blue. Status needs icon + label, not colour alone.
- SPA re-fetches every ~15 min + on focus; skeleton loading; localStorage
  fallback; 3h stale banner.
- Canteen sign-up resolved automatically (title-prefix match) every run — no
  manual sign-up ID anywhere.
- Notification email: built via Apps Script `MailApp` — free, no
  SMTP/app-password. Recipients configurable list; canteen only; names
  included.
- Capacity (incl. Thu/Fri and special canteen-event days) always flows from
  SignUpGenius slot quantities; backend never hard-codes it.
- Empty `events` → UI shows a placeholder message, not an empty grid.
