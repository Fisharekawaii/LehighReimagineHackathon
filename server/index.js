import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./api.js";
import { initialState } from "./logic.js";
const app = express(),
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.env.DATA_DIR || path.join(root, ".data");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "daytripper.json");
let record = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : { state: initialState(), version: 0 };
// TODO(DATA-01): Replace this single-process file adapter for scaled deployments.
const storage = {
  async read() {
    return structuredClone(record);
  },
  async write(state, version) {
    if (record.version !== version) return false;
    const next = { state, version: version + 1 };
    fs.writeFileSync(file + ".tmp", JSON.stringify(next));
    fs.renameSync(file + ".tmp", file);
    record = next;
    return true;
  },
};
app.use(
  "/api",
  express.text({ type: "*/*", limit: "32kb" }),
  async (req, res) => {
    try {
      const origin = `${req.protocol}://${req.get("host")}`;
      const request = new Request(origin + req.originalUrl, {
        method: req.method,
        headers: req.headers,
        ...(!["GET", "HEAD"].includes(req.method)
          ? { body: req.body || "" }
          : {}),
      });
      const response = await handleApi(request, storage);
      res.status(response.status);
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.send(await response.text());
    } catch {
      res.status(500).json({ error: "Unable to process request." });
    }
  },
);
app.use(express.static(path.join(root, "dist")));
app.get("/{*splat}", (req, res) =>
  res.sendFile(path.join(root, "dist", "index.html")),
);
app.listen(process.env.PORT || 3001, "0.0.0.0", () =>
  console.log(
    `DayTripper listening on http://localhost:${process.env.PORT || 3001}`,
  ),
);
