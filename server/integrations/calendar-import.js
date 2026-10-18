import ICAL from "ical.js";
import { fail } from "../logic.js";
// CAL-04: Recurring series are deliberately skipped until occurrence editing is supported.
export function previewCalendar(content, timezone, trip) {
  if (typeof content !== "string" || content.length > 300000)
    fail("Choose an .ics file under 300 KB.");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    fail("Choose a valid destination time zone.");
  }
  let root;
  try {
    root = new ICAL.Component(ICAL.parse(content));
  } catch {
    fail("This calendar file could not be read.");
  }
  if (root.name !== "vcalendar") fail("Choose a valid .ics calendar file.");
  const warnings = [],
    events = [];
  const zones = new Map(
    root
      .getAllSubcomponents("vtimezone")
      .map((c) => [c.getFirstPropertyValue("tzid"), new ICAL.Timezone(c)]),
  );
  const components = root.getAllSubcomponents("vevent");
  if (components.length > 300) fail("Import up to 300 events at a time.");
  for (const c of components) {
    if (
      c.hasProperty("rrule") ||
      c.hasProperty("rdate") ||
      c.hasProperty("recurrence-id")
    ) {
      warnings.push(
        "Recurring events were skipped. Export individual occurrences to import them.",
      );
      continue;
    }
    if (String(c.getFirstPropertyValue("status")).toUpperCase() === "CANCELLED")
      continue;
    const start = c.getFirstPropertyValue("dtstart");
    if (!start) continue;
    const tzid = c.getFirstProperty("dtstart").getParameter("tzid");
    let date,
      time = "";
    if (start.isDate || (!tzid && start.zone?.tzid !== "UTC")) {
      const text = start.toString();
      date = text.slice(0, 10);
      time = start.isDate ? "" : text.slice(11, 16);
    } else {
      let instant;
      if (tzid && zones.has(tzid)) {
        start.zone = zones.get(tzid);
        instant = start.toJSDate();
      } else if (tzid) {
        // Reuse our DST-aware wall clock resolver for IANA TZIDs.
        try {
          instant = new Date(resolveIana(start, tzid));
        } catch {
          warnings.push(`Skipped an event with unsupported time zone ${tzid}.`);
          continue;
        }
      } else instant = start.toJSDate();
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(instant)
          .map((p) => [p.type, p.value]),
      );
      date = `${parts.year}-${parts.month}-${parts.day}`;
      time = `${parts.hour}:${parts.minute}`;
    }
    if (date < trip.start || date > trip.end) {
      warnings.push("Events outside the trip dates were skipped.");
      continue;
    }
    const title = String(
      c.getFirstPropertyValue("summary") || "Calendar plan",
    ).slice(0, 100);
    const uid = String(c.getFirstPropertyValue("uid") || title);
    const geo = c.getFirstPropertyValue("geo");
    const url = String(c.getFirstPropertyValue("url") || "");
    events.push({
      sourceId: `${uid}|${date}|${time}`,
      title,
      date,
      time,
      location: String(c.getFirstPropertyValue("location") || "").slice(0, 150),
      notes: String(c.getFirstPropertyValue("description") || "").slice(0, 500),
      url: /^https?:\/\//i.test(url) ? url.slice(0, 500) : "",
      category: "Other",
      priceCents: 0,
      quantity: 1,
      status: "proposed",
      itineraryOnly: true,
      ...(Array.isArray(geo) &&
      geo.length === 2 &&
      Math.abs(geo[0]) <= 90 &&
      Math.abs(geo[1]) <= 180
        ? { coordinates: { lat: Number(geo[0]), lng: Number(geo[1]) } }
        : {}),
    });
  }
  return { events, warnings: [...new Set(warnings)], timezone };
}
function resolveIana(time, zone) {
  const target = Date.UTC(
    time.year,
    time.month - 1,
    time.day,
    time.hour,
    time.minute,
    time.second,
  );
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const wall = (ms) => {
    const p = Object.fromEntries(
      formatter.formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
    );
    return Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
  };
  const candidates = [-36, -12, 12, 36]
    .map((h) => {
      const sample = target + h * 3600000;
      return target - (wall(sample) - sample);
    })
    .filter((ms) => wall(ms) === target);
  if (!candidates.length) throw new Error("Invalid local time");
  return Math.min(...candidates);
}
