import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

export function getPool(): mysql.Pool {
  if (!globalThis._mysqlPool) {
    const host = process.env.DB_HOST || "127.0.0.1";
    const port = Number(process.env.DB_PORT) || 3306;
    const user = process.env.DB_USER || "root";
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME || "fishball_cart";

    let sslOptions: mysql.SslOptions | undefined = undefined;

    if (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") {
      let caText: string | undefined = undefined;

      if (process.env.DB_SSL_CA) {
        // Handle literal '\n' sequences if pasted in environment variables
        caText = process.env.DB_SSL_CA.replace(/\\n/g, "\n");
      } else if (process.env.DB_SSL_CA_FILE) {
        const caPath = path.resolve(process.cwd(), process.env.DB_SSL_CA_FILE);
        if (!fs.existsSync(caPath)) {
          throw new Error(
            `Không tìm thấy tệp chứng chỉ CA tại đường dẫn: ${caPath}. Vui lòng kiểm tra lại cấu hình DB_SSL_CA_FILE.`
          );
        }
        caText = fs.readFileSync(caPath, "utf8");
      } else if (process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false") {
        throw new Error(
          "DB_SSL requires DB_SSL_CA or DB_SSL_CA_FILE unless certificate verification is explicitly disabled."
        );
      }

      sslOptions = {
        ...(caText ? { ca: caText } : {}),
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
      };
    }

    globalThis._mysqlPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      ssl: sslOptions,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "+07:00",
      dateStrings: true,
    });
  }

  return globalThis._mysqlPool;
}

/**
 * Execute query using the pool
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows as T[];
}

/**
 * Run operations within a database transaction
 */
export async function withTransaction<T>(
  callback: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Close pool connection (for cleanup and scripts)
 */
export async function closePool(): Promise<void> {
  const pool = globalThis._mysqlPool;
  if (pool) {
    await pool.end();
    if (globalThis._mysqlPool === pool) {
      globalThis._mysqlPool = undefined;
    }
  }
}
