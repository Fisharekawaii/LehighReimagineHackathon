# Verification — first skeleton

## Automated checks

`npm test`: six passing domain/API tests covering:

- Create/join, persistence across reads, exact-cent equal splits, pending/confirmed contributions and organizer-only review.
- Planning-only rejection of contributions, and member booking confirmation.
- Invalid dates, negative/missing prices, unsafe URLs, dates outside the trip, unauthenticated access, unsupported assistant requests and preview-before-apply.
- Concurrent saves retry without losing items.
- Over-contributions produce a credit and never negative remaining balances.
- Logout only ends the current session.

`npm run build`: React/Vite production build passes.
Private review adapter: Vinext build and local D1 migration pass.

## Browser checks

Desktop browser: demo profile selection, creation of a Nantucket test trip through UI, two-night lodging at $600/night, date/time/location entry, booking confirmation, invite-code join as a different demo profile, $600 equal shares across two members, contribution submission pending review, absence of organizer controls for a member, organizer receipt confirmation to $300, and persistent trips after profile switching.

Tests use local preview data only; the deployed store is not prefilled from this test.

## Limits

No live external provider, real authentication, payment processing, real card, or real-time collaboration has been validated or claimed. The mobile home, navigation drawer, and budget screen were visually checked at a 390px iframe viewport; content stays within the viewport and the category strip scrolls horizontally. This is not testing on physical iPhone hardware. Test your chosen providers and target devices as they are connected.
