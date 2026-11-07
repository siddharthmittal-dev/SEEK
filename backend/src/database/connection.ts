import mysql, {
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { config } from "../config.js";
export const pool = mysql.createPool(config.db);
export type DB = typeof pool | PoolConnection;
export async function rows<T = any>(
  db: DB,
  sql: string,
  args: any[] = [],
): Promise<T[]> {
  const [r] = await db.execute<RowDataPacket[]>(sql, args);
  return r as T[];
}
export async function run(db: DB, sql: string, args: any[] = []) {
  const [r] = await db.execute<ResultSetHeader>(sql, args);
  return r;
}
export async function transaction<T>(
  fn: (db: PoolConnection) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const db = await pool.getConnection();
    try {
      await db.beginTransaction();
      const result = await fn(db);
      await db.commit();
      return result;
    } catch (e: any) {
      await db.rollback();
      if (e.code === "ER_LOCK_DEADLOCK" && attempt < 2) continue;
      throw e;
    } finally {
      db.release();
    }
  }
}
export async function audit(
  db: DB,
  actor: number,
  action: string,
  type: string,
  id: number,
  details = "",
) {
  await run(
    db,
    "INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)",
    [actor, action, type, id, details],
  );
}
