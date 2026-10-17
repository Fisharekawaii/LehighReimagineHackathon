import { IntegrationNotConfiguredError } from "./contracts.js";
// TODO(CAL-01): Export itinerary to .ics first, preserving explicit trip timezone.
// TODO(CAL-02): OAuth + availability import after export. No two-way sync promised.
export async function exportItinerary({ trip, timezone }) {
  throw new IntegrationNotConfiguredError("Calendar export");
}
export async function importAvailability({ provider, start, end, userId }) {
  throw new IntegrationNotConfiguredError("Availability import");
}
