import test from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "./api.js";
import { initialState, totals } from "./logic.js";
function fixture() {
  let record = { state: initialState(), version: 0 };
  const storage = {
    async read() {
      return structuredClone(record);
    },
    async write(state, version) {
      if (version !== record.version) return false;
      record = { state, version: version + 1 };
      return true;
    },
  };
  const request = async (path, method = "GET", body, cookie) => {
    const r = await handleApi(
      new Request("https://app.test/api" + path, {
        method,
        headers: {
          ...(cookie ? { cookie } : {}),
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      storage,
      { allowDemo: true },
    );
    return {
      status: r.status,
      data: r.headers.get("content-type")?.includes("text/calendar")
        ? await r.text()
        : await r.json(),
      headers: Object.fromEntries(r.headers),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  };
  return { request, storage };
}
const tripInput = {
  title: "Weekend",
  destination: "Nantucket",
  start: "2026-10-23",
  end: "2026-10-25",
  mode: "pool",
};
test("create, join, equal cents, organizer review, and persistence across reads", async () => {
  const { request } = fixture();
  const a = (await request("/demo-login", "POST", { userId: "diego" })).cookie;
  const b = (await request("/demo-login", "POST", { userId: "alex" })).cookie;
  const c = (await request("/trips", "POST", tripInput, a)).data;
  assert.equal((await request(`/trips/${c.id}`, "GET", null, b)).status, 404);
  await request("/join", "POST", { code: c.code }, b);
  const added = await request(
    `/trips/${c.id}/items`,
    "POST",
    { title: "Stay", category: "Stays", price: "100.01", quantity: 1 },
    a,
  );
  assert.equal(added.data.totals.estimatedCents, 10001);
  assert.deepEqual(
    added.data.totals.shares.map((s) => s.owedCents),
    [5001, 5000],
  );
  const p = await request(
    `/trips/${c.id}/payments`,
    "POST",
    { amount: 50, note: "Sent externally" },
    b,
  );
  assert.equal(p.data.totals.confirmedCents, 0);
  assert.equal(p.data.totals.pendingCents, 5000);
  const pid = p.data.payments[0].id;
  assert.equal(
    (
      await request(
        `/trips/${c.id}/payments/${pid}`,
        "PATCH",
        { status: "confirmed" },
        b,
      )
    ).status,
    403,
  );
  const reviewed = await request(
    `/trips/${c.id}/payments/${pid}`,
    "PATCH",
    { status: "confirmed" },
    a,
  );
  assert.equal(reviewed.data.totals.confirmedCents, 5000);
  assert.equal(reviewed.data.totals.shares[1].remainingCents, 0);
  assert.equal(
    (
      await request(
        `/trips/${c.id}/payments/${pid}`,
        "PATCH",
        { status: "confirmed" },
        a,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request("/trips", "GET", null, b)).data[0].payments[0].status,
    "confirmed",
  );
});
test("planning mode rejects contributions; members can check off bookings", async () => {
  const { request } = fixture();
  const a = (await request("/demo-login", "POST", { userId: "diego" })).cookie;
  const b = (await request("/demo-login", "POST", { userId: "alex" })).cookie;
  const t = (
    await request("/trips", "POST", { ...tripInput, mode: "planning" }, a)
  ).data;
  await request("/join", "POST", { code: t.code }, b);
  await request(`/trips/${t.id}/members/alex`, "PATCH", { role: "editor" }, a);
  const i = (
    await request(
      `/trips/${t.id}/items`,
      "POST",
      {
        title: "Ferry",
        category: "Transport",
        price: 30,
        quantity: 2,
        date: "2026-10-23",
      },
      b,
    )
  ).data.items[0];
  assert.equal(
    (
      await request(
        `/trips/${t.id}/items/${i.id}`,
        "PATCH",
        { status: "verified" },
        b,
      )
    ).data.items[0].status,
    "verified",
  );
  assert.equal(
    (await request(`/trips/${t.id}/payments`, "POST", { amount: 10 }, a))
      .status,
    400,
  );
  assert.equal(
    (await request(`/trips/${t.id}`, "PATCH", { mode: "pool" }, a)).status,
    404,
  );
});
test("input validation, nonmember isolation, and no fabricated assistant result", async () => {
  const { request } = fixture();
  assert.equal((await request("/trips")).status, 401);
  const a = (await request("/demo-login", "POST", { userId: "diego" })).cookie;
  assert.equal(
    (await request("/trips", "POST", { ...tripInput, start: "2026-02-30" }, a))
      .status,
    400,
  );
  const t = (await request("/trips", "POST", tripInput, a)).data;
  for (const price of [-1, "", null, "NaN"])
    assert.equal(
      (
        await request(
          `/trips/${t.id}/items`,
          "POST",
          { title: "X", category: "Stays", price, quantity: 1 },
          a,
        )
      ).status,
      400,
    );
  assert.equal(
    (
      await request(
        `/trips/${t.id}/items`,
        "POST",
        {
          title: "X",
          category: "Stays",
          price: 5,
          quantity: 1,
          date: "2026-10-27",
        },
        a,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        `/trips/${t.id}/items`,
        "POST",
        {
          title: "X",
          category: "Stays",
          price: 5,
          quantity: 1,
          url: "javascript:alert(1)",
        },
        a,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        `/trips/${t.id}/assistant`,
        "POST",
        { text: "Find flights" },
        a,
      )
    ).status,
    400,
  );
  const proposal = await request(
    `/trips/${t.id}/assistant`,
    "POST",
    { text: "Add cottage for $600 x 2 to Stays" },
    a,
  );
  assert.equal(proposal.data.provider, "demo-command-parser");
  assert.equal(
    (await request(`/trips/${t.id}`, "GET", null, a)).data.items.length,
    0,
  );
  const applied = await request(
    `/trips/${t.id}/assistant/apply`,
    "POST",
    { text: "Add cottage for $600 x 2 to Stays" },
    a,
  );
  assert.equal(applied.data.totals.estimatedCents, 120000);
});
test("concurrent changes retry without losing items", async () => {
  const { request } = fixture();
  const a = (await request("/demo-login", "POST", { userId: "diego" })).cookie;
  const t = (await request("/trips", "POST", tripInput, a)).data;
  await Promise.all(
    [1, 2, 3].map((n) =>
      request(
        `/trips/${t.id}/items`,
        "POST",
        { title: "Item " + n, category: "Other", price: n, quantity: 1 },
        a,
      ),
    ),
  );
  const result = (await request(`/trips/${t.id}`, "GET", null, a)).data;
  assert.equal(result.items.length, 3);
  assert.equal(result.totals.estimatedCents, 600);
});
test("over-contributions are recorded as credit, not negative remaining", () => {
  const result = totals({
    members: ["a", "b"],
    items: [{ priceCents: 1001, quantity: 1 }],
    payments: [{ userId: "a", amountCents: 800, status: "confirmed" }],
  });
  assert.equal(result.shares[0].remainingCents, 0);
  assert.equal(result.shares[0].creditCents, 299);
  assert.equal(
    result.shares.reduce((s, p) => s + p.owedCents, 0),
    1001,
  );
});
test("logout removes only the current session", async () => {
  const { request } = fixture();
  const a = (await request("/demo-login", "POST", { userId: "diego" })).cookie;
  const b = (await request("/demo-login", "POST", { userId: "diego" })).cookie;
  await request("/logout", "POST", {}, a);
  assert.equal((await request("/me", "GET", null, a)).status, 401);
  assert.equal((await request("/me", "GET", null, b)).status, 200);
});

test("calendar downloads enforce membership, omit payments, and do not mutate trips", async () => {
  const { request, storage } = fixture();
  const a = (await request("/demo-login", "POST", { userId: "diego" })).cookie;
  const b = (await request("/demo-login", "POST", { userId: "alex" })).cookie;
  const t = (await request("/trips", "POST", tripInput, a)).data;
  const path = `/trips/${t.id}/calendar/export`;
  const settings = { timezone: "America/New_York", durationMinutes: 60 };
  assert.equal((await request(path, "POST", settings)).status, 401);
  assert.equal((await request(path, "POST", settings, b)).status, 404);
  assert.equal((await request(path, "POST", settings, a)).status, 400);
  await request(
    `/trips/${t.id}/items`,
    "POST",
    {
      title: "Ferry",
      category: "Transport",
      price: 45,
      quantity: 1,
      date: "2026-10-23",
      time: "10:00",
    },
    a,
  );
  await request(
    `/trips/${t.id}/payments`,
    "POST",
    { amount: 45, note: "PRIVATE_PAYMENT_NOTE" },
    a,
  );
  const before = await storage.read();
  const response = await request(path, "POST", settings, a);
  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /text\/calendar/);
  assert.match(
    response.headers["content-disposition"],
    /attachment; filename="Weekend-itinerary.ics"/,
  );
  assert.match(response.data, /SUMMARY:Ferry/);
  assert.match(response.data, /DTSTART:20261023T140000Z/);
  assert.doesNotMatch(response.data, /PRIVATE_PAYMENT_NOTE/);
  assert.deepEqual(await storage.read(), before);
  await request("/join", "POST", { code: t.code }, b);
  assert.equal((await request(path, "POST", settings, b)).status, 200);
  assert.equal(
    (await request(path, "POST", { ...settings, timezone: "invalid" }, a))
      .status,
    400,
  );
});
