import React, { useState } from "react";
import { Sparkles, ArrowUpRight, Check, MessageCircle } from "lucide-react";
import { Modal, Button, Field, Tag, ErrorMessage } from "../../components/UI";
import { api } from "../../lib/api";
import { money } from "../../lib/format";
// TODO(AI-01): Preserve preview/apply UX when connecting an actual LLM provider.
export default function Assistant({ trip, onClose, onSaved }) {
  const [text, setText] = useState(""),
    [proposal, setProposal] = useState(null),
    [submitted, setSubmitted] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Trip assistant"
      subtitle="Try the supported demo commands below."
      onClose={onClose}
    >
      <div className="form-stack">
        <div className="info-note">
          <Sparkles size={20} />
          <span>
            <strong>Demo command mode</strong>
            <br />
            No AI provider is connected yet. Try an exact example below to
            preview and apply a budget change.
          </span>
        </div>
        <div className="prompt-chips">
          {[
            "Add cottage for $600 x 2 to Stays",
            "Add dinner for $30 x 4 to Food & drinks",
          ].map((t) => (
            <button
              key={t}
              onClick={() => {
                setText(t);
                setProposal(null);
              }}
            >
              {t}
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setProposal(null);
            try {
              const r = await api(`/trips/${trip.id}/assistant`, "POST", {
                text,
              });
              setProposal(r.proposal);
              setSubmitted(text);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Your request">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setProposal(null);
              }}
              maxLength={500}
              placeholder="Add cottage for $600 x 2 to Stays"
              required
            />
          </Field>
          <Button variant="secondary" type="submit" busy={busy}>
            <Sparkles size={16} />
            Preview change
          </Button>
        </form>
        {proposal && (
          <div className="proposal">
            <Tag>Review before applying</Tag>
            <h3>
              {proposal.type === "add" ? "Add" : "Update"} {proposal.title}
            </h3>
            <p>
              {proposal.type === "add"
                ? `${proposal.quantity} × ${money(proposal.price * 100)} · ${proposal.category}`
                : `Set unit price to ${money(proposal.price * 100)}`}
            </p>
            <Button
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  onSaved(
                    await api(`/trips/${trip.id}/assistant/apply`, "POST", {
                      text: submitted,
                    }),
                  );
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={17} />
              Apply to trip
            </Button>
          </div>
        )}
        <ErrorMessage error={error} />
      </div>
    </Modal>
  );
}
