import { clean, fail } from "./logic.js";
const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  initials: u.initials,
  color: u.color,
});
export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: new TextEncoder().encode(salt),
          iterations: 100000,
        },
        key,
        256,
      ),
    ),
  );
}
export async function authenticate(db, body, register) {
  const username = clean(body.username, 40).toLowerCase();
  if (!/^[a-z0-9_.-]{3,40}$/.test(username))
    fail(
      "Use 3–40 letters, numbers, dots, underscores or hyphens for your username.",
    );
  const password = clean(body.password, 128);
  if (password.length < 8) fail("Use a password with at least 8 characters.");
  let user = db.users.find((u) => u.username === username);
  db.authAttempts = (db.authAttempts || []).filter(
    (a) => a.at > Date.now() - 900000,
  );
  if (db.authAttempts.filter((a) => a.username === username).length >= 10)
    fail("Too many attempts. Try again in 15 minutes.", 429);
  if (register) {
    if(db.users.length>=1000) fail("Account limit reached for this preview.");
    if (user) fail("That username is already taken.", 409);
    const name = clean(body.name, 80),
      salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    user = {
      id: crypto.randomUUID(),
      username,
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase(),
      color: "#dcebd9",
      salt,
      passwordHash: await passwordHash(password, salt),
    };
    db.users.push(user);
  } else {
    const hash = await passwordHash(
      password,
      user?.salt || "unknown-user-dummy-salt",
    );
    let diff = 0;
    const expected = user?.passwordHash || "0".repeat(64);
    for (let i = 0; i < 64; i++)
      diff |= hash.charCodeAt(i) ^ expected.charCodeAt(i);
    if (!user || diff) return null;
  }
  db.authAttempts = db.authAttempts.filter((a) => a.username !== username);
  return publicUser(user);
}
