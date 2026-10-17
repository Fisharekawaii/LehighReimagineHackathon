import React, { useState } from "react";
import { Wallet, ClipboardList, ArrowRight, Copy, Check } from "lucide-react";
import { Modal, Field, Button, ErrorMessage } from "../../components/UI";
import { api } from "../../lib/api";
import { formData } from "../../lib/format";
export function CreateTrip({ onClose, onSaved }) {
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
      title="A good trip starts here."
      subtitle="Pick a place. Bring your people. Make it happen."
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
        <Field label="Trip mood">
          <select name="theme">
            <option value="coast">Coastal escape</option>
            <option value="forest">Into the outdoors</option>
            <option value="city">City break</option>
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
      title="Your people are waiting."
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
export function InviteTrip({ trip, onClose }) {
  const [copied, setCopied] = useState("");
  const link = window.location.origin + "/?join=" + trip.code;
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
      title="Better with your people."
      subtitle="Share a link or invite code. Friends choose a demo profile, then join."
      onClose={onClose}
    >
      <div className="form-stack">
        <Field label="Invite code">
          <div className="copy-row">
            <input
              value={trip.code}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <Button
              variant="secondary"
              onClick={() => copy(trip.code, "code")}
              aria-label="Copy invite code"
            >
              {copied === "code" ? <Check size={18} /> : <Copy size={18} />}
            </Button>
          </div>
        </Field>
        <Field label="Invite link">
          <div className="copy-row">
            <input value={link} readOnly onFocus={(e) => e.target.select()} />
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
          Demo profiles are shared test identities. Use sample trip and payment
          details.
        </p>
      </div>
    </Modal>
  );
}
