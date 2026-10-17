import test from "node:test";
import assert from "node:assert/strict";
import { exportItinerary, itineraryInstant } from "./integrations/calendar.js";
const trip = {
  id: "trip-1",
  title: "Nantucket weekend",
  destination: "Nantucket, MA",
  items: [
    {
      id: "cottage",
      title: "Cottage check-in",
      category: "Stays",
      date: "2026-10-23",
      time: "16:00",
      location: "Harbor",
      notes: "Bring the keys",
      status: "verified",
    },
    {
      id: "beach",
      title: "Beach day",
      category: "Experiences",
      date: "2026-10-24",
      time: "",
      status: "proposed",
    },
    {
      id: "food",
      title: "Groceries",
      category: "Food & drinks",
      date: "",
      time: "",
    },
  ],
};
const options = {
  trip,
  timezone: "America/New_York",
  now: new Date("2026-10-17T22:00:00Z"),
};
const unfold = (value) => value.replace(/\r\n[ \t]/g, "");
test("exports timed and all-day itinerary events; skips unscheduled items", async () => {
  const result = await exportItinerary(options),
    content = unfold(result.content);
  assert.equal(result.count, 2);
  assert.equal(result.filename, "Nantucket-weekend-itinerary.ics");
  assert.equal((content.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(content, /DTSTART:20261023T200000Z\r\nDTEND:20261023T210000Z/);
  assert.match(
    content,
    /DTSTART;VALUE=DATE:20261024\r\nDTEND;VALUE=DATE:20261025/,
  );
  assert.match(content, /UID:trip-1.cottage@daytripper.local/);
  assert.match(content, /DTSTAMP:20261017T220000Z/);
  assert.match(content, /STATUS:CONFIRMED/);
  assert.match(content, /STATUS:TENTATIVE/);
  assert.doesNotMatch(content, /Groceries/);
  assert.ok(result.content.endsWith("END:VCALENDAR\r\n"));
  const again = await exportItinerary({ ...options, durationMinutes: 90 });
  assert.match(again.content, /DTEND:20261023T213000Z/);
});
test("date-only events end on the next day including year boundaries", async () => {
  const result = await exportItinerary({
    ...options,
    trip: { ...trip, items: [{ ...trip.items[1], date: "2026-12-31" }] },
  });
  assert.match(
    result.content,
    /DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101/,
  );
});
test("converts summer, winter, fractional offsets and DST ambiguity explicitly", () => {
  assert.equal(
    itineraryInstant("2026-07-01", "12:00", "America/New_York").toISOString(),
    "2026-07-01T16:00:00.000Z",
  );
  assert.equal(
    itineraryInstant("2026-12-01", "12:00", "America/New_York").toISOString(),
    "2026-12-01T17:00:00.000Z",
  );
  assert.equal(
    itineraryInstant("2026-07-01", "12:00", "Asia/Kathmandu").toISOString(),
    "2026-07-01T06:15:00.000Z",
  );
  assert.equal(
    itineraryInstant("2026-11-01", "01:30", "America/New_York").toISOString(),
    "2026-11-01T05:30:00.000Z",
  );
  assert.throws(
    () => itineraryInstant("2026-03-08", "02:30", "America/New_York"),
    /does not exist/,
  );
});
test("escapes content injection and folds Unicode within 75 UTF-8 octets", async () => {
  const title =
    "Café 🌴 ".repeat(30) + ", x; y\\z\r\nEND:VEVENT\r\nBEGIN:VEVENT";
  const result = await exportItinerary({
    ...options,
    trip: {
      ...trip,
      title: '\r\n"/unsafe',
      items: [{ ...trip.items[0], title }],
    },
  });
  assert.equal(result.filename, "unsafe-itinerary.ics");
  assert.equal(
    result.content.split("\r\n").filter((l) => l === "BEGIN:VEVENT").length,
    1,
  );
  assert.match(
    unfold(result.content),
    /\\, x\\; y\\\\z\\nEND:VEVENT\\nBEGIN:VEVENT/,
  );
  for (const line of result.content.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.ok(!result.content.includes("�"));
});
test("rejects missing schedules, invalid zones, duration, and malformed times", async () => {
  await assert.rejects(
    exportItinerary({ ...options, trip: { ...trip, items: [trip.items[2]] } }),
    /Add a date/,
  );
  await assert.rejects(
    exportItinerary({ ...options, timezone: "not-a-zone" }),
    /valid IANA/,
  );
  await assert.rejects(
    exportItinerary({ ...options, durationMinutes: 0 }),
    /duration/,
  );
  await assert.rejects(
    exportItinerary({
      ...options,
      trip: { ...trip, items: [{ ...trip.items[0], time: "25:00" }] },
    }),
    /invalid date or time/,
  );
});
