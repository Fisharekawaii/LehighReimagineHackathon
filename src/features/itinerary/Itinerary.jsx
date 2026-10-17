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
import CalendarPanel from "../calendar/CalendarPanel";
// TODO(MAPS-01): Mount a map provider here using item.location and itinerary order.
export default function Itinerary({ trip, onAdd, onEdit }) {
  const dates = [
      ...new Set(trip.items.filter((i) => i.date).map((i) => i.date)),
    ].sort(),
    unscheduled = trip.items.filter((i) => !i.date);
  return (
    <>
      <SectionHeading
        eyebrow="Leave a little room for serendipity"
        title="Your days, taking shape."
        description="Give any budget item a date and time to add it to your itinerary."
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
                  {trip.items
                    .filter((i) => i.date === date)
                    .sort((a, b) =>
                      (a.time || "99").localeCompare(b.time || "99"),
                    )
                    .map((i) => (
                      <button
                        className="timeline-item"
                        key={i.id}
                        onClick={() => onEdit(i)}
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
                        <strong>{money(i.priceCents * i.quantity)}</strong>
                      </button>
                    ))}
                </div>
              </section>
            ))
          ) : (
            <div className="panel">
              <Empty
                icon={CalendarDays}
                title="The best weekends start with a loose plan."
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
                  onClick={() => onEdit(i)}
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
          <div className="map-shell">
            <div className="map-drawing" aria-hidden="true">
              <div className="map-road one" />
              <div className="map-road two" />
              <div className="map-water" />
              <MapPin className="map-pin" size={35} />
            </div>
            <div className="map-caption">
              <Tag>Coming next</Tag>
              <h3>Every stop, connected.</h3>
              <p>
                Interactive maps and routes will live here. Your locations are
                saved with each item.
              </p>
            </div>
          </div>
          <CalendarPanel key={trip.id} trip={trip} />
        </aside>
      </div>
    </>
  );
}
