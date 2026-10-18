import React, { useState } from "react";
import {
  Plus,
  Check,
  Users,
  ArrowUpRight,
  Wallet,
  Clock,
  ShieldCheck,
  Wifi,
  ClipboardCheck,
} from "lucide-react";
import {
  SectionHeading,
  Button,
  Tag,
  Avatar,
  Empty,
  Modal,
  Field,
  ErrorMessage,
} from "../../components/UI";
import { money, firstName, formData } from "../../lib/format";
import { api } from "../../lib/api";
export function PoolCard({ trip }) {
  return (
    <div className="pool-card">
      <div className="pool-card-top">
        <span>daytripper.</span>
        <Tag>Simulated card</Tag>
      </div>
      <div className="card-chip">
        <span />
        <Wifi size={22} />
      </div>
      <p>Confirmed external contributions</p>
      <strong className="card-amount">
        {money(trip.totals.confirmedCents)}
      </strong>
      <div className="pool-card-bottom">
        <span>{trip.title}</span>
        <span>DEMO · NO PAYMENTS</span>
      </div>
    </div>
  );
}
export function ContributionForm({ trip, onClose, onSaved }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const owner = trip.members.find((m) => m.id === trip.organizer);
  return (
    <Modal
      title="Record a contribution"
      subtitle={
        "Already sent money to " +
        firstName(owner) +
        "? Record it for them to confirm."
      }
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            onSaved(
              await api(`/trips/${trip.id}/payments`, "POST", formData(e)),
            );
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Amount sent ($)">
          <input
            type="number"
            name="amount"
            min="0.01"
            max="1000000"
            step="0.01"
            required
            autoFocus
            placeholder="150"
          />
        </Field>
        <Field label="Sent via">
          <input
            name="method"
            maxLength={80}
            required
            placeholder="Venmo, cash, bank transfer…"
          />
        </Field>
        <Field label="What is this contribution for?">
          <input
            name="purpose"
            maxLength={240}
            required
            placeholder="Our cottage, dinner, or anything you choose"
          />
        </Field>
        <Field label="Additional note (optional)">
          <input
            name="note"
            maxLength={160}
            placeholder="Anything else the organizer should know"
          />
        </Field>
        <div className="info-note">
          <ShieldCheck size={19} />
          <span>
            DayTripper does not move money. Your organizer must confirm receipt
            before this counts toward your share.
          </span>
        </div>
        <ErrorMessage error={error} />
        <Button type="submit" busy={busy}>
          Submit for confirmation <ArrowUpRight size={17} />
        </Button>
      </form>
    </Modal>
  );
}
export function Pool({ trip, user, onUpdate, onInvite, onContribute, notify }) {
  const [busy, setBusy] = useState("");
  const owner = trip.members.find((m) => m.id === trip.organizer),
    isOwner = user.id === trip.organizer,
    isPool = trip.mode === "pool";
  async function review(p, status) {
    setBusy(p.id);
    try {
      onUpdate(
        await api(`/trips/${trip.id}/payments/${p.id}`, "PATCH", { status }),
      );
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <SectionHeading
        title={isPool ? "Group & pool" : "Your group"}
        description={
          isPool
            ? `${firstName(owner)} collects contributions outside the app and confirms them here.`
            : "Everyone helps make the plan. Each person handles their own payments."
        }
        action={
          <Button onClick={onInvite}>
            <Users size={17} />
            Invite friends
          </Button>
        }
      />
      <div className="pool-layout">
        <div>
          {isPool ? (
            <>
              <PoolCard trip={trip} />
              <div className="pool-summary">
                <div>
                  <span>Trip estimate</span>
                  <strong>{money(trip.totals.estimatedCents)}</strong>
                </div>
                <div>
                  <span>Awaiting confirmation</span>
                  <strong>{money(trip.totals.pendingCents)}</strong>
                </div>
                <div>
                  <span>Still to collect</span>
                  <strong>
                    {money(
                      Math.max(
                        0,
                        trip.totals.estimatedCents - trip.totals.confirmedCents,
                      ),
                    )}
                  </strong>
                </div>
              </div>
              <Button onClick={onContribute} className="full-width">
                <Plus size={17} />
                Record a contribution
              </Button>
              <p className="fine-print">
                This card is a visual demo, not a payment card or a spendable
                balance.
              </p>
            </>
          ) : (
            <div className="planning-card">
              <ClipboardCheck size={35} />
              <Tag>Planning only</Tag>
              <h2>
                A shared plan.
                <br />
                Your own payments.
              </h2>
              <p>
                Check off bookings in Plan & Budget. Your group can see what's
                ready and what still needs a little attention.
              </p>
            </div>
          )}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <h3>
              The crew <span className="count">{trip.members.length}</span>
            </h3>
            <Tag>Equal shares</Tag>
          </div>
          {trip.members.map((member) => {
            const s = trip.totals.shares.find((s) => s.userId === member.id);
            return (
              <div className="member-row" key={member.id}>
                <Avatar user={member} />
                <div className="member-info">
                  <strong>
                    {member.name}
                    {member.id === user.id ? " (you)" : ""}
                  </strong>
                  <small>
                    {member.id === trip.organizer
                      ? "Trip organizer"
                      : member.role === "viewer"
                        ? "Viewer · can contribute"
                        : "Editor"}
                  </small>
                </div>
                {isOwner && member.id !== trip.organizer && (
                  <select
                    aria-label={`Permission for ${member.name}`}
                    value={member.role}
                    onChange={async (e) => {
                      try {
                        onUpdate(
                          await api(
                            `/trips/${trip.id}/members/${member.id}`,
                            "PATCH",
                            { role: e.target.value },
                          ),
                        );
                      } catch (e) {
                        notify(e.message, true);
                      }
                    }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                )}
                <div className="member-money">
                  <strong>{money(s.owedCents)}</strong>
                  <small>
                    {isPool
                      ? s.creditCents
                        ? money(s.creditCents) + " over share"
                        : s.remainingCents
                          ? money(s.remainingCents) + " remaining"
                          : "Share covered"
                      : "Estimated share"}
                  </small>
                </div>
              </div>
            );
          })}
          <div className="panel-footer">
            <p className="fine-print">
              Shares update when people join or the budget changes. Any rounding
              cent goes to members in join order.
            </p>
          </div>
        </div>
      </div>
      {isPool && (
        <div className="panel payment-panel">
          <div className="panel-heading">
            <h3>Contribution activity</h3>
            <Tag>{isOwner ? "Organizer view" : "Member view"}</Tag>
          </div>
          {trip.payments.length ? (
            <div>
              {[...trip.payments].reverse().map((p) => {
                const member = trip.members.find((m) => m.id === p.userId);
                return (
                  <div className="payment-row" key={p.id}>
                    <Avatar user={member} small />
                    <div className="item-main">
                      <strong>
                        {firstName(member)} recorded {money(p.amountCents)}
                      </strong>
                      <p className="item-meta">
                        Via {p.method || "External payment"} · For{" "}
                        {p.purpose || "Trip contribution"}
                        {p.note ? ` — ${p.note}` : ""}
                      </p>
                    </div>
                    <Tag
                      tone={
                        p.status === "confirmed"
                          ? "green"
                          : p.status === "rejected"
                            ? "red"
                            : "amber"
                      }
                    >
                      {p.status === "pending"
                        ? "Awaiting confirmation"
                        : p.status}
                    </Tag>
                    {isOwner && p.status === "pending" && (
                      <div className="review-actions">
                        <Button
                          variant="secondary small-btn"
                          busy={busy === p.id}
                          onClick={() => review(p, "rejected")}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="small-btn"
                          busy={busy === p.id}
                          onClick={() => review(p, "confirmed")}
                        >
                          <Check size={14} />
                          Confirm receipt
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty
              icon={Wallet}
              title="No contributions yet"
              description="Record money sent outside the app. It will appear here for the organizer to review."
            />
          )}
        </div>
      )}
    </>
  );
}
