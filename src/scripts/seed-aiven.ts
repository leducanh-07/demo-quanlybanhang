import mysql from "mysql2/promise";
import { hashPassword } from "@/lib/auth";
import { loadAndValidateAivenEnv } from "./aiven-preflight";

async function main() {
  const env = loadAndValidateAivenEnv();

  const ownerUsername = process.env.DEFAULT_OWNER_USERNAME || "owner";
  const ownerPassword = process.env.DEFAULT_OWNER_PASSWORD || process.env.SEED_OWNER_PASSWORD || "";
  const managerUsername = process.env.DEFAULT_MANAGER_USERNAME || "manager";
  const managerPassword = process.env.DEFAULT_MANAGER_PASSWORD || process.env.SEED_MANAGER_PASSWORD || "";
  if (ownerUsername === managerUsername) {
    throw new Error("DEFAULT_OWNER_USERNAME and DEFAULT_MANAGER_USERNAME must be different.");
  }

  // Match the password validation used by the authenticated account flows.
  if (!ownerPassword || ownerPassword.length < 6) {
    console.error(
      "❌ Lỗi: DEFAULT_OWNER_PASSWORD trong .env.aiven phải có ít nhất 6 ký tự."
    );
    process.exit(1);
  }

  if (!managerPassword || managerPassword.length < 6) {
    console.error(
      "❌ Lỗi: DEFAULT_MANAGER_PASSWORD trong .env.aiven phải có ít nhất 6 ký tự."
    );
    process.exit(1);
  }

  if (ownerPassword.length < 12 || managerPassword.length < 12) {
    console.warn("⚠️ Mật khẩu tài khoản nên dài ít nhất 12 ký tự để tăng cường bảo mật.");
  }

  let conn: mysql.Connection | null = null;

  try {
    conn = await mysql.createConnection({
      host: env.host,
      port: env.port,
      user: env.user,
      password: process.env.DB_PASSWORD,
      database: env.database,
      ssl: env.sslOptions,
      timezone: "+07:00",
      dateStrings: true,
    });

    const [roleColumns]: any = await conn.execute(
      `SELECT COLUMN_TYPE AS columnType
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'accounts' AND column_name = 'role'`
    );
    const roleType = roleColumns[0]?.columnType || "";
    if (!roleType.includes("OWNER") || !roleType.includes("MANAGER")) {
      throw new Error(
        "The configured accounts.role column does not support OWNER and MANAGER. No accounts were seeded."
      );
    }

    const ownerHash = await hashPassword(ownerPassword);
    const managerHash = await hashPassword(managerPassword);

    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO accounts (username, role, password_hash, session_version)
       VALUES (?, 'OWNER', ?, 1)
       ON DUPLICATE KEY UPDATE
         role = VALUES(role),
         password_hash = VALUES(password_hash),
         session_version = session_version + 1`,
      [ownerUsername, ownerHash]
    );
    await conn.execute(
      `INSERT INTO accounts (username, role, password_hash, session_version)
       VALUES (?, 'MANAGER', ?, 1)
       ON DUPLICATE KEY UPDATE
         role = VALUES(role),
         password_hash = VALUES(password_hash),
         session_version = session_version + 1`,
      [managerUsername, managerHash]
    );
    await conn.commit();
    console.log(`✅ Đã tạo/cập nhật tài khoản OWNER (${ownerUsername}) trên Aiven.`);
    console.log(`✅ Đã tạo/cập nhật tài khoản MANAGER (${managerUsername}) trên Aiven.`);

    console.log("✅ Hoàn tất thiết lập tài khoản ban đầu trên Aiven.");
  } catch (err: any) {
    console.error(`❌ Lỗi khi khởi tạo tài khoản trên Aiven: ${err.message}`);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

main();
