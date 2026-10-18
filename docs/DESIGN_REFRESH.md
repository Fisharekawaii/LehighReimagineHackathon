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
