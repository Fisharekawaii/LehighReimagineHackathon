import { categories, fail, newItem } from "../logic.js";
// TODO(AI-01): Replace this demo parser with a model-backed structured proposal.
// Contract: {type:'add',title,category,price,quantity} or {type:'edit',id,title,price}.
// The API revalidates every proposal. Never let the model confirm a payment.
export async function proposeTripChange(text, trip) {
  const edit = text.match(/^set (.+?) to \$?(\d+(?:\.\d{1,2})?)\.?$/i);
  if (edit) {
    const item = trip.items.find(
      (i) => i.title.toLowerCase() === edit[1].toLowerCase(),
    );
    if (!item) fail("No item with that name. Use the exact item title.");
    return {
      type: "edit",
      id: item.id,
      title: item.title,
      price: Number(edit[2]),
    };
  }
  const add = text.match(
    /^add (.+?) for \$(\d+(?:\.\d{1,2})?)(?:\s*(?:x|×)\s*(\d+))?(?: to (.+))?$/i,
  );
  if (!add)
    fail("Try “Add cottage for $600 x 2 to Stays” or “Set cottage to $550”.");
  const category = categories.find(
    (c) => c.toLowerCase() === (add[4] || "Other").toLowerCase(),
  );
  if (!category)
    fail("Use Stays, Food & drinks, Transport, Experiences, or Other.");
  const p = {
    type: "add",
    title: add[1],
    price: Number(add[2]),
    quantity: Number(add[3] || 1),
    category,
  };
  newItem(p, trip);
  return p;
}
