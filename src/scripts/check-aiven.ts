import mysql from "mysql2/promise";
import { loadAndValidateAivenEnv } from "./aiven-preflight";

const EXPECTED_TABLES = [
  "accounts",
  "employees",
  "shifts",
  "items",
  "business_days",
  "daily_stock",
  "stock_counts",
  "audit_logs",
];

async function main() {
  const env = loadAndValidateAivenEnv();

  console.log("Đang kết nối tới cơ sở dữ liệu Aiven MySQL...");
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

    // 1. Run SELECT 1
    await conn.execute("SELECT 1");
    console.log("✅ Kết nối cơ sở dữ liệu thành công (SELECT 1: OK).");

    // 2. Run SHOW TABLES
    const [rows]: any = await conn.execute("SHOW TABLES");
    const existingTables: string[] = rows.map((r: any) => Object.values(r)[0] as string);

    console.log("\nKiểm tra 8 bảng dữ liệu bắt buộc:");
    const missingTables: string[] = [];

    for (const tbl of EXPECTED_TABLES) {
      if (existingTables.includes(tbl)) {
        console.log(`  [OK] ${tbl}`);
      } else {
        console.log(`  [MISSING] ${tbl}`);
        missingTables.push(tbl);
      }
    }

    if (missingTables.length > 0) {
      console.error(
        `\n❌ Lỗi: Cơ sở dữ liệu "${env.database}" còn thiếu ${missingTables.length} bảng: ${missingTables.join(", ")}.`
      );
      process.exit(1);
    }

    console.log(`\n✅ Thành công: Toàn bộ 8/8 bảng dữ liệu đã tồn tại trên Aiven MySQL (${env.database}).`);
  } catch (err: any) {
    console.error(`\n❌ Lỗi kết nối hoặc kiểm tra Aiven MySQL: ${err.message}`);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

main();
