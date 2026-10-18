> Current functionality, audit and demo checklist: [Final audit](docs/FINAL_AUDIT.md). Earlier iteration docs preserve history.

# DayTripper

A collaborative trip planner for the Lehigh Reimagine Hackathon. React + Vite frontend, Node + Express API, persistent shared trips. **Working name; not final branding.**

## Run locally

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (normally http://localhost:5173). The API runs on port 3001. Create an account with a username and password. Optional local demo profiles require `ENABLE_DEMO_LOGIN=true`; never enable them on a shared production server.

For the built application:

```sh
npm run build
npm start
```

Open http://localhost:3001. Trips persist in `.data/daytripper.json`, which is intentionally excluded from Git. `DATA_DIR` overrides the storage directory; `PORT` changes the backend port. This file adapter runs in **one Node process**; do not run multiple replicas against it.

```sh
npm test
```

## Start here as a teammate

- [Team handoff and branch work](docs/TEAM_HANDOFF.md): feature ownership boundaries, named TODOs, acceptance criteria.
- [Current specification](docs/SPEC.md): confirmed scope and first-build defaults.
- [Architecture and API](docs/ARCHITECTURE.md): data contracts, permissions, persistence, extension points.
- [Verification](docs/VERIFICATION.md): checks performed and remaining limits.
- [Google workbook](https://docs.google.com/document/d/11jiaQmPT-vbxJlEOFowrtZcfi-vWVdbjJDdpAc6qb9U): planning history and product source of truth.

## What works

Real username/password accounts; create and join trips by link/code; viewer/editor permissions; categorized budget CRUD; exact-cent equal splits; booking confirmations; editable booking-link drafts; calendar .ics import/export; saved map pins, animated selection, dotted itinerary legs and rough travel estimates; sourced nearby Discovery drafts; external contributions with method/purpose and organizer receipt review; seven visual trip themes and responsive layouts.

Discovery uses Wikipedia's nearby-place API and Photon for address lookup without API keys. It focuses on outdoor places, culture and landmarks. Budget preferences affect distance ranking, not verified ticket prices. Dates affect seasonal suggestions and draft scheduling; opening hours and availability must be checked separately. Provider outages show retry/manual-entry states.

## Still planned / limits

- Model-backed natural-language assistant (current parser is explicitly demo-only).
- Google OAuth and account recovery.
- Shared calendar availability and automatic account sync; recurrence and per-event end times.
- Verified booking inventory, live prices, restaurant/event recommendations and routed multimodal travel.
- Real payment processing or card issuance: all contributions record transfers made elsewhere; the card is only a visualization.

The Node JSON adapter is for a single process. The hosted D1 adapter persists shared data with optimistic updates; UI refreshes every five seconds. Sites hosting access and in-app membership are separate gates.

## Optional private review deployment

A separate Sites adapter hosts the same React UI and API on a Worker with D1 persistence; it does not replace the Node/Express team setup. `hosting/` records the adapter source and synchronization steps. Local Node data, local preview data, and hosted data are separate. The hosted preview starts empty; the UI does not require a fixed Nantucket scenario.

## Export an itinerary to a calendar

Open **Itinerary & map**, select the **destination time zone**, choose the duration for timed events, then click **Download itinerary (.ics)**. Open/import the file in your calendar app. Only items with a date are included; items with no time become all-day events. The time-zone selector starts with the device zone, so check it when planning a trip elsewhere.

This is a one-time snapshot, not account sync. Later changes require another export; some calendar apps may duplicate events on repeated imports. No calendar account or API key is needed.
