export const money = (cents = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
export const dateLabel = (date, options = { month: "short", day: "numeric" }) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-US", options);
export const dateRange = (t) =>
  `${dateLabel(t.start)} – ${dateLabel(t.end, { month: "short", day: "numeric", year: "numeric" })}`;
export const firstName = (u) => u?.name?.split(" ")[0] || "Traveler";
export const formData = (e) =>
  Object.fromEntries(new FormData(e.currentTarget));
