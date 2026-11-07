import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./database/connection.js";
await pool.query("SELECT 1");
const server = app.listen(config.port, "127.0.0.1", () =>
  console.log(`SEEK API ready at http://127.0.0.1:${config.port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)));
  });
