import React, { useState } from "react";
import { Button, ErrorMessage, Field } from "../../components/UI";
import { api } from "../../lib/api";
export default function CalendarImport({ trip, onUpdate, timezone }) {
  const [content, setContent] = useState(""),
    [preview, setPreview] = useState(null),
    [selected, setSelected] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  return (
    <div className="calendar-import">
      <h3>Calendar import</h3>
      <p>
        Import an .ics file. Review events and places before adding them; no
        budget costs are created.
      </p>
      <Field label="Calendar file (.ics)">
        <input
          type="file"
          accept=".ics,text/calendar"
          disabled={!trip.canEdit || busy}
          onChange={async (e) => {
            const file = e.target.files[0];
            setPreview(null);
            setNotice("");
            setError("");
            if (!file) return;
            if (file.size > 300000) {
              setError("Choose a file under 300 KB.");
              return;
            }
            setBusy(true);
            try {
              const text = await file.text();
              setContent(text);
              const data = await api(
                `/trips/${trip.id}/calendar/preview`,
                "POST",
                { content: text, timezone },
              );
              setPreview(data);
              setSelected(data.events.map((e) => e.sourceId));
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </Field>
      {preview && (
        <>
          <p className="fine-print">
            Times shown in {preview.timezone}. Floating times are kept as
            written. Recurring events and events outside this trip are skipped.
          </p>
          {preview.warnings.map((w) => (
            <p className="info-note" key={w}>
              {w}
            </p>
          ))}
          <div className="import-event-list">
            {preview.events.map((e) => (
              <label key={e.sourceId} className="import-event">
                <input
                  type="checkbox"
                  checked={selected.includes(e.sourceId)}
                  onChange={(ev) =>
                    setSelected((s) =>
                      ev.target.checked
                        ? [...s, e.sourceId]
                        : s.filter((id) => id !== e.sourceId),
                    )
                  }
                />
                <span>
                  <strong>{e.title}</strong>
                  <small>
                    {e.date} · {e.time || "All day"} ·{" "}
                    {e.location || "No location"}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <Button
            busy={busy}
            disabled={!selected.length || !trip.canEdit}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                onUpdate(
                  await api(`/trips/${trip.id}/calendar/import`, "POST", {
                    content,
                    timezone: preview.timezone,
                    selected,
                  }),
                );
                setPreview(null);
                setNotice(
                  "Selected plans imported. Existing events were not duplicated.",
                );
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Import {selected.length} selected plans
          </Button>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
      <ErrorMessage error={error} />
    </div>
  );
}
