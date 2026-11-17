// migrate.js
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }, // see SSL note below
  connectionTimeoutMillis: 5000
});

const migrate = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS links (
      id          BIGSERIAL PRIMARY KEY,
      code        VARCHAR(10) UNIQUE NOT NULL,
      target_url  TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS clicks (
      id         BIGSERIAL PRIMARY KEY,
      link_id    BIGINT REFERENCES links(id),
      clicked_at TIMESTAMPTZ DEFAULT now(),
      referrer   TEXT,
      user_agent TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_clicks_link_time
      ON clicks (link_id, clicked_at);
  `);
  console.log("Migration done");
  await pool.end();
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
