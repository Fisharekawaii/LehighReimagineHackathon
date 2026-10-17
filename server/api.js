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
import { exportItinerary } from "./integrations/calendar.js";

// Runtime-independent API. Storage contract is documented in docs/ARCHITECTURE.md.
export async function handleApi(request, storage) {
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
      if (raw.length > 32000) fail("Request is too large.", 413);
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        fail("Invalid request.");
      }
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const loaded = await storage.read();
      const db = loaded.state || initialState();
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
      const user = demoUsers.find((u) => u.id === session?.userId);
      const view = (t) => ({
        ...t,
        members: t.members.map((id) => demoUsers.find((u) => u.id === id)),
        totals: totals(t),
      });
      let result;
      if (path === "/api/demo-users" && method === "GET") result = demoUsers;
      else if (path === "/api/demo-login" && method === "POST") {
        // TODO(AUTH-01): Replace fixed demo identities with a real identity provider.
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
        if (!user) fail("Choose a demo profile to continue.", 401);
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
            fail("Only the organizer can confirm payments.", 403);
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
            theme: ["coast", "forest", "city"].includes(body.theme)
              ? body.theme
              : "coast",
            organizer: user.id,
            members: [user.id],
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
          t = db.trips.find((t) => t.code === code);
          if (!t) fail("That invite code was not found.", 404);
          if (!t.members.includes(user.id)) {
            t.members.push(user.id);
            changed = true;
          }
          result = view(t);
        } else if (t) {
          const sub = match[2] || "";
          if (!sub && method === "GET") result = view(t);
          else if (sub === "calendar/export" && method === "POST") {
            const exported = await exportItinerary({
              trip: t,
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
              Object.assign(item, { ...next, id: item.id });
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
              note: clean(body.note, 160, true) || "External payment",
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
