import React from "react";
import {
  ArrowUpRight,
  Plus,
  Check,
  MapPin,
  CalendarDays,
  Users,
  ArrowRight,
  Sun,
  Wallet,
  ClipboardCheck,
} from "lucide-react";
import { Button, Tag, Avatar, Empty } from "../../components/UI";
import { money, dateRange, firstName } from "../../lib/format";
import { themeImages, vibes } from "../../config/assets";
import { api } from "../../lib/api";
import { categoryMeta } from "../budget/Budget";
import { PoolCard } from "../pool/Pool";
export default function Overview({
  trip,
  user,
  onTab,
  onAdd,
  onInvite,
  onUpdate,
  notify,
}) {
  const ready = trip.items.filter((i) => i.status === "verified").length,
    share = trip.totals.shares.find((s) => s.userId === user.id),
    pool = trip.mode === "pool";
  return (
    <>
      <div
        className={"trip-hero " + trip.theme}
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(15,46,43,.73),rgba(15,46,43,.08)),url(${themeImages[trip.theme]})`,
        }}
      >
        <div className="hero-top">
          <span className="hero-kicker">
            <Sun size={15} />{" "}
            {vibes[trip.theme]?.caption || "A little time away"}
          </span>
          <Tag>{pool ? "Shared pool" : "Planning only"}</Tag>
        </div>
        <div className="hero-bottom">
          <div>
            <p>{trip.destination}</p>
            <h1>{trip.title}</h1>
            <div className="hero-details">
              <span>
                <CalendarDays size={15} />
                {dateRange(trip)}
              </span>
              <span>
                <Users size={15} />
                {trip.members.length}{" "}
                {trip.members.length === 1 ? "traveler" : "travelers"}
              </span>
            </div>
          </div>
          <button
            className="hero-invite"
            aria-label="Invite friends to this trip"
            onClick={onInvite}
          >
            <div className="avatar-stack">
              {trip.members.slice(0, 3).map((m) => (
                <Avatar key={m.id} user={m} small />
              ))}
            </div>
            <span>Bring your people</span>
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="vibe-toolbar">
        <span>Your getaway, your pace.</span>
        <label>
          Trip vibe{" "}
          <select
            aria-label="Trip vibe"
            value={trip.theme}
            disabled={!trip.canEdit}
            onChange={async (e) => {
              try {
                onUpdate(
                  await api(`/trips/${trip.id}/theme`, "PATCH", {
                    theme: e.target.value,
                  }),
                );
              } catch (e) {
                notify(e.message, true);
              }
            }}
          >
            {Object.entries(vibes).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <Tag>{trip.role}</Tag>
      </div>
      <div className="stats-grid">
        <div className="stat">
          <span>
            Trip estimate <Tag>USD</Tag>
          </span>
          <strong>{money(trip.totals.estimatedCents)}</strong>
          <small>Every good idea, added up</small>
        </div>
        <div className="stat">
          <span>Your estimated share</span>
          <strong>{money(share?.owedCents)}</strong>
          <small>Split equally across {trip.members.length}</small>
        </div>
        <div className="stat">
          <span>{pool ? "Confirmed contributions" : "Plans confirmed"}</span>
          <strong>
            {pool ? (
              money(trip.totals.confirmedCents)
            ) : (
              <>
                {ready}
                <em> / {trip.items.length}</em>
              </>
            )}
          </strong>
          <small>
            {pool
              ? "Receipt checked by your organizer"
              : "Bookings and tasks checked off"}
          </small>
        </div>
        <div className="stat">
          <span>Trip readiness</span>
          <strong>
            {trip.items.length
              ? Math.round((100 * ready) / trip.items.length)
              : 0}
            <em>%</em>
          </strong>
          <div className="progress">
            <span
              style={{
                width: `${trip.items.length ? (100 * ready) / trip.items.length : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="overview-grid">
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">The building blocks</p>
              <h2>Make it your kind of trip.</h2>
            </div>
            <button className="text-link" onClick={() => onTab("budget")}>
              View budget <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="plan-category-list">
            {categoryMeta.map(({ name, icon: Icon, color }) => {
              const items = trip.items.filter((i) => i.category === name),
                sum = items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
              return (
                <button
                  className="plan-category"
                  key={name}
                  onClick={() => onAdd(name)}
                >
                  <span className={"category-icon " + color}>
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3>{name}</h3>
                    <p>
                      {items.length
                        ? `${items.length} ${items.length === 1 ? "idea" : "ideas"} on the plan`
                        : {
                            Stays: "Find your home away from home",
                            "Food & drinks": "Good food, better company",
                            Transport: "Getting there is part of the adventure",
                            Experiences: "The things you’ll remember",
                            Other: "Leave room for the unexpected",
                          }[name]}
                    </p>
                  </div>
                  <strong>{sum ? money(sum) : "Add a plan"}</strong>
                  <Plus size={17} />
                </button>
              );
            })}
          </div>
          <div className="gentle-note">
            <Sun size={21} />
            <p>
              <strong>A plan everyone can get behind.</strong>
              <br />
              Add ideas now. Confirm the details together as you go.
            </p>
          </div>
        </div>
        <aside className="overview-aside">
          {pool ? (
            <>
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">Together, accounted for</p>
                  <h2>Your trip pool</h2>
                </div>
              </div>
              <PoolCard trip={trip} />
              <button className="aside-link" onClick={() => onTab("pool")}>
                Manage contributions <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <div className="panel planning-aside">
              <ClipboardCheck size={26} />
              <h3>
                Plan together.
                <br />
                Pay your own way.
              </h3>
              <p>
                Use the shared checklist to see what’s booked, confirmed, and
                still to do.
              </p>
              <button className="text-link" onClick={() => onTab("budget")}>
                Open your plan <ArrowRight size={16} />
              </button>
            </div>
          )}
          <div className="crew-box">
            <div className="panel-heading">
              <h3>Your people</h3>
              <button className="text-link" onClick={onInvite}>
                Invite <Plus size={15} />
              </button>
            </div>
            {trip.members.map((m) => (
              <div key={m.id} className="crew-person">
                <Avatar user={m} small />
                <span>{m.name}</span>
                {m.id === trip.organizer && <small>Organizer</small>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
