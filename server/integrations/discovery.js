import { IntegrationNotConfiguredError } from "./contracts.js";
// TODO(EXPLORE-01): Provider search -> normalized Recommendation[]. Add paging/error states.
// TODO(PRICES-01): Include sourceUrl and checkedAt; unavailable prices stay null, never 0.
export async function searchNearby({
  destination,
  category,
  dates,
  travelers,
}) {
  throw new IntegrationNotConfiguredError("Nearby discovery");
}
