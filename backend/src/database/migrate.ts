import { readFile } from "node:fs/promises";
import { pool, rows } from "./connection.js";
// Version 001 is the single initial migration; refuse partial schemas rather than hiding a failed setup.
try {
  const existing = await rows(
    pool,
    "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='users'",
  );
  if (existing.length) {
    const tables = await rows(
      pool,
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema=DATABASE()",
    );
    if (tables.length !== 12)
      throw new Error(
        "Partial schema detected. Use a new empty database and rerun migration.",
      );
    console.log("Migration 001 already present (12 tables).");
  } else {
    const sql = await readFile(
      new URL("migrations/001_initial_schema.sql", import.meta.url),
      "utf8",
    );
    for (const statement of sql.split(";").filter((s) => s.trim()))
      await pool.query(statement);
    console.log("Migration 001 applied: 12 relational tables.");
  }
} finally {
  await pool.end();
}
