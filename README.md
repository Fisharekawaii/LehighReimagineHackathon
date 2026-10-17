# DayTripper

A collaborative trip-planning skeleton for the Lehigh Reimagine Hackathon. React + Vite frontend, Node + Express API, persistent demo trips. **Working name; not final branding.**

## Run locally

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (normally http://localhost:5173). The API runs on port 3001. Choose a demo profile; no credentials are needed.

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

Demo profiles; create and join trips by link/code; saved trips; categorized budget CRUD; exact-cent equal splits; booking/task confirmations; dated itinerary; external contributions submitted by members and confirmed/rejected by the organizer; simulated shared card; responsive layout.

## What is a shell

Real authentication; AI provider; live nearby recommendations and prices; maps/routes; calendar export/import; booking APIs. The assistant has a clearly labeled deterministic demo command parser with preview/apply. Booking and discovery links open external websites; they do not import prices or make bookings.

**No real cards or money movement.** Demo identities are shared by everyone who can access the app. Use sample data, not private information. The organizer permission is enforced by the API for the selected profile, but choosing demo profiles is intentionally not secure identity verification.

## Optional private review deployment

A separate Sites adapter hosts the same React UI and API on a Worker with D1 persistence; it does not replace the Node/Express team setup. `hosting/` records the adapter source and synchronization steps. Local Node data, local preview data, and hosted data are separate. The hosted preview starts empty; the UI does not require a fixed Nantucket scenario.
