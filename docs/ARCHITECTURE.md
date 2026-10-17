# Architecture and contracts

## Runtimes

- **Team development:** React/Vite client → `/api` proxy → Node/Express → atomic local JSON file.
- **Private review deployment:** same React components and runtime-independent API → thin Vinext route adapter → Cloudflare D1.
- `server/api.js` accepts standard `Request`, returns `Response`, and depends only on a storage adapter. `server/index.js` is the Node adapter.
- `src/features/` contains independent UI features. External provider code belongs in `server/integrations/`.
- The hosted adapter is optional; the main repository remains ordinary React/Node. Never couple the core domain to Cloudflare APIs.

## Persistent state

`{trips: Trip[], sessions: Session[]}` is stored with an integer version. The skeleton storage interface is:

```js
await storage.read(); // { state, version }
await storage.write(nextState, expectedVersion); // boolean: false means retry
```

Local JSON saves use a temporary file and atomic rename in one process. Hosted D1 stores one versioned JSON document and uses compare-and-swap updates. The handler retries conflicts up to five times. This is intentionally a small-demo adapter, not a scalable production database. DATA-01 should normalize tables while retaining the API shape, rather than copying state into each browser's localStorage.

No browser-local trip database is used. Local and hosted stores are independent. Session cookies are HttpOnly, SameSite=Lax, path `/`, and Secure on HTTPS. The demo API rejects a conflicting Origin on writes. AUTH-01 must replace demo profile switching before any real/private user data is stored.

## Trip contract

```js
{
 id, title, destination, start, end, // YYYY-MM-DD; end >= start
 mode: 'pool' | 'planning', theme: 'coast' | 'forest' | 'city',
 organizer, // demo user ID for now
 members: ['diego', 'alex'], // stored IDs; API views return public user objects
 code, // random 12-character hex join code
 items: [{id,title,category,priceCents,quantity,priceType:'estimated'|'quoted',
          date,time,location,url,notes,status:'proposed'|'verified'}],
 payments: [{id,userId,amountCents,note,status:'pending'|'confirmed'|'rejected',
             createdAt,reviewedAt,reviewedBy}],
 createdAt
}
```

Views add `totals: {estimatedCents, confirmedCents, pendingCents, perPersonCents, shares}`. Shares contain `{userId, owedCents, paidCents, remainingCents, creditCents}`. Use each person's `owedCents`, not `perPersonCents`, for exact balances. The latter is the rounded-up display estimate only. Category values are `Stays`, `Food & drinks`, `Transport`, `Experiences`, `Other`.

Allocation: integer division plus one extra cent for the first remainder members in join order. Verified contributions count; pending and rejected do not. Booked/completed item status never changes a contribution status. No real expense settlement or spendable card balance is calculated.

## API routes

All trip routes require a demo cookie and membership. Unknown/nonmember trips return 404. Most writes return the updated trip.

| Method     | Path                                 | Input / result                                                                                                     |
| ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| GET        | `/api/demo-users`                    | Public demo profiles                                                                                               |
| POST       | `/api/demo-login`                    | `{userId}` → profile and cookie                                                                                    |
| GET        | `/api/me`                            | Current profile                                                                                                    |
| POST       | `/api/logout`                        | End this session only                                                                                              |
| GET / POST | `/api/trips`                         | List / create `{title,destination,start,end,mode,theme}`                                                           |
| POST       | `/api/join`                          | `{code}` → joined trip, idempotent membership                                                                      |
| GET        | `/api/trips/:id`                     | Trip view                                                                                                          |
| POST       | `/api/trips/:id/items`               | `{title,category,price,quantity,date?,time?,location?,url?,notes?,priceType?}`; price in dollars at input boundary |
| PATCH      | `/api/trips/:id/items/:itemId`       | Full item input or `{status}`; editing details resets booking confirmation                                         |
| DELETE     | `/api/trips/:id/items/:itemId`       | Removes item; UI asks first                                                                                        |
| POST       | `/api/trips/:id/payments`            | Pool only; `{amount,note?}`; selected member is sender                                                             |
| PATCH      | `/api/trips/:id/payments/:paymentId` | Organizer only; `{status:'confirmed'                                                                               | 'rejected'}`; pending only |
| POST       | `/api/trips/:id/assistant`           | `{text}` → `{proposal,provider:'demo-command-parser'}`; no mutation                                                |
| POST       | `/api/trips/:id/assistant/apply`     | `{text}` → deterministic parsed change revalidated and applied                                                     |

No generic trip PATCH or mode change exists in this skeleton. No provider integrations are live APIs yet. Use the provider contract modules as the implementation boundaries.

## Known next steps

- AI-02: The current parser is deterministic and reruns the same text on apply. Before adding an LLM, store the reviewed proposal with an immutable ID and apply exactly that proposal; handle stale item versions.
- AUTH-01: shared demo profile switching is not authentication. Real sign-in, expiry policies, account recovery, invite revocation/rate limits, and private membership are later work.
- DATA-01: normalized persistence, migrations, backups, request idempotency, and per-item conflict handling for production scale.
- SYNC-01: current data refreshes after writes and when the window gains focus; manual refresh exists. There is no real-time subscription.
- CAL-01 is implemented: the export request explicitly supplies the destination time zone. CAL-03 will persist a shared zone and add per-item end times; current exports use a visible duration assumption.

## Calendar export API

`POST /api/trips/:id/calendar/export` with `{timezone: "America/New_York", durationMinutes: 60}`. Requires membership; returns `text/calendar; charset=utf-8` with an attachment filename, no-store caching and nosniff. Allowed durations: 30, 60, 90, 120 minutes. Errors retain the normal `{error}` JSON shape. Export reads the authoritative trip without mutating it.

`server/integrations/calendar.js` generates RFC 5545 content using CRLF, UTF-8-aware 75-octet folding, escaped TEXT, stable per-item UIDs, UTC timed events and exclusive next-day all-day ends. It uses built-in Intl APIs and has no provider dependency. Destination local times are resolved against the requested IANA zone; spring-forward gaps are rejected and fall-back overlaps use the earlier instant. UI download code lives in `src/features/calendar/CalendarPanel.jsx`.

The exported calendar is a snapshot. It does not connect to calendar accounts, send invitations, subscribe to updates, or change availability. Booking/task confirmation maps to tentative/confirmed event status independently of contribution state. Never include the pool ledger or private payment notes in exports.
