> Current implementation and remaining work: [Final audit](FINAL_AUDIT.md). This document retains earlier detail/history.

# Vacation planning iteration — October 17, 2026

This is the current implementation handoff, superseding first-build statements where they conflict. Source branch: feat/daytripper-first-build. The iteration builds on the published calendar export.

## Implemented behavior

- Real username/password registration and sign-in, case-insensitive unique usernames, salted PBKDF2-SHA256 password hashes, HTTP-only same-site sessions, logout and failed-login throttling. Google OAuth is deferred until project credentials are supplied. Demo endpoints are disabled by default; local Node QA can opt in with ENABLE_DEMO_LOGIN=true.
- One organizer per trip. New invites default to viewer; organizer can create editor invite codes/links and change member roles. Viewers can read, export calendars and record external contributions. Editors can change items, import plans, place map pins and change vibes. Only organizer can confirm/reject receipts. Server enforces permissions, including assistant apply.
- Shared server persistence and five-second polling while visible, plus focus/manual refresh. Same account works on different devices. Local JSON store is single-process; hosted adapter uses D1 optimistic updates. This is polling, not live cursors or collaborative text editing.
- Contribution activity stores payment method (via), free-text purpose (for), optional note, author, amount and review status. Legacy notes remain. No real money is transferred.
- Booking URL importer for HTTPS Airbnb.com, Expedia.com, Booking.com, Vrbo.com and Hotels.com domains. Draft only: review title, description, address, explicit USD price and supported URL check-in date. Allowlisted redirects, bounded response size and timeout. Blocked pages become a manual draft with the original URL. No promise of live availability, taxes or a complete total; no booking execution.
- .ics upload, preview, event selection and import as zero-cost itinerary-only stops. Stores title, date/time, place, notes, safe URL and GEO coordinates when present. Repeated UID/date/time imports are deduplicated. All-day and floating events retained; UTC/IANA/embedded zones converted to chosen destination zone. Events outside trip dates, cancelled events and recurring series are skipped with notices. 300 KB / 300 event limits. Imported stops can be removed; adding budget costs later remains a separate budget item.
- Interactive Leaflet map with OpenStreetMap tiles and attribution. Pins are explicitly placed using search results or manual coordinates; imported GEO points are automatic. Selected numbered pin is highlighted and centered, with stop/travel info below. Left/right keys work when map area has focus, and previous/next buttons support touch. Directions links open Google Maps.
- Photon public demo geocoder for explicit user search, cached and throttled per runtime. Public services may be unavailable; manual coordinates remain usable. Provision a supported provider before scale.
- Travel modes: car, walk, airplane, ferry. Estimates use straight-line distance with mode speed/buffer assumptions, never live routing/traffic/schedules. Each leg can have a manual minutes override. Mixed travel is represented as consecutive stops with individual modes; no automatic multimodal journey finding.
- Seven vibes: Coastal, Forest & Cabin, Mountain, City, Lakeside, Desert, Countryside. Each has local decorative scenery, caption and accent palette. Existing trips can change vibe. Original 3D postcard selector inspired by the Framer Helix reference supports clicks/swipes and reduced motion. No purchased component code is included.
- Simulated card constrained to 1.586 aspect ratio, max 400px. Vacation styling uses warm paper, scenic photos, restrained serif hero typography and green/sand accents inspired by Shawnee Inn.

## Important deployment and migration notes

The existing hosted review is owner-private; app invite links do not override that hosting gate. A second person needs hosting access, or the team must deploy to an appropriately shared host. Do not change audience implicitly. New real accounts do not claim old shared demo identities; historical demo data remains stored but is not exposed to new accounts. Legacy real trip memberships without roles retain editor behavior; all new joins default to viewer.

No password reset, email verification, Google OAuth, real card processing, live AI provider, automatic booking or calendar account sync has been added. Other Coming Soon sections remain unchanged. Keep these as explicit follow-up work.

## Branch-friendly ownership

| Area | Main files | Follow-up |
| --- | --- | --- |
| Accounts | server/auth.js; src/features/auth | AUTH-02 Google OAuth; AUTH-03 account recovery and production hardening |
| Shared access | server/api.js; hosting/route.ts | SYNC-02 subscriptions and edit-conflict UI; DATA-01 normalized persistent storage |
| Link drafts | server/integrations/booking.js; ItemForm | BOOK-02 provider APIs, imagery and fuller date/price semantics |
| Calendar | calendar-import.js; CalendarImport.jsx | CAL-04 recurrence, end-time preservation and editing imported stops |
| Map | src/features/maps; integrations/maps.js | MAPS-02 provisioned geocoding and routed multimodal travel |
| Design | config/assets.js; VibeGallery.jsx; styles.css | destination-specific art and further responsive polish |

Coordinate edits to server/api.js, App.jsx and shared CSS before merging feature branches.

## Verification log

17 automated tests pass, covering real-account sessions, member isolation, viewer/editor permissions, organizer receipt review, concurrent item saves, calendar export/time zones, calendar import deduplication and zero budget effect, booking metadata/fallback and travel estimates. Production Vite build passed. Browser and hosted build results are recorded below when complete.

References: https://www.shawneeinn.com/ ; https://www.framer.com/marketplace/components/helix-gallery-3d/ ; https://leafletjs.com/reference.html ; https://github.com/komoot/photon ; https://operations.osmfoundation.org/policies/tiles/ ; https://github.com/kewisch/ical.js/

Browser QA: created a forest-theme trip, cycled the 3D picker, added scheduled items, saved a map pin and used ArrowRight to switch the selected stop/info panel. OpenStreetMap tiles rendered. Photon search returned matching real places in the Node adapter; the local hosted preview could not complete its external request, so that environment's geocoding is not end-to-end verified. Real credentials were exercised through API tests; browser UI QA used local-only demo mode. Production adapter keeps demo sign-in disabled.

## Address and visual refinement — October 17, 2026

The map editor now accepts an address/place name only; latitude and longitude fields have been removed. Save the address, then choose a matching geocoder result to place the pin. Address text persists even if lookup is unavailable; retry lookup later. Changing an address clears its previous pin, while saving travel details preserves the address and pin. Coordinates remain internal map data. This supersedes earlier manual-coordinate fallback instructions.

Map framing now uses symmetric projected bounds: the selected stop is centered while the zoom includes all saved pins with padding. Resizing recalculates the framing, and regular trip refreshes no longer reset a manually moved map when pins and selection are unchanged. The simulated credit card is horizontally centered inside its section. Framer's travel template collection inspired restrained serif headings, larger destination images, softer depth and hover motion with reduced-motion support. No template assets or source were copied.

Stop switching now animates the map with a smooth fly/zoom transition and a brief selected-pin emphasis. Rapid switches interrupt the previous camera movement. Resize framing is immediate; reduced-motion settings disable the camera and pin animations.

Theme atmosphere: the workspace background now subtly changes with the chosen vibe using a pale base and soft corner gradients (sea-glass coast, sage forest, blue-gray mountain, lavender city, aqua lake, sand/terracotta desert, olive/cream countryside). The top bar and map header inherit a restrained matching tint. Content panels remain readable.

## Dotted itinerary connections and Airbnb redirect fix — October 17, 2026

The map now draws dotted straight-line connections between consecutive stops with saved pins; the leg into the selected stop is highlighted. Missing-pin stops leave a gap rather than suggesting a complete route. These lines indicate itinerary order, not actual driving paths or ferry/flight availability.

Booking drafts now recognize redirect/interstitial titles and never use a notice such as “Redirecting to www.airbnb.co.uk” as the listing title. Explicit HTML refresh redirects are followed only to supported provider domains with loop/hop limits. Airbnb UK, Canada and Australia domains are supported alongside .com. Unreadable or script-only redirects fall back to manual entry and retain the original URL. Regression coverage checks the reported UK redirect, regional listing, blocked target and title fallback. 19 tests pass; Vite production build passed.
