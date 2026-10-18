# Release audit — October 18, 2026

This supersedes earlier audit counts and roadmap notes. DayTripper is a functional hackathon prototype, with the limits below stated explicitly.

## Verification

- `npm test`: 27 passing, zero failures. Covers separate authenticated sessions, membership and viewer/editor permissions, organizer receipt confirmation, equal shares and cent rounding, concurrency, deletion, booking metadata/fallbacks, discovery ranking, and ICS import/export.
- `npm run build`: production frontend build passes.
- Browser smoke audit: getaway list, trip creation, overview/theme controls, plan and confirmed items, itinerary/map/calendar controls, discovery failure handling, contributions and planning-only group totals.
- Desktop and 390px mobile layout reviewed. Mobile navigation and planning total margins are usable. The animation system, card tilt and theme gallery are retained; reduced-motion styles remain present.
- Browser checks used isolated preview data. Automated separate-session tests are not a claim that two physical devices were tested against production.

## Current agreed behavior

One organizer; account-based link/code joining; viewer/editor permissions; viewers may record external contributions in pooled mode. Organizer confirms receipt. Contributions include method, purpose and an optional note. No money is moved by the app.

Equal splits are the default. Planning-only groups show the total budget, crew size, individual estimated shares and their sum; they have no pooled-payment/card flow. Mode is selected at creation and is fixed in this prototype.

Seven selectable vacation themes affect imagery, atmosphere and sidebar colors. The simulated card stays centered and card-shaped, with tilt and no white cursor glow. Category-specific link examples include stays, transport, food and experiences. Previewed links and discovered places open editable drafts. Confirmed plan items lose their estimated badge.

Itinerary maps support address search, saved pins, highlighted selection, animated transitions, dotted connecting legs, directions links, keyboard navigation and approximate travel times. Routes and travel times are estimates, not real routing or transport schedules.

Calendar support is manual ICS import/export only. Import reviews events/places before saving and does not create costs. Recurring/out-of-range events are skipped with feedback. Automatic account syncing is intentionally excluded. Removed the obsolete unused OAuth availability stub from the calendar adapter.

## Integration limits / remaining work

- AI-01: assistant remains a clearly labeled demo command parser; no model provider is connected. General natural-language trip editing is future work.
- Payment card is visual only; there is no payment processor or spendable balance.
- Discovery uses public geographic information and heuristic vibe/date/budget ranking, not bookable inventory, verified hours or ticket prices. Live geocoding failed gracefully in this preview, so successful end-to-end external discovery is not certified by this audit. Test it in the presentation environment and retain manual address/draft entry.
- Booking metadata is best effort. Provider restrictions can still require manual draft completion; no bypass of provider protections is implemented.
- Password accounts work; Google OAuth, password recovery and production-scale authentication/storage hardening remain future work.
- CAL-03: saved shared timezone and per-item end times remain optional extensions. Export currently asks for timezone and duration.
- Production logs contained old hashed asset 404s around an earlier deployment. Those filenames differ from the current build, consistent with stale pages; the cause is not conclusively established. Refresh the app before presenting. Observed unauthenticated `/api/me` 401 responses are expected.

## Hackathon slide alignment

Source: team-provided “Welcome to Lehigh Valley Hackathon” slides, 18 pages.

| Slide criterion | Evidence / final preparation |
| --- | --- |
| Innovation and creativity — 25% | Reimagines fragmented group-trip planning as shared plans, equal estimates and transparent contribution receipts. Explain the difference between planning and pooled tracking. |
| Completeness and functionality — 25% | Working prototype and 27 passing regression tests. Demonstrate the real flows; label simulation and provider limitations honestly. |
| Impact and relevance — 20% | Explain reduced coordination effort and clearer shared costs for friend groups. No measured impact is claimed. |
| Visual design and UX — 15% | Vacation themes, responsive layouts, animated gallery/map/card, readable contribution and planning states. |
| Presentation and demo — 15% | Prepare the required three-minute video and rehearse the flow below. |

Open Reimagination is a plausible track; the team must select its submission track. The supplied slides do not establish additional mandatory AI/vendor requirements.

Submission still needs team verification: public GitHub repository submitted in Devpost, project name and description, correct team list, problem/solution, technologies, and three-minute video. Confirm judges can access the hosted app; repository visibility does not determine app access. Slides say hacking ends Sunday October 18 at noon, with judging 12–2:30 PM; use the event's local schedule.

## Three-minute demo outline

- 0:00–0:25: problem and who it helps.
- 0:25–0:55: open a trip, change theme, show invite permissions.
- 0:55–1:30: editable plan draft, confirmation, equal budget split.
- 1:30–2:05: itinerary, pins/directions, manual ICS workflow. Use saved locations if providers are unavailable.
- 2:05–2:35: contribution method/purpose and organizer receipt; contrast planning-only totals.
- 2:35–3:00: explain impact and honest future work (AI/provider integrations).

## Opening the project

Open the GitHub repository and select `feat/daytripper-first-build` in the branch dropdown. This is the current working branch; it has not been merged into main by this audit.

Use the team's hosted app link to run the complete app. GitHub Pages serves static files and cannot by itself run this project's authenticated API and shared database. Do not publish the existing frontend alone and expect shared profiles to work. A Pages deployment would require a separately hosted backend and corresponding configuration.
