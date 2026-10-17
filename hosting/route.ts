import { env } from "cloudflare:workers";
import { handleApi } from "../../../server/api.js";
import { initialState } from "../../../server/logic.js";
const storage = {
  async read() {
    const row = await env.DB.prepare(
      "SELECT version, payload FROM app_state WHERE id = ?",
    )
      .bind("demo")
      .first();
    return row
      ? { version: row.version, state: JSON.parse(row.payload as string) }
      : { version: 0, state: initialState() };
  },
  async write(state: unknown, version: number) {
    const payload = JSON.stringify(state);
    const result =
      version === 0
        ? await env.DB.prepare(
            "INSERT OR IGNORE INTO app_state (id,version,payload) VALUES (?,1,?)",
          )
            .bind("demo", payload)
            .run()
        : await env.DB.prepare(
            "UPDATE app_state SET payload = ?, version = version + 1 WHERE id = ? AND version = ?",
          )
            .bind(payload, "demo", version)
            .run();
    return result.meta.changes === 1;
  },
};
const handler = (request: Request) => handleApi(request, storage);
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
