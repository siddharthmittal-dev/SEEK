import bcrypt from "bcrypt";
import { z } from "zod";
import { pool, run, transaction, audit } from "./connection.js";
const data = z
  .object({
    email: z.email(),
    name: z.string().trim().min(1).max(100),
    password: z
      .string()
      .min(12)
      .max(72)
      .refine((s) => Buffer.byteLength(s) <= 72),
  })
  .parse({
    email: process.env.ADMIN_EMAIL,
    name: process.env.ADMIN_NAME,
    password: process.env.ADMIN_PASSWORD,
  });
try {
  const hash = await bcrypt.hash(data.password, 12);
  await transaction(async (db) => {
    const u = await run(
      db,
      "INSERT INTO users(name,email,password_hash,role,status) VALUES(?,?,?,'admin','active')",
      [data.name, data.email.toLowerCase(), hash],
    );
    await audit(db, u.insertId, "admin.created-by-cli", "user", u.insertId);
  });
  console.log("Administrator created.");
} finally {
  await pool.end();
}
