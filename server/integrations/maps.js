import { clean, fail } from "../logic.js";
// MAPS-02: Replace the public geocoder with a provisioned service before scale.
// Explicit search only; no autocomplete. Single runtime queue and bounded cache.
let queue = Promise.resolve(),
  last = 0;
const cache = new Map();
export async function searchPlaces(query) {
  const q = clean(query, 150);
  if (cache.has(q)) return cache.get(q);
  const task = queue
    .catch(() => {})
    .then(async () => {
      const delay = Math.max(0, 1100 - (Date.now() - last));
      if (delay) await new Promise((r) => setTimeout(r, delay));
      last = Date.now();
      const response = await fetch(
        `https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(q)}`,
        {
          headers: {
            "User-Agent":
              "DayTripperHackathon/0.2 (https://github.com/Fisharekawaii/LehighReimagineHackathon)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok)
        fail(
          "Address saved. Location search is unavailable right now. Try finding the place again shortly.",
          503,
        );
      const data = (await response.json()).features.map((f) => ({
        label: [
          f.properties.name,
          f.properties.street,
          f.properties.city,
          f.properties.state,
          f.properties.country,
        ]
          .filter(Boolean)
          .join(", "),
        lat: Number(f.geometry.coordinates[1]),
        lng: Number(f.geometry.coordinates[0]),
      }));
      if (cache.size > 500) cache.clear();
      cache.set(q, data);
      return data;
    });
  queue = task;
  try { return await task; } catch { fail("Address saved. Location search is unavailable right now. Try finding the place again shortly.",503); }
}
