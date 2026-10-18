# Public app and GitHub Pages entry

The selected deployment is the existing full hosted app, with a GitHub Pages entry page linking to it. The Pages page does not run a second copy of the app or store user data.

Full app: https://daytripper-weekends.dcano1697.chatgpt.site

The hosted site is publicly reachable. Visitors still sign in or create an account; trip membership and viewer/editor/organizer permissions still control access to plans. Demo profile sign-in remains disabled. The existing API and persistent D1 storage remain together on the hosted origin, preserving HttpOnly session cookies and normal calendar downloads.

`pages/index.html` is the static entry page. `.github/workflows/pages.yml` publishes it on pushes to `feat/daytripper-first-build`, copying the existing coastal image and favicon. GitHub Pages uses GitHub Actions as its source. The github-pages environment must permit this deployment branch.

A separate Pages frontend/backend experiment was set aside after the user's choice of this simpler option. No cross-origin session-token flow is deployed. Future full-app updates still require a hosted deployment; entry-page updates publish through Actions.
