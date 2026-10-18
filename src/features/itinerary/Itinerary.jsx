import React from "react";
import {
  CalendarDays,
  MapPin,
  Plus,
  ArrowUpRight,
  Map,
  Clock,
} from "lucide-react";
import { SectionHeading, Button, Tag, Empty } from "../../components/UI";
import { dateLabel, money } from "../../lib/format";
import TripMap from "../maps/TripMap";
import { api } from "../../lib/api";
import CalendarPanel from "../calendar/CalendarPanel";
// MAPS-01 implemented: saved pins, animated selection, route connections and travel estimates.
export default function Itinerary({ trip, onAdd, onEdit, onUpdate, notify }) {
  const plans = [...trip.items, ...(trip.stops || [])];
  const stops = [...plans].sort(
    (a, b) =>
      (a.date || "9999").localeCompare(b.date || "9999") ||
      (a.time || "99").localeCompare(b.time || "99"),
  );
  const dates = [
      ...new Set(plans.filter((i) => i.date).map((i) => i.date)),
    ].sort(),
    unscheduled = plans.filter((i) => !i.date);
  return (
    <>
      <SectionHeading
        title="Itinerary & map"
        description="Your stays, little adventures and imported plans, all in one place."
        action={
          <Button onClick={() => onAdd()}>
            <Plus size={17} />
            Add a plan
          </Button>
        }
      />
      <div className="itinerary-layout">
        <div>
          {dates.length ? (
            dates.map((date, index) => (
              <section className="day-section" key={date}>
                <div className="day-heading">
                  <span className="day-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{dateLabel(date, { weekday: "long" })}</h3>
                    <p>
                      {dateLabel(date, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="timeline">
                  {plans
                    .filter((i) => i.date === date)
                    .sort((a, b) =>
                      (a.time || "99").localeCompare(b.time || "99"),
                    )
                    .map((i) => (
                      <button
                        className="timeline-item"
                        key={i.id}
                        onClick={() => !i.itineraryOnly && onEdit(i)}
                      >
                        <span className="timeline-time">
                          {i.time || "Anytime"}
                        </span>
                        <div>
                          <Tag>{i.category}</Tag>
                          <h3>{i.title}</h3>
                          <p>
                            <MapPin size={14} />
                            {i.location || "Add a location"}
                          </p>
                        </div>
                        <strong>
                          {i.itineraryOnly
                            ? "Calendar plan"
                            : money(i.priceCents * i.quantity)}
                        </strong>
                      </button>
                    ))}
                </div>
              </section>
            ))
          ) : (
            <div className="panel">
              <Empty
                icon={CalendarDays}
                title="No plans scheduled yet"
                description="Add a date to an item in your budget and it will show up here."
                action={
                  <Button variant="secondary" onClick={() => onAdd()}>
                    Schedule something <Plus size={16} />
                  </Button>
                }
              />
            </div>
          )}
          {unscheduled.length > 0 && (
            <div className="panel unscheduled">
              <div className="panel-heading">
                <h3>
                  Room in the schedule{" "}
                  <span className="count">{unscheduled.length}</span>
                </h3>
              </div>
              {unscheduled.map((i) => (
                <button
                  key={i.id}
                  className="unscheduled-item"
                  onClick={() => !i.itineraryOnly && onEdit(i)}
                >
                  <span>{i.title}</span>
                  <span>
                    Add a date <ArrowUpRight size={15} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <aside className="itinerary-aside">
          {(trip.stops || []).length > 0 && trip.canEdit && (
            <details className="panel">
              <summary>Manage imported plans</summary>
              {trip.stops.map((s) => (
                <div className="unscheduled-item" key={s.id}>
                  <span>{s.title}</span>
                  <button
                    className="text-link"
                    onClick={async () => {
                      try {
                        onUpdate(
                          await api(
                            `/trips/${trip.id}/stops/${s.id}`,
                            "DELETE",
                          ),
                        );
                      } catch (e) {
                        notify(e.message, true);
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </details>
          )}
          <TripMap trip={trip} stops={stops} onUpdate={onUpdate} />
          <CalendarPanel key={trip.id} trip={trip} onUpdate={onUpdate} />
        </aside>
      </div>
    </>
  );
}
