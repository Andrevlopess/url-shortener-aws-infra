import express, { type Request, type Response } from "express";
import { Pool } from "pg";
import { customAlphabet } from "nanoid";

const app = express();
app.use(express.json());

const pool = new Pool({
  max: 10,
  ssl: {
    rejectUnauthorized: false,
  },
}); // reads PG* env vars

const makeCode = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 7);

app.get("/health", (_req: Request, res: Response) =>
  res.status(200).send({
    message: "Running on v1",
  }),
); // ALB health check

app.post("/api/links", async (req: Request, res: Response) => {
  const { url } = req.body;
  try {
    new URL(url); // basic validation
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }
  const code = makeCode();
  await pool.query("INSERT INTO links (code, target_url) VALUES ($1, $2)", [code, url]);
  return res.status(201).json({ code });
});

app.get("/:code", async (req: Request, res: Response) => {
  const { rows } = await pool.query("SELECT id, target_url FROM links WHERE code = $1", [req.params.code]);
  if (!rows[0]) return res.sendStatus(404);

  // fire-and-forget click logging so the redirect stays fast
  pool
    .query("INSERT INTO clicks (link_id, referrer, user_agent) VALUES ($1, $2, $3)", [
      rows[0].id,
      req.get("referer"),
      req.get("user-agent"),
    ])
    .catch(console.error);

  return res.redirect(302, rows[0].target_url);
});

app.listen(3000);
