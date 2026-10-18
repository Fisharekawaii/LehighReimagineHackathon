import React, { useState } from "react";
import { Wallet, ClipboardList, ArrowRight, Copy, Check } from "lucide-react";
import { Modal, Field, Button, ErrorMessage } from "../../components/UI";
import VibeGallery from "./VibeGallery";
import { vibes } from "../../config/assets";
import { api } from "../../lib/api";
import { formData } from "../../lib/format";
export function CreateTrip({ onClose, onSaved }) {
  const [theme,setTheme] = useState("coast");
  const [mode, setMode] = useState("pool"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSaved(await api("/trips", "POST", { ...formData(e), mode }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Create a trip"
      subtitle="Choose your destination, dates, and trip vibe."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">
        <Field label="Trip name">
          <input
            name="title"
            placeholder="Nantucket weekend"
            maxLength={80}
            required
            autoFocus
          />
        </Field>
        <Field label="Destination">
          <input
            name="destination"
            placeholder="Nantucket, Massachusetts"
            maxLength={100}
            required
          />
        </Field>
        <div className="form-row">
          <Field label="Start date">
            <input type="date" name="start" required />
          </Field>
          <Field label="End date">
            <input type="date" name="end" required />
          </Field>
        </div>
        <VibeGallery value={theme} onChange={setTheme}/>
        <Field label="Trip mood">
          <select name="theme" value={theme} onChange={e=>setTheme(e.target.value)}>
            {Object.entries(vibes).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <fieldset>
          <legend>How are you planning together?</legend>
          <div className="mode-options">
            {[
              [
                "pool",
                Wallet,
                "Shared pool",
                "Track contributions to one organizer.",
              ],
              [
                "planning",
                ClipboardList,
                "Planning only",
                "Plan and check off bookings together.",
              ],
            ].map(([id, Icon, label, description]) => (
              <label
                className={"mode-option " + (mode === id ? "selected" : "")}
                key={id}
              >
                <input
                  type="radio"
                  name="mode"
                  value={id}
                  checked={mode === id}
                  onChange={() => setMode(id)}
                />
                <Icon size={22} />
                <strong>{label}</strong>
                <span>{description}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="fine-print">
          All payments happen outside DayTripper. Trip mode is fixed for this
          first version.
        </p>
        <ErrorMessage error={error} />
        <Button busy={busy} type="submit">
          Create trip <ArrowRight size={17} />
        </Button>
      </form>
    </Modal>
  );
}
export function JoinTrip({ initialCode = "", onClose, onSaved }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Join a trip"
      subtitle="Enter the invite code your organizer shared."
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            onSaved(await api("/join", "POST", formData(e)));
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Invite code">
          <input
            name="code"
            defaultValue={initialCode}
            required
            placeholder="12-character code"
            autoComplete="off"
            autoFocus
          />
        </Field>
        <ErrorMessage error={error} />
        <Button type="submit" busy={busy}>
          Join trip <ArrowRight size={17} />
        </Button>
      </form>
    </Modal>
  );
}
export function InviteTrip({ trip, onClose, onUpdate }) {
  const [copied, setCopied] = useState("");
  const [role, setRole] = useState("viewer"),
    [error, setError] = useState("");
  const code =
    role === "viewer"
      ? trip.code
      : trip.invites?.find((i) => i.role === "editor")?.code || "";
  const link = code ? window.location.origin + "/?join=" + code : "";
  async function copy(value, type) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
    } catch {
      setCopied("Select and copy the text below.");
    }
  }
  return (
    <Modal
      title="Invite travelers"
      subtitle="Share a link or invite code. Friends sign in or create an account, then join."
      onClose={onClose}
    >
      <div className="form-stack">
        {trip.role !== "organizer" ? (
          <p>Ask your organizer to create an invite or change your access.</p>
        ) : (
          <>
            <Field label="Invite permission">
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="viewer">Viewer — can view and contribute</option>
                <option value="editor">Editor — can also change plans</option>
              </select>
            </Field>
            {!code && (
              <Button
                onClick={async () => {
                  try {
                    onUpdate(
                      await api(`/trips/${trip.id}/invites`, "POST", { role }),
                    );
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Create editor invite
              </Button>
            )}
            <ErrorMessage error={error} />
            <Field label="Invite code">
              <div className="copy-row">
                <input
                  value={code}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  variant="secondary"
                  onClick={() => copy(code, "code")}
                  aria-label="Copy invite code"
                >
                  {copied === "code" ? <Check size={18} /> : <Copy size={18} />}
                </Button>
              </div>
            </Field>
            <Field label="Invite link">
              <div className="copy-row">
                <input
                  value={link}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  variant="secondary"
                  onClick={() => copy(link, "link")}
                  aria-label="Copy invite link"
                >
                  {copied === "link" ? <Check size={18} /> : <Copy size={18} />}
                </Button>
              </div>
            </Field>
            <p className="fine-print" role="status">
              {copied
                ? "Copied—or select the text to copy manually."
                : "New members are included in the equal split automatically."}
            </p>
            <p className="info-note">
              Anyone with this invite can join with its permission. Only the
              organizer can change roles or confirm money received.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
