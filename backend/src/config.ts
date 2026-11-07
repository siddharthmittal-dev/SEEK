import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32)
  throw new Error(
    "Set JWT_SECRET to at least 32 random characters in backend/.env.",
  );
export const config = {
  port: Number(process.env.PORT || 3001),
  production: process.env.NODE_ENV === "production",
  secret,
  origin: process.env.APP_ORIGIN || "http://localhost:5173",
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "seek",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "seek",
    timezone: "Z",
    decimalNumbers: true,
    dateStrings: true,
    connectionLimit: 10,
  },
};
