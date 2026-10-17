export const categories = [
  "Stays",
  "Food & drinks",
  "Transport",
  "Experiences",
  "Other",
];
export const demoUsers = [
  { id: "diego", name: "Diego Cano", initials: "DC", color: "#dcebd9" },
  { id: "alex", name: "Alex Morgan", initials: "AM", color: "#f4dfca" },
  { id: "jordan", name: "Jordan Lee", initials: "JL", color: "#dfe5f3" },
  { id: "sam", name: "Sam Rivera", initials: "SR", color: "#eddcf0" },
];
export function initialState() {
  return { trips: [], sessions: [] };
}
export function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
export function clean(value, max = 120, optional = false) {
  if (optional && !value) return "";
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail("Please complete all required fields.");
  return value.trim();
}
export function cents(value) {
  if (value === "" || value === null || typeof value === "boolean")
    fail("Enter a valid amount.");
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1000000)
    fail("Enter an amount between $0 and $1,000,000.");
  return Math.round(n * 100);
}
export function validDate(v) {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !isNaN(Date.parse(v)) &&
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v
  );
}
export function totals(t) {
  const estimatedCents = t.items.reduce(
    (s, i) => s + i.priceCents * i.quantity,
    0,
  );
  const confirmedCents = t.payments
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + p.amountCents, 0);
  const pendingCents = t.payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amountCents, 0);
  const n = t.members.length;
  const shares = t.members.map((userId, index) => {
    const owedCents =
      Math.floor(estimatedCents / n) + (index < estimatedCents % n ? 1 : 0);
    const paidCents = t.payments
      .filter((p) => p.userId === userId && p.status === "confirmed")
      .reduce((s, p) => s + p.amountCents, 0);
    return {
      userId,
      owedCents,
      paidCents,
      remainingCents: Math.max(0, owedCents - paidCents),
      creditCents: Math.max(0, paidCents - owedCents),
    };
  });
  return {
    estimatedCents,
    confirmedCents,
    pendingCents,
    perPersonCents: Math.ceil(estimatedCents / n),
    shares,
  };
}
export function newItem(body, trip) {
  const title = clean(body.title, 100),
    category = clean(body.category, 40),
    quantity = Number(body.quantity ?? 1);
  if (
    !categories.includes(category) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 1000
  )
    fail("Choose a category and a whole quantity from 1 to 1,000.");
  const date = clean(body.date, 10, true),
    time = clean(body.time, 5, true),
    url = clean(body.url, 500, true);
  if (date && (!validDate(date) || date < trip.start || date > trip.end))
    fail("Choose an itinerary date within this trip.");
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    fail("Choose a valid time.");
  if (url) {
    try {
      if (!["http:", "https:"].includes(new URL(url).protocol))
        fail("Use an http or https link.");
    } catch {
      fail("Use a valid website link.");
    }
  }
  return {
    id: crypto.randomUUID(),
    title,
    category,
    priceCents: cents(body.price),
    quantity,
    date,
    time,
    url,
    location: clean(body.location, 150, true),
    notes: clean(body.notes, 500, true),
    status: "proposed",
    priceType: body.priceType === "quoted" ? "quoted" : "estimated",
  };
}
