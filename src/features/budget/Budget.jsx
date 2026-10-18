import React, { useState } from "react";
import {
  Plus,
  House,
  Utensils,
  Car,
  Ticket,
  Package,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  SectionHeading,
  Button,
  Tag,
  Empty,
  Modal,
  Field,
  ErrorMessage,
} from "../../components/UI";
import { money, formData } from "../../lib/format";
import { api } from "../../lib/api";
export const categoryMeta = [
  { name: "Stays", icon: House, color: "sand" },
  { name: "Food & drinks", icon: Utensils, color: "peach" },
  { name: "Transport", icon: Car, color: "blue" },
  { name: "Experiences", icon: Ticket, color: "sage" },
  { name: "Other", icon: Package, color: "lilac" },
];
const linkExamples = {
  Stays: {label: "Accommodation link", example: "https://www.airbnb.com/rooms/…", hint: "Airbnb, Booking.com, Expedia, Vrbo, or Hotels.com", title: "A cottage by the water"},
  Transport: {label: "Transportation link", example: "https://www.uber.com/…", hint: "Uber, Lyft, Amtrak, or Expedia", title: "Uber from the airport"},
  "Food & drinks": {label: "Food or restaurant link", example: "https://www.ubereats.com/store/…", hint: "Uber Eats, DoorDash, or OpenTable", title: "Dinner delivery from DoorDash"},
  Experiences: {label: "Activity or ticket link", example: "https://www.viator.com/tours/…", hint: "Viator, GetYourGuide, or Eventbrite", title: "Kayaking tour"},
  Other: {label: "Reference link", example: "https://…", hint: "Save any HTTPS link; unsupported sites use manual entry.", title: "Supplies for the weekend"},
};
export function ItemForm({
  trip,
  item: existing,
  initialDraft,
  category = "Stays",
  onClose,
  onSaved,
}) {
  const [draft, setDraft] = useState(initialDraft || null),
    [draftMessage, setDraftMessage] = useState("");
  const item = existing || draft;
  const [selectedCategory, setSelectedCategory] = useState(item?.category || category);
  const linkExample = linkExamples[selectedCategory] || linkExamples.Other;
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title={existing ? "Edit the plan" : "Add to your plan"}
      subtitle="Add an estimate now. Confirm the details as you go."
      onClose={onClose}
    >
      {!existing && !initialDraft && (
        <form
          className="booking-import"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const data = await api(
                `/trips/${trip.id}/booking/draft`,
                "POST",
                {...formData(e), category: selectedCategory},
              );
              setDraft(data.draft);
              setDraftMessage(data.warning);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={linkExample.label} hint={linkExample.hint}>
            <input
              name="url"
              type="url"
              required
              placeholder={linkExample.example}
            />
          </Field>
          <Button variant="secondary" type="submit" busy={busy}>
            Autofill a draft
          </Button>
          {draftMessage && <p className="info-note">{draftMessage}</p>}
        </form>
      )}
      <form
        key={draft ? JSON.stringify(draft) : "manual"}
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            onSaved(
              await api(
                `/trips/${trip.id}/items${existing ? "/" + existing.id : ""}`,
                existing ? "PATCH" : "POST",
                {...formData(e), ...(item?.coordinates && formData(e).location === item.location ? {coordinates: item.coordinates} : {})},
              ),
            );
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="What are we planning?">
          <input
            name="title"
            required
            maxLength={100}
            defaultValue={item?.title}
            placeholder={linkExample.title}
            autoFocus
          />
        </Field>
        <div className="form-row">
          <Field label="Category">
            <select name="category" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              {categoryMeta.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Price type">
            <select
              name="priceType"
              defaultValue={item?.priceType || "estimated"}
            >
              <option value="estimated">Estimate</option>
              <option value="quoted">Quoted price</option>
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Price per unit ($)">
            <input
              name="price"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
              defaultValue={
                item
                  ? item.priceCents != null
                    ? item.priceCents / 100
                    : item.price
                  : ""
              }
              placeholder="600"
            />
          </Field>
          <Field
            label="Quantity"
            hint="Nights, meals, tickets, or 1 for a total"
          >
            <input
              name="quantity"
              type="number"
              min="1"
              max="1000"
              step="1"
              required
              defaultValue={item?.quantity || 1}
            />
          </Field>
        </div>
        <details open={initialDraft ? true : undefined}>
          <summary>Schedule, location & booking details</summary>
          <div className="form-stack detail-fields">
            <div className="form-row">
              <Field label="Date">
                <input
                  type="date"
                  name="date"
                  min={trip.start}
                  max={trip.end}
                  defaultValue={item?.date}
                />
              </Field>
              <Field label="Time">
                <input type="time" name="time" defaultValue={item?.time} />
              </Field>
            </div>
            <Field label="Location">
              <input
                name="location"
                maxLength={150}
                defaultValue={item?.location}
                placeholder="Address or meeting point"
              />
            </Field>
            <Field label="Booking or reference link">
              <input
                type="url"
                name="url"
                maxLength={500}
                defaultValue={item?.url}
                placeholder="https://…"
              />
            </Field>
            <Field label="Notes">
              <textarea
                name="notes"
                maxLength={500}
                defaultValue={item?.notes}
                placeholder="Anything the group should know"
              />
            </Field>
          </div>
        </details>
        <ErrorMessage error={error} />
        <Button type="submit" busy={busy}>
          {existing ? "Save changes" : "Add to the plan"}
          <Plus size={17} />
        </Button>
      </form>
    </Modal>
  );
}
export function Budget({ trip, onUpdate, onAdd, onEdit, notify }) {
  const [filter, setFilter] = useState("All"),
    [busy, setBusy] = useState(""),
    [removing, setRemoving] = useState(null);
  const items = trip.items.filter(
    (i) => filter === "All" || i.category === filter,
  );
  async function change(item, action) {
    setBusy(item.id);
    try {
      onUpdate(
        await api(
          `/trips/${trip.id}/items/${item.id}`,
          action === "delete" ? "DELETE" : "PATCH",
          action === "delete"
            ? undefined
            : { status: item.status === "verified" ? "proposed" : "verified" },
        ),
      );
      if (action === "delete") setRemoving(null);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <SectionHeading
        title="Plan & budget"
        description="Every idea, one shared plan. Estimates split equally as your group grows."
        action={
          <Button onClick={() => onAdd()}>
            <Plus size={17} />
            Add an item
          </Button>
        }
      />
      <div className="category-grid">
        {categoryMeta.map(({ name, icon: Icon, color }) => {
          const sum = trip.items
            .filter((i) => i.category === name)
            .reduce((s, i) => s + i.priceCents * i.quantity, 0);
          return (
            <button
              className={"category-card " + (filter === name ? "active" : "")}
              onClick={() => setFilter(filter === name ? "All" : name)}
              key={name}
            >
              <span className={"category-icon " + color}>
                <Icon size={20} />
              </span>
              <span>{name}</span>
              <strong>{money(sum)}</strong>
              <small>
                {trip.items.filter((i) => i.category === name).length}{" "}
                {trip.items.filter((i) => i.category === name).length === 1
                  ? "item"
                  : "items"}
              </small>
            </button>
          );
        })}
      </div>
      <div className="panel">
        <div className="panel-heading">
          <h3>
            {filter === "All" ? "Everything on the list" : filter}
            <span className="count">{items.length}</span>
          </h3>
          {filter !== "All" && (
            <button className="text-link" onClick={() => setFilter("All")}>
              Show all
            </button>
          )}
          <Tag>USD · equal split</Tag>
        </div>
        {items.length ? (
          <div className="item-list">
            {items.map((item) => {
              const meta = categoryMeta.find((c) => c.name === item.category),
                Icon = meta.icon;
              return (
                <div className="budget-item" key={item.id}>
                  <span className={"category-icon " + meta.color}>
                    <Icon size={20} />
                  </span>
                  <div className="item-main">
                    <strong>{item.title}</strong>
                    <div className="item-meta">
                      <span>{item.category}</span>
                      <span>·</span>
                      <span>
                        {item.quantity} × {money(item.priceCents)}
                      </span>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={"Open booking link for " + item.title}
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                    {item.notes && <p className="item-note">{item.notes}</p>}
                  </div>
                  <div className="item-price">
                    <strong>{money(item.priceCents * item.quantity)}</strong>
                    <small>
                      {item.priceType === "quoted" ? "Quoted" : item.status !== "verified" ? "Estimated" : ""}
                    </small>
                  </div>
                  <button
                    disabled={!trip.canEdit || busy === item.id}
                    className={
                      "status-toggle " +
                      (item.status === "verified" ? "verified" : "")
                    }
                    onClick={() => change(item, "status")}
                    title="Mark booking or task confirmed; this does not confirm payment"
                  >
                    {item.status === "verified" ? <Check size={13} /> : null}
                    {item.status === "verified" ? "Confirmed" : "To confirm"}
                  </button>
                  <button
                    disabled={!trip.canEdit}
                    className="icon-btn"
                    aria-label={"Edit " + item.title}
                    onClick={() => onEdit(item)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    disabled={!trip.canEdit}
                    className="icon-btn danger"
                    aria-label={"Delete " + item.title}
                    onClick={() => setRemoving(item)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            icon={House}
            title="No items yet"
            description="Start with the stay, a meal, or something you can't wait to do."
            action={
              <Button
                variant="secondary"
                onClick={() => onAdd(filter === "All" ? "Stays" : filter)}
              >
                Add your first item <Plus size={16} />
              </Button>
            }
          />
        )}
        <div className="panel-footer">
          <span>
            Trip estimate{" "}
            <small>
              Booking confirmation is separate from payment confirmation.
            </small>
          </span>
          <strong>{money(trip.totals.estimatedCents)}</strong>
        </div>
      </div>
      {removing && (
        <Modal
          title="Remove this item?"
          subtitle={
            removing.title + " will be removed from the budget and itinerary."
          }
          onClose={() => setRemoving(null)}
        >
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button
              variant="danger-solid"
              busy={busy === removing.id}
              onClick={() => change(removing, "delete")}
            >
              Remove item
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
