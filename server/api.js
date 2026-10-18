import { searchNearby } from './integrations/discovery.js';
import {
  demoUsers,
  initialState,
  fail,
  clean,
  cents,
  validDate,
  totals,
  newItem,
} from "./logic.js";
import { proposeTripChange } from "./integrations/assistant.js";
import { searchPlaces } from "./integrations/maps.js";
import { authenticate, publicUser } from "./auth.js";
import { previewCalendar } from "./integrations/calendar-import.js";
import { bookingDraft } from "./integrations/booking.js";
import { exportItinerary } from "./integrations/calendar.js";

// Runtime-independent API. Storage contract is documented in docs/ARCHITECTURE.md.
export async function handleApi(request, storage, options = {}) {
  const url = new URL(request.url),
    path = url.pathname,
    method = request.method;
  const json = (data, status = 200, headers = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...headers,
      },
    });
  try {
    if (
      !["GET", "HEAD"].includes(method) &&
      request.headers.get("origin") &&
      request.headers.get("origin") !== url.origin
    )
      fail("Request origin does not match.", 403);
    let body = {};
    if (!["GET", "HEAD"].includes(method)) {
      const raw = await request.text();
      if (raw.length > 350000) fail("Request is too large.", 413);
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        fail("Invalid request.");
      }
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const loaded = await storage.read();
      const db = loaded.state || initialState();
      db.users ||= [];
      let changed = false,
        headers = {};
      const token = request.headers
        .get("cookie")
        ?.split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith("dt_session="))
        ?.slice(11);
      const session = db.sessions.find(
        (s) => s.token === token && s.expires > Date.now(),
      );
      const users = [...db.users.map(publicUser), ...demoUsers];
      const user = users.find((u) => u.id === session?.userId && (options.allowDemo || db.users.some(real=>real.id===u.id)));
      const role = (t) =>
        t.organizer === user?.id
          ? "organizer"
          : t.roles?.[user?.id] || "editor";
      const view = (t) => ({
        ...t,
        code: t.organizer === user?.id ? t.code : undefined,
        invites: t.organizer === user?.id ? t.invites || [] : [],
        role: role(t),
        canEdit: role(t) !== "viewer",
        stops: t.stops || [],
        members: t.members.map((id) => ({
          ...users.find((u) => u.id === id),
          role: id === t.organizer ? "organizer" : t.roles?.[id] || "editor",
        })),
        totals: totals(t),
      });
      let result;
      if (
        ["/api/auth/register", "/api/auth/login"].includes(path) &&
        method === "POST"
      ) {
        const u = await authenticate(db, body, path.endsWith("register"));
        if (!u) {
          db.authAttempts.push({
            username: String(body.username).toLowerCase(),
            at: Date.now(),
          });
          if (!(await storage.write(db, loaded.version))) continue;
          return json({ error: "Username or password is incorrect." }, 401);
        }
        const nextToken = crypto.randomUUID() + crypto.randomUUID();
        db.sessions = db.sessions.filter(
          (s) => s.expires > Date.now() && s.token !== token,
        );
        db.sessions.push({
          token: nextToken,
          userId: u.id,
          expires: Date.now() + 604800000,
        });
        headers["Set-Cookie"] =
          `dt_session=${nextToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${url.protocol === "https:" ? "; Secure" : ""}`;
        changed = true;
        result = u;
      } else if (path === "/api/demo-users" && method === "GET")
        result = options.allowDemo ? demoUsers : [];
      else if (path === "/api/demo-login" && method === "POST") {
        if (!options.allowDemo)
          fail("Demo sign-in is disabled. Create an account.", 403);
        const u = demoUsers.find((u) => u.id === body.userId);
        if (!u) fail("Choose a demo profile.");
        const nextToken = crypto.randomUUID() + crypto.randomUUID();
        db.sessions = db.sessions.filter(
          (s) => s.expires > Date.now() && s.token !== token,
        );
        db.sessions.push({
          token: nextToken,
          userId: u.id,
          expires: Date.now() + 7 * 86400000,
        });
        changed = true;
        headers["Set-Cookie"] =
          `dt_session=${nextToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${url.protocol === "https:" ? "; Secure" : ""}`;
        result = u;
      } else {
        if (!user) fail("Sign in to continue.", 401);
        const match = path.match(/^\/api\/trips\/([^/]+)(?:\/(.*))?$/);
        let t;
        if (match) {
          t = db.trips.find(
            (t) => t.id === match[1] && t.members.includes(user.id),
          );
          if (!t) fail("Trip not found.", 404);
        }
        const owner = () => {
          if (t.organizer !== user.id)
            fail("Only the organizer can do this.", 403);
        };
        if (path === "/api/me" && method === "GET") result = user;
        else if (path === "/api/logout" && method === "POST") {
          db.sessions = db.sessions.filter((s) => s.token !== token);
          changed = true;
          headers["Set-Cookie"] =
            "dt_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
          result = { ok: true };
        } else if (path === "/api/trips" && method === "GET")
          result = db.trips
            .filter((t) => t.members.includes(user.id))
            .map(view);
        else if (path === "/api/trips" && method === "POST") {
          const title = clean(body.title, 80),
            destination = clean(body.destination, 100),
            start = body.start,
            end = body.end;
          if (!validDate(start) || !validDate(end) || end < start)
            fail("Choose valid start and end dates.");
          if (!["pool", "planning"].includes(body.mode))
            fail("Choose a trip mode.");
          if (db.trips.length >= 200)
            fail("This demo has reached its trip limit.");
          t = {
            id: crypto.randomUUID(),
            title,
            destination,
            start,
            end,
            mode: body.mode,
            theme: [
              "coast",
              "forest",
              "city",
              "mountain",
              "lake",
              "desert",
              "countryside",
            ].includes(body.theme)
              ? body.theme
              : "coast",
            organizer: user.id,
            members: [user.id],
            roles: {},
            invites: [],
            stops: [],
            code: crypto
              .randomUUID()
              .replaceAll("-", "")
              .slice(0, 12)
              .toUpperCase(),
            items: [],
            payments: [],
            createdAt: new Date().toISOString(),
          };
          db.trips.push(t);
          changed = true;
          result = view(t);
        } else if (path === "/api/join" && method === "POST") {
          const code = clean(body.code, 40).toUpperCase().replace(/[\s-]/g, "");
          t = db.trips.find(
            (t) => t.code === code || t.invites?.some((i) => i.code === code),
          );
          if (!t) fail("That invite code was not found.", 404);
          if (!t.members.includes(user.id)) {
            t.members.push(user.id);
            t.roles ||= {};
            t.roles[user.id] =
              t.invites?.find((i) => i.code === code)?.role || "viewer";
            changed = true;
          }
          result = view(t);
        } else if (t) {
          const sub = match[2] || "";
          if (
            method !== "GET" &&
            (sub === "items" ||
              sub.startsWith("items/") ||
              sub === "assistant/apply" ||
              sub.startsWith("stops") ||
              sub === "calendar/import" ||
              sub === "booking/draft" ||
              sub === "theme") &&
            role(t) === "viewer"
          )
            fail(
              "This trip is view-only. Ask the organizer for edit access.",
              403,
            );
          if (!sub && method === "GET") result = view(t);
          else if (!sub && method === "DELETE") {
            owner();
            db.trips = db.trips.filter(trip => trip.id !== t.id);
            changed = true;
            result = {ok: true, id: t.id};
          } else if (sub === "invites" && method === "POST") {
            owner();
            if (!["viewer", "editor"].includes(body.role))
              fail("Choose viewer or editor.");
            t.invites ||= [];
            if (t.invites.length >= 30) fail("Invite limit reached.");
            t.invites.push({
              code: crypto
                .randomUUID()
                .replaceAll("-", "")
                .slice(0, 12)
                .toUpperCase(),
              role: body.role,
            });
            changed = true;
            result = view(t);
          } else if (sub.startsWith("members/") && method === "PATCH") {
            owner();
            const id = sub.slice(8);
            if (
              id === t.organizer ||
              !t.members.includes(id) ||
              !["viewer", "editor"].includes(body.role)
            )
              fail("Choose a member and permission.");
            t.roles ||= {};
            t.roles[id] = body.role;
            changed = true;
            result = view(t);
          } else if (sub === "theme" && method === "PATCH") {
            if (
              ![
                "coast",
                "forest",
                "city",
                "mountain",
                "lake",
                "desert",
                "countryside",
              ].includes(body.theme)
            )
              fail("Choose a trip vibe.");
            t.theme = body.theme;
            changed = true;
            result = view(t);
          } else if (sub === "discovery/search" && method === "POST") {
            result = await searchNearby(body, t);
          } else if (sub === "places/search" && method === "POST") {
            result = await searchPlaces(body.query);
          } else if (sub === "booking/draft" && method === "POST") {
            result = await bookingDraft(body.url, fetch, body.category || "Stays");
          } else if (sub === "calendar/preview" && method === "POST") {
            result = previewCalendar(body.content, body.timezone, t);
          } else if (sub === "calendar/import" && method === "POST") {
            const preview = previewCalendar(body.content, body.timezone, t);
            if (!Array.isArray(body.selected)) fail("Select events to import.");
            t.stops ||= [];
            let count = 0;
            for (const event of preview.events.filter((e) =>
              body.selected.includes(e.sourceId),
            )) {
              if (!t.stops.some((s) => s.sourceId === event.sourceId)) {
                t.stops.push({ ...event, id: crypto.randomUUID() });
                count++;
              }
            }
            if (t.stops.length > 300)
              fail("This trip supports up to 300 imported stops.");
            changed = count > 0;
            result = view(t);
          } else if (sub.startsWith("stops/") && method === "DELETE") {
            t.stops = (t.stops || []).filter((s) => s.id !== sub.slice(6));
            changed = true;
            result = view(t);
          } else if (sub.startsWith("locations/") && method === "PATCH") {
            if (role(t) === "viewer") fail("Edit access required.", 403);
            const item = [...t.items, ...(t.stops || [])].find(
              (i) => i.id === sub.slice(10),
            );
            if (!item) fail("Stop not found.", 404);
            if("location" in body){
              const location=clean(body.location,150);
              if(location!==item.location && !("lat" in body)) delete item.coordinates;
              item.location=location;
            }
            if("lat" in body || "lng" in body){
              const lat=Number(body.lat),lng=Number(body.lng);
              if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)fail("Choose a valid place from the results.");
              item.coordinates={lat,lng};
            }
            if("travelMode" in body){
              if(!["car","walk","airplane","ferry"].includes(body.travelMode))fail("Choose a travel mode.");
              item.travelMode=body.travelMode;
            }
            if("travelMinutes" in body){const mins=Number(body.travelMinutes);if(!Number.isFinite(mins)||mins<0||mins>100000)fail("Enter valid travel minutes.");item.travelMinutes=mins||null;}
            changed = true;
            result = view(t);
          } else if (sub === "calendar/export" && method === "POST") {
            const exported = await exportItinerary({
              trip: { ...t, items: [...t.items, ...(t.stops || [])] },
              timezone: body.timezone,
              durationMinutes: body.durationMinutes ?? 60,
            });
            return new Response(exported.content, {
              headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": `attachment; filename="${exported.filename}"`,
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
              },
            });
          } else if (sub === "items" && method === "POST") {
            if (t.items.length >= 300)
              fail("This trip has reached its item limit.");
            t.items.push(newItem(body, t));
            changed = true;
            result = view(t);
          } else if (
            sub.startsWith("items/") &&
            ["PATCH", "DELETE"].includes(method)
          ) {
            const item = t.items.find((i) => i.id === sub.slice(6));
            if (!item) fail("Item not found.", 404);
            if (method === "DELETE")
              t.items = t.items.filter((i) => i.id !== item.id);
            else if ("status" in body) {
              if (!["proposed", "verified"].includes(body.status))
                fail("Choose a valid status.");
              item.status = body.status;
            } else {
              const next = newItem(body, t);
              if (next.location !== item.location && !next.coordinates) delete item.coordinates;
              Object.assign(item, { ...next, id: item.id, status: item.status });
            }
            changed = true;
            result = view(t);
          } else if (sub === "payments" && method === "POST") {
            if (t.mode !== "pool")
              fail("Planning-only trips do not collect contributions.");
            const amountCents = cents(body.amount);
            if (amountCents <= 0) fail("Enter a positive amount.");
            if (t.payments.length >= 1000)
              fail("This demo trip has reached its payment limit.");
            t.payments.push({
              id: crypto.randomUUID(),
              userId: user.id,
              amountCents,
              note: clean(body.note, 160, true),
              method: clean(body.method, 80, true) || "External payment",
              purpose: clean(body.purpose, 240, true) || "Trip contribution",
              status: "pending",
              createdAt: new Date().toISOString(),
            });
            changed = true;
            result = view(t);
          } else if (sub.startsWith("payments/") && method === "PATCH") {
            owner();
            const p = t.payments.find((p) => p.id === sub.slice(9));
            if (!p) fail("Payment not found.", 404);
            if (p.status !== "pending")
              fail("This payment has already been reviewed.", 409);
            if (!["confirmed", "rejected"].includes(body.status))
              fail("Choose confirm or reject.");
            p.status = body.status;
            p.reviewedAt = new Date().toISOString();
            p.reviewedBy = user.id;
            changed = true;
            result = view(t);
          } else if (sub === "assistant" && method === "POST")
            result = {
              proposal: await proposeTripChange(clean(body.text, 500), t),
              provider: "demo-command-parser",
            };
          else if (sub === "assistant/apply" && method === "POST") {
            const proposal = await proposeTripChange(clean(body.text, 500), t);
            if (proposal.type === "add") {
              if (t.items.length >= 300)
                fail("This trip has reached its item limit.");
              t.items.push(newItem(proposal, t));
            } else {
              const item = t.items.find((i) => i.id === proposal.id);
              item.priceCents = cents(proposal.price);
              item.status = "proposed";
            }
            changed = true;
            result = view(t);
          } else fail("Endpoint not found.", 404);
        } else fail("Endpoint not found.", 404);
      }
      if (changed && !(await storage.write(db, loaded.version))) continue;
      return json(result, 200, headers);
    }
    fail("The trip changed while saving. Please try again.", 409);
  } catch (e) {
    return json(
      {
        error: e.status ? e.message : "Something went wrong. Please try again.",
      },
      e.status || 500,
    );
  }
}
