> Current implementation and remaining work: [Final audit](FINAL_AUDIT.md). This document retains earlier detail/history.

> Current update: see [Vacation planning iteration](ITERATION_02.md) for accounts, permissions, imports, maps and seven vacation vibes. Earlier first-build entries below are historical where superseded.

# Current spec — first skeleton, October 17, 2026

The Google workbook is authoritative for product history. Diego authorized building at approximately 6:06 PM ET and clarified at approximately 6:08 PM ET that this run is the **main extensible skeleton for teammates to branch from**. Earlier “do not build” instructions in the historical log are superseded by that authorization.

## Confirmed

- Eventual working multi-user app with saved trips; first draft uses demo accounts.
- Accounts can create trips; members join by invite link and code.
- Vacation-focused UI, usable on desktop and iPhone, with replaceable imagery.
- Budget categories: stays/housing, food and refreshments, transport, activities/experiences, other.
- Equal splitting by default. API-driven estimates are a later goal; manual input works now.
- Shared Pool: one organizer receives external payments and confirms receipt; simulated shared card.
- Planning Only: virtual planning sections, with payments entirely on participants' end.
- AI should eventually add/edit trips from natural language; establish the skeleton now.
- Calendar export first, then availability import. Maps, discovery, pricing, booking, AI connections may be empty shells.
- Maintain the supplied GitHub repository. Stack direction: HTML/CSS/JS with React and Node.
- Nantucket weekend is a demo preference, not a mandatory seed, destination, group size or budget.
- Preserve a demo artifact and a separate live demonstration as independent deliverables.

## First-build defaults

These are implementation defaults announced before the build, not newly claimed user decisions:

- Mode chosen on creation; switching is deferred so contribution histories cannot become ambiguous.
- All members may add/edit/delete budget items and confirm bookings/tasks; only the organizer may review payment receipt.
- “Confirmed” on a plan item means booked/completed, not paid. Payment states are separate.
- USD only; quantities are whole units; prices stored as integer cents. Remainder cents are allocated in member join order. Adding members recalculates current shares.
- No selected-person exclusions or unequal splits yet.
- Four shared demo identities; invite code serves as trip join access after choosing a profile.
- A shared card displays confirmed external contributions, not a real wallet/spendable balance.
- Over-contributions show as credit above the member's current share; no automatic refund.
- DayTripper is the working name; coastal green/cream visual direction is provisional.

## Implemented versus deferred

| Area      | Current behavior                                                                                | Later extension                                                              |
| --------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Trips     | Create, list, view, join; persistent state                                                      | Metadata editing, archive/delete, mode transitions                           |
| Budget    | Add/edit/delete, category totals, estimates/quotes, exact-cent equal allocation                 | Live estimates, selected participants, alternative currencies                |
| Planning  | Per-item booking/task confirmation, notes/links/location                                        | Receipts, tasks with owners, audit history                                   |
| Pool      | Submit external contribution; organizer confirms/rejects; per-person outstanding/credit         | Expense settlement and receipts if scope approved                            |
| Itinerary | Item date/time schedule and unscheduled list                                                    | Timezones, travel durations, route optimization                              |
| AI        | Demo syntax parser; review then apply                                                           | LLM with structured tools, immutable proposal IDs, actual trip edits         |
| Maps      | Labeled visual placeholder                                                                      | Provider map and routes                                                      |
| Discovery | Labeled shells and outbound searches                                                            | Normalized recommendations with source/price timestamps                      |
| Calendars | Downloadable .ics for dated itinerary items; explicit destination zone and timed-event duration | Availability import, automatic sync, shared trip zone and per-item end times |
| Booking   | Outbound Booking.com/Airbnb links                                                               | Approved APIs/affiliate data; no purchases in current scope                  |
| Auth      | Shared demo profiles and cookie sessions                                                        | Real authentication and per-person membership                                |
| Data      | Single-process atomic JSON locally; D1 adapter for private review                               | Normalized database, per-trip versions, migration strategy                   |

## Pivotal checkpoints

Ask Diego before enabling real money/card functionality, making the demo public, choosing a paid/provider-specific integration, switching trip modes after contributions exist, or changing equal-share/organizer permissions. Real authentication and custom splitting also need explicit product decisions. Routine implementation choices may proceed within the agreed scope.

## Calendar export completed — October 17, 2026

CAL-01 is implemented as a member-only `.ics` download under Itinerary & map. Export options choose the destination IANA time zone explicitly and a 30/60/90/120-minute duration for timed items (60 default). The initial zone is the device zone, not an inferred destination. Export preferences are not persisted as shared trip settings yet.

Dated items export with title, location (destination fallback), category, booking/task status, notes and reference link. Items without times are one-day all-day events; undated items are omitted. A trip with no scheduled items cannot be exported. No contributions or payment notes enter the file. Timed items are converted to UTC instants to preserve destination times across importing devices. Nonexistent DST times return an error; a repeated hour uses the earlier occurrence. Item IDs yield stable event UIDs, but calendar apps can still duplicate repeated file imports.

CAL-02 (availability import/account connections) and CAL-03 (shared saved destination zone and per-item end times) remain named extension tasks. No auto-sync or calendar account write is implemented. Local completion only for this change; user will branch/push the code.
