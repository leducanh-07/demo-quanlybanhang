import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { loadAndValidateAivenEnv } from "./aiven-preflight";

async function main() {
  const env = loadAndValidateAivenEnv();

  const ownerPassword = process.env.SEED_OWNER_PASSWORD || "";
  const stationPassword = process.env.SEED_STATION_PASSWORD || "";

  // Enforce strong seed passwords (>= 12 characters)
  if (!ownerPassword || ownerPassword.length < 12) {
    console.error(
      "❌ Lỗi: SEED_OWNER_PASSWORD trong .env.aiven không hợp lệ hoặc quá ngắn (yêu cầu tối thiểu 12 ký tự để đảm bảo an toàn cho môi trường Aiven/Production)."
    );
    process.exit(1);
  }

  if (!stationPassword || stationPassword.length < 12) {
    console.error(
      "❌ Lỗi: SEED_STATION_PASSWORD trong .env.aiven không hợp lệ hoặc quá ngắn (yêu cầu tối thiểu 12 ký tự để đảm bảo an toàn cho môi trường Aiven/Production)."
    );
    process.exit(1);
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

    // Check existing accounts
    const [existingAccounts]: any = await conn.execute(
      "SELECT id, username, role FROM accounts WHERE username IN ('owner', 'station')"
    );

    const usernames = existingAccounts.map((a: any) => a.username);

    if (!usernames.includes("owner")) {
      const hash = await bcrypt.hash(ownerPassword, 10);
      await conn.execute(
        "INSERT INTO accounts (username, role, password_hash, session_version) VALUES (?, 'OWNER', ?, 1)",
        ["owner", hash]
      );
      console.log("✅ Đã tạo tài khoản OWNER (username: owner) trên Aiven.");
    } else {
      console.log("ℹ️ Tài khoản OWNER đã tồn tại trên Aiven, bỏ qua tạo mới.");
    }

    if (!usernames.includes("station")) {
      const hash = await bcrypt.hash(stationPassword, 10);
      await conn.execute(
        "INSERT INTO accounts (username, role, password_hash, session_version) VALUES (?, 'STATION', ?, 1)",
        ["station", hash]
      );
      console.log("✅ Đã tạo tài khoản STATION (username: station) trên Aiven.");
    } else {
      console.log("ℹ️ Tài khoản STATION đã tồn tại trên Aiven, bỏ qua tạo mới.");
    }

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
