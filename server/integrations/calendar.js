import { fail, validDate } from "../logic.js";

// RFC 5545 TEXT escaping and UTF-8-aware folding. Keep this runtime-independent
// so both the Node server and the optional hosted adapter use identical exports.
export function escapeCalendarText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

export function foldCalendarLine(line) {
  const encoder = new TextEncoder();
  const lines = [];
  let current = "",
    bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      lines.push(current);
      current = " ";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  lines.push(current);
  return lines.join("\r\n");
}

const stamp = (date) =>
  date.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
const calendarDate = (date) => date.replaceAll("-", "");
function nextDate(date) {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + 1);
  return calendarDate(value.toISOString().slice(0, 10));
}
function zoneFormatter(timezone) {
  if (typeof timezone !== "string" || timezone.length > 100 || !timezone.trim())
    fail("Choose the time zone where this trip takes place.");
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    fail("Choose a valid IANA time zone, such as America/New_York.");
  }
}
function wallClockAsUtc(formatter, instant) {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(instant))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  );
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

/** Convert an explicit destination wall-clock time to an instant, independently
 * of the server/device zone. On fall-back overlap use the earlier occurrence;
 * reject spring-forward gaps rather than quietly moving an itinerary item.
 */
export function itineraryInstant(date, time, timezone) {
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    fail(
      "A scheduled item has an invalid date or time. Edit it before exporting.",
    );
  const formatter = zoneFormatter(timezone);
  const target = Date.parse(`${date}T${time}:00Z`);
  const hour = 3600000;
  const offsets = new Set(
    [-36, -12, 0, 12, 36].map((n) => {
      const sample = target + n * hour;
      return wallClockAsUtc(formatter, sample) - sample;
    }),
  );
  const matches = [...offsets]
    .map((offset) => target - offset)
    .filter((instant) => wallClockAsUtc(formatter, instant) === target);
  if (!matches.length)
    fail(
      `${date} at ${time} does not exist in ${timezone} because the clocks change. Edit that item's time before exporting.`,
    );
  return new Date(Math.min(...matches));
}

/** CAL-01 implemented: one downloadable, standards-based calendar snapshot.
 * No calendar account connection or write is performed. Undated items are omitted.
 * Duration is an explicit export assumption because items have no end-time field.
 * TODO(CAL-03): Add per-item end times and persist a shared destination time zone.
 */
export async function exportItinerary({
  trip,
  timezone,
  durationMinutes = 60,
  now = new Date(),
}) {
  const formatter = zoneFormatter(timezone);
  const zone = formatter.resolvedOptions().timeZone;
  if (![30, 60, 90, 120].includes(durationMinutes))
    fail("Choose a timed-event duration of 30, 60, 90, or 120 minutes.");
  const items = trip.items
    .filter((item) => item.date)
    .sort((a, b) =>
      `${a.date} ${a.time || ""} ${a.id}`.localeCompare(
        `${b.date} ${b.time || ""} ${b.id}`,
      ),
    );
  if (!items.length)
    fail("Add a date to at least one itinerary item before exporting.");
  const text = escapeCalendarText;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DayTripper//Itinerary Export//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${text(trip.title)}`,
    `X-WR-TIMEZONE:${text(zone)}`,
  ];
  for (const item of items) {
    if (!validDate(item.date))
      fail("A scheduled item has an invalid date. Edit it before exporting.");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(trip.id)}.${encodeURIComponent(item.id)}@daytripper.local`,
      `DTSTAMP:${stamp(now)}`,
    );
    if (item.time) {
      const start = itineraryInstant(item.date, item.time, zone);
      lines.push(
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(new Date(start.getTime() + durationMinutes * 60000))}`,
      );
    } else {
      lines.push(
        `DTSTART;VALUE=DATE:${calendarDate(item.date)}`,
        `DTEND;VALUE=DATE:${nextDate(item.date)}`,
      );
    }
    const description = [
      `Trip: ${trip.title}`,
      `Category: ${item.category}`,
      `Booking/task: ${item.status === "verified" ? "Confirmed" : "To confirm"}`,
      item.notes,
      item.url ? `Reference: ${item.url}` : "",
      item.time
        ? `Time zone: ${zone}. Duration: ${durationMinutes} minutes (export setting).`
        : "No time set; exported as an all-day event.",
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      `SUMMARY:${text(item.title)}`,
      `LOCATION:${text(item.location || trip.destination)}`,
      `DESCRIPTION:${text(description)}`,
      `STATUS:${item.status === "verified" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  const filename =
    (trip.title
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "trip") + "-itinerary.ics";
  return {
    content: lines.map(foldCalendarLine).join("\r\n") + "\r\n",
    filename,
    count: items.length,
    timezone: zone,
  };
}

// Calendar scope: manual .ics import/export only. See calendar-import.js.
// Account linking and automatic availability sync are intentionally out of scope.
