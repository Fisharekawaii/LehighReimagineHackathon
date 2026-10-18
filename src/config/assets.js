// Decorative scenery, not photographs of the trip's actual destination.
export const vibes = {
  coast: {
    label: "Coastal escape",
    caption: "Salt in the air. Nothing on the clock.",
    image: "coast",
  },
  forest: {
    label: "Forest & Cabin",
    caption: "Slow mornings. Fireside evenings.",
    image: "forest",
  },
  mountain: {
    label: "Mountain adventure",
    caption: "Fresh air. A little higher perspective.",
    image: "mountain",
  },
  city: {
    label: "City break",
    caption: "New streets. Your kind of discoveries.",
    image: "city",
  },
  lake: {
    label: "Lakeside retreat",
    caption: "Still water. Wide-open weekends.",
    image: "lake",
  },
  desert: {
    label: "Desert getaway",
    caption: "Golden horizons. Star-filled nights.",
    image: "desert",
  },
  countryside: {
    label: "Countryside",
    caption: "Take the scenic way. Stay a little longer.",
    image: "countryside",
  },
};
export const themeImages = Object.fromEntries(
  Object.entries(vibes).map(([k, v]) => [k, `/images/${v.image}.jpg`]),
);
