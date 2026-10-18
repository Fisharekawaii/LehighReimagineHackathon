> Current implementation and remaining work: [Release audit](RELEASE_AUDIT.md). This document retains earlier detail/history.

> Current update: see [Vacation planning iteration](ITERATION_02.md) for accounts, permissions, imports, maps and seven vacation vibes. Earlier first-build entries below are historical where superseded.

# Team handoff

This is a functional skeleton, not a promise that all integrations are connected. Branch from `feat/daytripper-first-build` until the team merges that foundation into its shared base branch. Do not merge or rewrite other teammates' changes without coordination.

## Suggested independent workstreams

No individuals have been assigned. Claim a workstream in the workbook before starting.

| Branch suggestion       | Primary files                                                                                     | Scope and completion test                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feat/ai-copilot`       | `src/features/assistant/`, `server/integrations/assistant.js`                                     | AI-01: real provider yields validated add/edit proposals; never moves money or confirms payments. AI-02: persist immutable proposal IDs so apply executes precisely the reviewed proposal. Add trip-edit proposals after agreeing fields. |
| `feat/discovery-prices` | `src/features/explore/`, `server/integrations/discovery.js`, `booking.js`                         | EXPLORE-01 / PRICES-01 / BOOK-01: nearby results with source URL, nullable price, currency and checked-at date; add-to-plan remains explicit. Avoid fabricated prices.                                                                    |
| `feat/maps-calendar`    | `src/features/itinerary/`, `src/features/calendar/`, `server/integrations/maps.js`, `calendar.js` | MAPS-01: map saved locations; CAL-01: completed .ics export; CAL-02: completed manual .ics import; CAL-03: shared saved destination zone and item end times. Keep provider failures recoverable.                                                   |
| `feat/auth-data`        | `server/api.js`, `server/logic.js`, `server/index.js`, storage adapters                           | AUTH-01 / DATA-01 / SYNC-01: real users, normalized storage and live updates while preserving existing trip contracts and organizer checks. Coordinate central API edits.                                                                 |
| `feat/design-polish`    | `src/styles.css`, `src/components/`, `src/config/assets.js`, `public/images/`                     | DESIGN-01: destination assets, accessibility/contrast, mobile sizing. Keep functional states and integration labels accurate.                                                                                                             |
| `feat/budget-pool`      | `src/features/budget/`, `src/features/pool/`, pure totals in `server/logic.js`                    | Improve budget/receipt UX without changing split rules or allowing members to confirm their own payment receipt through a new endpoint.                                                                                                   |

## Safe extension rules

1. Read `docs/SPEC.md` and `docs/ARCHITECTURE.md`; check the Google workbook for newer decisions.
2. Create your own feature branch. Keep changes in your feature directory and provider adapter where possible.
3. Treat `src/App.jsx`, `server/api.js`, `server/logic.js`, and shared CSS tokens as coordinated integration points. Agree edits to avoid conflicts.
4. Keep secrets server-side in environment variables. Never put provider keys in `src/`, public assets, Git, or logs.
5. Use integer cents for stored amounts. A missing provider price is `null`, never a fabricated zero.
6. Keep demo, estimated, quoted, booking-confirmed, and payment-confirmed states distinct.
7. Use server validation even when the UI validates. Keep trip membership and organizer checks on every new endpoint.
8. Mark incomplete work with the named TODO IDs above; update the status table and workbook with what actually works.
9. Run `npm test` and `npm run build`; test your interaction on desktop and a narrow viewport.
10. Open a reviewable PR against the team's chosen base. Do not force-push a shared branch.

## Quick integration contracts

- Every existing mutation returns the authoritative trip view. Call the feature's `onUpdate(trip)`/`onSaved(trip)` callback.
- Dialogs receive `onClose`; the App owns which dialog is open.
- Shared HTTP client: `api(path, method, body)` in `src/lib/api.js`, with `/api` automatically prefixed.
- User-facing errors come from JSON `{error}`; never silently show a failed save as successful.
- Provider shells deliberately throw `IntegrationNotConfiguredError`. They are not live routes and should not be represented as connected in the UI.
- Images are centralized in `src/config/assets.js`; current coastal photo is decorative and does not claim to depict Nantucket.

## First team checkpoint

Pick owners, confirm the branch to merge into, choose the first live integration and provider, and agree whether the review deployment should become accessible to the whole team. The current review deployment is private by default.

## Calendar handoff update

CAL-01 is complete. Reuse `exportItinerary` in `server/integrations/calendar.js` and the authenticated `/calendar/export` API. Do not replace it with provider-specific calendar account access to implement basic download. Manual .ics import is complete in calendar-import.js. Account linking and automatic availability sync are explicitly out of scope. Optional future work: CAL-03 saved trip timezone and item end times. Keep the explicit export assumptions visible until the data model supports those fields. Calendar tests are in `server/calendar.test.js` and the member-access integration case in `server/api.test.js`.
