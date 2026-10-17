import { IntegrationNotConfiguredError } from "./contracts.js";
// TODO(MAPS-01): Geocode item locations and return coordinates/route geometry.
// Input stops: [{itemId,location,order}]. Preserve user-chosen order by default.
export async function planRoute({ stops, travelMode = "driving" }) {
  throw new IntegrationNotConfiguredError("Maps");
}
