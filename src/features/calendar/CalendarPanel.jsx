import React, { useState } from "react";
import { CalendarDays, Download, Check } from "lucide-react";
import { Tag, Field, Button, ErrorMessage } from "../../components/UI";

import CalendarImport from "./CalendarImport";
const commonZones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];
function deviceZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
function timeZones(current) {
  const available =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : commonZones;
  return [...new Set([current, ...commonZones, ...available])].sort();
}

export default function CalendarPanel({ trip, onUpdate }) {
  const [timezone, setTimezone] = useState(deviceZone);
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [downloaded, setDownloaded] = useState(false);
  const count = [...trip.items, ...(trip.stops || [])].filter(
    (item) => item.date,
  ).length;
  async function download(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDownloaded(false);
    try {
      const response = await fetch(`/api/trips/${trip.id}/calendar/export`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone, durationMinutes: duration }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || "Unable to export the itinerary. Please try again.",
        );
      }
      if (!response.headers.get("Content-Type")?.includes("text/calendar"))
        throw new Error(
          "The calendar file could not be downloaded. Please try again.",
        );
      const blob = await response.blob();
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] || "trip-itinerary.ics";
      const href = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Give Safari time to start reading the download before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(href), 60000);
      setDownloaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel integration-card calendar-panel">
      <CalendarDays size={23} />
      <Tag tone="green">Export ready</Tag>
      <h3>Take the plan with you.</h3>
      <p>
        Download {count} scheduled {count === 1 ? "item" : "items"} for Google
        Calendar, Apple Calendar, or Outlook.
      </p>
      <form className="form-stack" onSubmit={download}>
        <Field
          label="Destination time zone"
          hint="Starts with your device’s zone. Select where the trip takes place."
        >
          <select
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              setDownloaded(false);
            }}
          >
            {timeZones(timezone).map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Timed-event duration"
          hint="Used for every item with a time; end times aren’t stored yet."
        >
          <select
            value={duration}
            onChange={(e) => {
              setDuration(Number(e.target.value));
              setDownloaded(false);
            }}
          >
            {[30, 60, 90, 120].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" busy={busy} disabled={!count}>
          <Download size={16} />
          Download itinerary (.ics)
        </Button>
        {!count && (
          <p className="fine-print">
            Add a date to a plan item to enable export.
          </p>
        )}
        <ErrorMessage error={error} />
        {downloaded && (
          <p className="calendar-success" role="status">
            <Check size={15} />
            File prepared. Open or import it in your calendar.
          </p>
        )}
      </form>
      <p className="fine-print">
        Items without a time become all-day events. Undated items are skipped.
        During a repeated daylight-saving hour, the earlier occurrence is used.
      </p>
      <details className="calendar-help">
        <summary>How to use the file</summary>
        <p>
          Open the downloaded .ics file with a calendar app, or use your
          calendar’s import option and select the file. It’s a snapshot: later
          trip edits need another export. Re-importing can create duplicates in
          some apps.
        </p>
      </details>
      <CalendarImport trip={trip} onUpdate={onUpdate} timezone={timezone} />
      <div className="calendar-future">
        <Tag>Still planned</Tag>
        <p>
          Shared availability matching and automatic calendar syncing are still
          planned.
        </p>
      </div>
      {/* TODO(CAL-02): Add availability import here. TODO(CAL-03): Shared zone and per-item end times. */}
    </div>
  );
}
