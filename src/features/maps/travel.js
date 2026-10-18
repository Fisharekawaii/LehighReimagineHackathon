export function estimateTravel(a, b, mode = "car") {
  if (!a || !b) return null;
  const rad = (x) => (x * Math.PI) / 180;
  const dlat = rad(b.lat - a.lat),
    dlng = rad(b.lng - a.lng);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlng / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  const minutes =
    mode === "airplane"
      ? (km / 750) * 60 + 150
      : mode === "ferry"
        ? (km / 30) * 60 + 45
        : mode === "walk"
          ? ((km * 1.2) / 4.5) * 60
          : ((km * 1.3) / 55) * 60;
  return { km: Math.round(km), minutes: Math.max(1, Math.round(minutes)) };
}
export const duration = (m) =>
  m >= 60
    ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`
    : `${Math.round(m)} min`;
