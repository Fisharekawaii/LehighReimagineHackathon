import { IntegrationNotConfiguredError } from "./contracts.js";
// TODO(BOOK-01): Approved affiliate/API lookup, not scraping or automated purchases.
// Current UI uses outbound links only. Never mark a reservation booked from a click.
export async function lookupStay({ destination, start, end, travelers }) {
  throw new IntegrationNotConfiguredError("Booking lookup");
}
