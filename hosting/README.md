# Optional hosted review adapter

The main app runs with Node/Express. The private review deploy uses the same `src/` and `server/` modules through a Sites Vinext starter, plus the adapter files here. This is a separate runtime, not a second product implementation.

In a Sites-managed starter checkout, copy `src/`, `server/`, and `public/` from the repository. Copy `route.ts` to `app/api/[...path]/route.ts`, `schema.ts` to `db/schema.ts`, `page.tsx` and `layout.tsx` to `app/`. Declare the D1 binding as `DB` in the existing hosting manifest; retain the actual Site project ID. Generate/apply schema migrations using the Sites workflow. Runtime credentials and database contents are never copied into the repo.

Re-copy shared modules after repo changes so the review deploy matches the source. The team can ignore this directory and deploy the main Node server elsewhere. Before exposing the app to real users, replace shared demo accounts and the single-document persistence adapter.
