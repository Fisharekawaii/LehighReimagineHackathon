# Resort design refresh — October 18, 2026

Removed decorative eyebrow headings, repeated slogans, sidebar promotion, and home marketing blocks. Functional section labels replace vague titles across planning, discovery, calendars, invitations, and assistant.

Shawnee-inspired direction: evergreen sidebar, warm cream surfaces, larger scenic trip photography, serif display titles, flatter category rows, restrained borders. Existing trip theme colors and centered card proportions are retained. Page entry, navigation, card-image hover and button transitions respect reduced-motion preferences. Navigation remounts only when trip/section changes, not on polling.

Validation: production build and all 25 existing tests pass; desktop overview, budget navigation and 390px home layout reviewed. No new backend features or Coming Soon implementations. Existing integration limitations above remain.

Team guidance: use clear functional labels; avoid decorative slogans above section titles. Shared refresh rules are at the end of src/styles.css.

## Theme controls and motion follow-up
Trip Overview now includes the seven-theme 3D postcard picker, available after creation. Click a card, swipe, or use left/right arrows. Selection saves through the existing theme endpoint; controls show saving state, prevent overlapping writes, and remain read-only for viewers. Swipe clicks are suppressed to avoid selecting a second theme accidentally. Theme changes tint the workspace, hero imagery, sidebar and selected navigation. Color and carousel transitions honor reduced motion. Group & pool is now labeled Contributions; planning-only trips retain Your group because they do not collect contributions.

Category-aware links: Transport suggests Uber/Lyft/Amtrak/Expedia; Food & drinks suggests Uber Eats/DoorDash/OpenTable; Experiences suggests Viator/GetYourGuide/Eventbrite; Stays retains accommodation providers. Labels and example titles change when category changes. Drafts retain the chosen category. Supported provider hosts use best-effort metadata; other HTTPS links are retained for manual entry without any server fetch. This is not a live fare, delivery quote, reservation, or ordering integration.

## Motion polish
Added staggered getaway/category/discovery entrances, scenic hero reveals, modal and backdrop entrances, toast arrival, progress-bar easing, and hover reactions for action icons, category icons, traveler avatars, the selected theme postcard, and assistant button. Decorative motion runs once or responds to interaction; no perpetual loops. All additions are gated by prefers-reduced-motion: no-preference. Existing map and theme transitions remain intact. CSS-only enhancement; no new dependencies or data changes.

## Expressive motion follow-up
Added bounded mouse-following 3D tilt to getaway and contribution cards, a moving light reflection, a single shimmer on getaway hover, a brief scenic zoom/crossfade when a theme changes, and a small particle burst on successful notification. Plus tiles, discovery filters and navigation icons get additional hover feedback. Pointer feedback skips touch and reduced-motion users; decorative layers ignore input. No autoplay loops or changes to financial functionality. Production build passes.

## Tactile cards, without spotlight
Removed the credit-card cursor-following white reflection at user request; retained its bounded tilt and softened the return easing. Added mouse-following tilt to budget category and discovery cards. Touch and reduced-motion behavior remains steady. Decorative entrance animations release their transform after completing so pointer feedback can take over.

## Booking preview recovery
Fixed false "blocked preview" reporting when a page has no title. Metadata extraction now preserves apostrophes, supports Twitter title/description and standard description metadata, and uses valid structured titles when a generic loading title is present. Partial address/price/description data survives missing titles; explicit valid URL dates survive unavailable previews. Null prices no longer become zero. Responses distinguish restricted vs unavailable previews and the draft offers an original-link shortcut for manual completion. Genuine provider access restrictions remain; no bypass or authenticated scraping. 27 tests pass, including targeted metadata/fallback cases. Exact failing user URL was not supplied, so provider-specific recovery is not claimed.

## Calendar scope confirmed
Calendars remain manual ICS import/export only. Removed the Still planned availability-matching/automatic-sync notice and stale CAL-02 TODO from CalendarPanel. Account linking and automatic synchronization are not planned scope. Existing event import/export behavior remains unchanged; no claim of group free/busy matching is made.

## Planning-only group budget
Replaced the planning-only group illustration with a real budget summary: total estimated plan cost, crew count, equal per-person estimate, and a total of all crew shares. Uses existing server integer-cent shares so remainder cents reconcile exactly; uneven splits show the one-cent range and an explanation. Each member retains their individual share. Updates follow existing shared trip refresh on edits/joins. Planning-mode viewers no longer say can contribute. Applies only to planning-only mode; no payment recording or card-mode behavior changes.

Planning-only total row spacing: inset the total 20px to align with crew rows, restore 20px vertical padding, and allow the label/value to wrap cleanly on narrow screens.
