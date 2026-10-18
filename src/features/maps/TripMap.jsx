import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, ArrowUpRight } from "lucide-react";
import { Button, Field, ErrorMessage, Tag } from "../../components/UI";
import { api } from "../../lib/api";
import { estimateTravel, duration } from "./travel";
import "leaflet/dist/leaflet.css";
export default function TripMap({ trip, stops, onUpdate }) {
  const canvas = useRef(null),
    map = useRef(null),
    layer = useRef(null),
    leaflet = useRef(null),
    lastFramedStop = useRef(null);
  const [selected, setSelected] = useState(0),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [results, setResults] = useState([]),
    [busy, setBusy] = useState(false),
    [tilesFailed, setTilesFailed] = useState(false);
  const index = Math.min(selected, Math.max(0, stops.length - 1)),
    stop = stops[index],
    previous = stops[index - 1];
  useEffect(() => {
    let active = true;
    import("leaflet").then((mod) => {
      if (!active) return;
      const L = mod.default;
      leaflet.current = L;
      map.current = L.map(canvas.current, {
        keyboard: false,
        // flyTo handles camera motion; disable CSS zoom timers that can outlive unmount.
        zoomAnimation: false,
        scrollWheelZoom: false,
      }).setView([25, -30], 2);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      })
        .on("tileerror", () => setTilesFailed(true))
        .addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
      setReady(true);
    });
    return () => {
      active = false;
      map.current?.remove();
      map.current = null;
    };
  }, []);
  const markerSignature = JSON.stringify(stops.map(s => [s.id, s.title, s.coordinates]));
  useEffect(() => {
    if (!ready || !map.current) return;
    const L = leaflet.current;
    layer.current.clearLayers();
    // Straight dotted legs show itinerary order, not a road or ferry route.
    stops.forEach((s,i)=>{
      const prev=stops[i-1];
      if(!s.coordinates || !prev?.coordinates)return;
      L.polyline([[prev.coordinates.lat,prev.coordinates.lng],[s.coordinates.lat,s.coordinates.lng]],{
        color:i===index?"#cf8657":"#52796d",weight:i===index?3:2.5,
        opacity:i===index?.95:.65,dashArray:"1 9",lineCap:"round",interactive:false,
      }).addTo(layer.current);
    });
    stops.forEach((s, i) => {
      if (!s.coordinates) return;
      const marker = L.marker([s.coordinates.lat, s.coordinates.lng], {
        title: s.title,
        icon: L.divIcon({
          className: "trip-pin-wrapper",
          html: `<span class="trip-pin ${i === index ? "selected" : ""}"><b>${i + 1}</b></span>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        }),
      })
        .on("click", () => setSelected(i))
        .addTo(layer.current);
      const label=document.createElement("span");label.textContent=s.title;marker.bindTooltip(label);
    });
  }, [ready, markerSignature, index]);
  const pinSignature=JSON.stringify(stops.map(s=>s.coordinates||null));
  useEffect(()=>{
    if(!ready || !map.current)return;
    const L=leaflet.current, m=map.current;
    const pins=JSON.parse(pinSignature).filter(Boolean);
    if(!pins.length)return;
    const switching=lastFramedStop.current!==null && lastFramedStop.current!==stop?.id;
    lastFramedStop.current=stop?.id || null;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame=(animate=false)=>{
      m.invalidateSize();
      if(!stop?.coordinates){m.fitBounds(pins.map(p=>[p.lat,p.lng]),{padding:[48,48],maxZoom:13});return;}
      const center=L.latLng(stop.coordinates.lat,stop.coordinates.lng);
      const origin=m.project(center,0);
      let dx=0,dy=0;
      for(const p of pins){const point=m.project([p.lat,p.lng],0);dx=Math.max(dx,Math.abs(point.x-origin.x));dy=Math.max(dy,Math.abs(point.y-origin.y));}
      if(dx===0&&dy===0){m.stop();if(animate&&!reduced)m.flyTo(center,13,{duration:.85});else m.setView(center,13);return;}
      // Symmetric projected bounds keep the chosen stop centered AND every pin visible.
      const bounds=L.latLngBounds(m.unproject(L.point(origin.x-dx,origin.y-dy),0),m.unproject(L.point(origin.x+dx,origin.y+dy),0));
      const zoom=Math.min(13,m.getBoundsZoom(bounds,false,L.point(100,100)));
      m.stop();
      if(animate&&!reduced)m.flyTo(center,zoom,{duration:1.05,easeLinearity:.25});
      else m.setView(center,zoom,{animate:false});
    };
    frame(switching);
    let width=canvas.current.clientWidth,height=canvas.current.clientHeight;
    const observer=new ResizeObserver(()=>{if(!canvas.current || map.current!==m)return;const w=canvas.current.clientWidth,h=canvas.current.clientHeight;if(w!==width||h!==height){width=w;height=h;frame(false);}});observer.observe(canvas.current);
    return()=>{observer.disconnect();if(map.current===m)m.stop();};
  },[ready,pinSignature,index]);
  useEffect(() => {
    setResults([]);
    setError("");
  }, [stop?.id]);
  const estimated = estimateTravel(
    previous?.coordinates,
    stop?.coordinates,
    stop?.travelMode,
  );
  const mins = stop?.travelMinutes || estimated?.minutes;
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget));
      onUpdate(
        await api(`/trips/${trip.id}/locations/${stop.id}`, "PATCH", body),
      );
      setResults([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="route-card"
      tabIndex={0}
      aria-label="Itinerary map. Use left and right arrow keys to select stops."
      onKeyDown={(e) => {
        if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          setSelected(
            Math.max(
              0,
              Math.min(
                stops.length - 1,
                index + (e.key === "ArrowRight" ? 1 : -1),
              ),
            ),
          );
        }
      }}
    >
      <div className="route-heading">
        <span className="eyebrow">THE SCENIC ROUTE</span>
        <Tag>{stops.filter((s) => s.coordinates).length} saved pins</Tag>
      </div>
      <div ref={canvas} className="live-map" />
      {tilesFailed && (
        <p className="fine-print">
          Map tiles are unavailable. Saved locations and directions still work
          below.
        </p>
      )}
      <div className="route-info" aria-live="polite">
        <div className="route-nav">
          <Button
            variant="secondary"
            aria-label="Previous stop"
            disabled={index === 0}
            onClick={() => setSelected(index - 1)}
          >
            <ChevronLeft size={18} />
          </Button>
          <span>
            {stops.length
              ? `${index + 1} / ${stops.length}`
              : "Your route starts here"}
          </span>
          <Button
            variant="secondary"
            aria-label="Next stop"
            disabled={index >= stops.length - 1}
            onClick={() => setSelected(index + 1)}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
        {stop ? (
          <>
            <h3>{stop.title}</h3>
            <p>
              <MapPin size={14} /> {stop.location || "Location to be decided"}
            </p>
            <p className="fine-print">
              {stop.date || "Unscheduled"} · {stop.time || "Anytime"}
            </p>
            {stop.notes && <p>{stop.notes}</p>}
            {!stop.coordinates && (
              <p className="info-note">
                Add an address below, then choose a matching place to pin this stop.
              </p>
            )}
            {previous && (
              <div className="travel-estimate">
                <strong>
                  {mins
                    ? `${duration(mins)} · ${stop.travelMode || "car"}`
                    : "Add both pins to estimate travel"}
                </strong>
                <small>
                  From {previous.title}.{" "}
                  {stop.travelMinutes
                    ? "Manually entered estimate."
                    : "Rough distance-based estimate; no live routes, traffic or schedules."}
                </small>
                {["airplane", "ferry"].includes(stop.travelMode) && (
                  <small>
                    Includes a rough waiting buffer. Confirm actual services and
                    connecting drives separately.
                  </small>
                )}
              </div>
            )}
            <a
              className="text-link"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.coordinates ? `${stop.coordinates.lat},${stop.coordinates.lng}` : stop.location || trip.destination)}${previous?.coordinates ? `&origin=${previous.coordinates.lat},${previous.coordinates.lng}` : ""}`}
            >
              Open directions <ArrowUpRight size={16} />
            </a>
            {trip.canEdit && (
              <details key={stop.id} className="map-place-editor">
                <summary>Address & travel details</summary>
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    try {
                      const address = new FormData(e.currentTarget).get("query").trim();
                      onUpdate(await api(`/trips/${trip.id}/locations/${stop.id}`,"PATCH",{location:address}));
                      const matches = await api(`/trips/${trip.id}/places/search`, "POST", {
                          query: address,
                        });
                      setResults(matches);
                      if(!matches.length)setError("Address saved. No matching places found—try a street address with city and country.");
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Field label="Address or place name">
                    <input
                      name="query"
                      required
                      defaultValue={stop.location || trip.destination}
                      maxLength={150}
                    />
                  </Field>
                  <Button type="submit" variant="secondary" busy={busy}>
                    Save address & find place
                  </Button>
                </form>
                <div className="place-results">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          onUpdate(
                            await api(
                              `/trips/${trip.id}/locations/${stop.id}`,
                              "PATCH",
                              {
                                ...r,
                                location:r.label.slice(0,150),
                                travelMode: stop.travelMode || "car",
                                travelMinutes: stop.travelMinutes || 0,
                              },
                            ),
                          );
                          setResults([]);
                        } catch (e) {
                          setError(e.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <form
                  key={JSON.stringify(stop.coordinates)}
                  className="form-stack"
                  onSubmit={save}
                >
                  <Field label="Travel from previous stop">
                    <select
                      name="travelMode"
                      defaultValue={stop.travelMode || "car"}
                    >
                      <option value="car">Car</option>
                      <option value="walk">Walk</option>
                      <option value="airplane">Airplane</option>
                      <option value="ferry">Ferry</option>
                    </select>
                  </Field>
                  <Field label="Override estimate (minutes, optional)">
                    <input
                      name="travelMinutes"
                      type="number"
                      min="0"
                      max="100000"
                      defaultValue={stop.travelMinutes || ""}
                    />
                  </Field>
                  <Button type="submit" busy={busy}>
                    Save travel details
                  </Button>
                </form>
              </details>
            )}
            <ErrorMessage error={error} />
          </>
        ) : (
          <p>
            Add plans with locations or import a calendar to start your route.
          </p>
        )}
        <p className="fine-print">
          Dotted lines connect consecutive pinned stops in itinerary order.
          Focus this area, then use ← / → to explore stops.
        </p>
      </div>
    </section>
  );
}
