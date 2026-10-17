import React from "react";
import {
  MapPin,
  House,
  Utensils,
  Ticket,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { SectionHeading, Tag, Button } from "../../components/UI";
// TODO(EXPLORE-01): Replace provider shells with normalized recommendations.
// TODO(PRICES-01): Populate estimates only with source, currency, and checked-at time.
export default function Explore({ trip, onAdd }) {
  const q = encodeURIComponent(trip.destination);
  return (
    <>
      <SectionHeading
        eyebrow="A place for your next favorite place"
        title={"Explore " + trip.destination}
        description="Find inspiration, then bring the good ideas back to your plan."
      />
      <div className="explore-banner">
        <div>
          <Tag>Discovery is coming</Tag>
          <h2>
            Less searching.
            <br />
            More “let’s do that.”
          </h2>
          <p>
            Nearby stays, local food, and memorable experiences will come
            together here.
          </p>
          <Button variant="white" onClick={() => onAdd()}>
            Add your own find <ArrowUpRight size={17} />
          </Button>
        </div>
        <MapPin size={100} strokeWidth={1} />
      </div>
      <div className="explore-grid">
        {[
          {
            icon: House,
            title: "Somewhere to stay",
            text: "Compare places that fit your group and your budget.",
            links: [
              [
                "Booking.com",
                `https://www.booking.com/searchresults.html?ss=${q}`,
              ],
              ["Airbnb", `https://www.airbnb.com/s/${q}/homes`],
            ],
          },
          {
            icon: Utensils,
            title: "A taste of the place",
            text: "Find the coffee stop, dinner spot, and everything in between.",
            links: [
              [
                "Search on Google Maps",
                `https://www.google.com/maps/search/restaurants+${q}`,
              ],
            ],
          },
          {
            icon: Ticket,
            title: "Something worth doing",
            text: "Build a day around the things you will talk about later.",
            links: [
              [
                "Explore on Google Maps",
                `https://www.google.com/maps/search/things+to+do+${q}`,
              ],
            ],
          },
        ].map(({ icon: Icon, title, text, links }) => (
          <div className="panel explore-card" key={title}>
            <span className="category-icon sage">
              <Icon size={22} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
            <Tag>Live recommendations not connected</Tag>
            <div className="outbound-links">
              {links.map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noreferrer">
                  {label}
                  <ArrowUpRight size={16} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="fine-print">
        These links open external searches. Prices and availability are not
        imported into DayTripper.
      </p>
    </>
  );
}
