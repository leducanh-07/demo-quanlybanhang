import "dotenv/config";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

async function main() {
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "fishball_cart";

  const ownerPassword = process.env.SEED_OWNER_PASSWORD || "cavienchien";
  const stationPassword = process.env.SEED_STATION_PASSWORD || "yaemiko";

  console.log("Connecting to database:", database, "at", `${host}:${port}`);

  // Build optional SSL config (same logic as pool.ts)
  let sslOptions: mysql.SslOptions | undefined = undefined;
  if (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") {
    let caText: string | undefined = undefined;
    if (process.env.DB_SSL_CA) {
      caText = process.env.DB_SSL_CA.replace(/\\n/g, "\n");
    } else if (process.env.DB_SSL_CA_FILE) {
      const caPath = path.resolve(process.cwd(), process.env.DB_SSL_CA_FILE);
      caText = fs.readFileSync(caPath, "utf8");
    }
    if (caText) sslOptions = { ca: caText, rejectUnauthorized: true };
  }

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    ssl: sslOptions,
    timezone: "+07:00",
    dateStrings: true,
  });

  try {
    // 1. Seed accounts if they do not exist
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
      console.log("Created OWNER account: owner");
    } else {
      console.log("OWNER account already exists.");
    }

    if (!usernames.includes("station")) {
      const hash = await bcrypt.hash(stationPassword, 10);
      await conn.execute(
        "INSERT INTO accounts (username, role, password_hash, session_version) VALUES (?, 'STATION', ?, 1)",
        ["station", hash]
      );
      console.log("Created STATION account: station");
    } else {
      console.log("STATION account already exists.");
    }

    // Check for --demo flag
    const isDemo = process.argv.includes("--demo");
    if (isDemo) {
      console.log("Checking if demo data should be populated...");
      const [dayRows]: any = await conn.execute("SELECT COUNT(*) as cnt FROM business_days");
      const dayCount = dayRows[0].cnt;

      if (dayCount > 0) {
        console.log("Database already has business days data. Skipping demo seeding to protect data.");
      } else {
        console.log("Inserting demo data (employees, 10 closed days, shifts, abnormal variance)...");

        // Ensure at least 4 employees
        const [empRows]: any = await conn.execute("SELECT id, code, full_name FROM employees");
        const existingCodes = empRows.map((e: any) => e.code);

        const neededEmployees = [
          { code: "NV001", name: "Nguyễn Văn An" },
          { code: "NV002", name: "Trần Thị Bình" },
          { code: "NV003", name: "Lê Hoàng Cường" },
          { code: "NV004", name: "Phạm Thùy Dung" },
        ];

        for (const emp of neededEmployees) {
          if (!existingCodes.includes(emp.code)) {
            await conn.execute(
              "INSERT INTO employees (code, full_name, is_active) VALUES (?, ?, 1)",
              [emp.code, emp.name]
            );
          }
        }

        const [allEmps]: any = await conn.execute("SELECT id, code FROM employees WHERE is_active = 1");
        const empIds: number[] = allEmps.map((e: any) => e.id);

        // Ensure items exist
        const [itemRows]: any = await conn.execute("SELECT id, name, unit_price FROM items WHERE is_active = 1");
        let items = itemRows;
        if (items.length === 0) {
          const defaultItems = [
            { name: "Cá viên chiên", price: 5000 },
            { name: "Bò viên chiên", price: 5000 },
            { name: "Tôm viên chiên", price: 7000 },
            { name: "Xúc xích chiên", price: 8000 },
            { name: "Phô mai que", price: 10000 },
            { name: "Chả cá sợi", price: 6000 },
            { name: "Khoai tây chiên", price: 20000 },
            { name: "Sốt chấm thêm", price: 2000 },
          ];
          for (const it of defaultItems) {
            await conn.execute(
              "INSERT INTO items (name, unit_price, is_active) VALUES (?, ?, 1)",
              [it.name, it.price]
            );
          }
          const [freshItems]: any = await conn.execute("SELECT id, name, unit_price FROM items WHERE is_active = 1");
          items = freshItems;
        }

        // Generate dates for the past 10 days
        const now = new Date();
        const dates: string[] = [];
        for (let i = 10; i >= 1; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          dates.push(`${y}-${m}-${day}`);
        }

        for (let i = 0; i < dates.length; i++) {
          const workDate = dates[i];
          const isAbnormal = i === dates.length - 2; // Second to last day has abnormal variance

          // 1. Insert business_days
          await conn.execute("INSERT INTO business_days (work_date) VALUES (?)", [workDate]);

          // 2. Insert daily_stock
          let calculatedRevenue = 0;
          for (const item of items) {
            const importQty = 40 + (item.id % 4) * 15;
            const restockQty = 10;
            const wasteQty = item.id % 3;
            const totalAvailable = importQty + restockQty - wasteQty;
            const endingQty = 5 + (item.id % 5);
            const soldQty = totalAvailable - endingQty;
            const subtotal = soldQty * item.unit_price;
            calculatedRevenue += subtotal;

            await conn.execute(
              `INSERT INTO daily_stock (work_date, item_id, import_qty, restock_qty, waste_qty, ending_qty, unit_price)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [workDate, item.id, importQty, restockQty, wasteQty, endingQty, item.unit_price]
            );
          }

          // Cash counted: normal days variance is small (0 to 10k), abnormal day has -55.000đ difference
          const cashCounted = isAbnormal ? calculatedRevenue - 55000 : calculatedRevenue + (i % 2 === 0 ? 0 : 5000);
          const closedAt = `${workDate} 22:30:00`;

          await conn.execute(
            "UPDATE business_days SET cash_counted = ?, closed_at = ? WHERE work_date = ?",
            [cashCounted, closedAt, workDate]
          );

          // 3. Insert shifts for employees on that day
          const emp1 = empIds[0];
          const emp2 = empIds[1] || empIds[0];
          await conn.execute(
            "INSERT INTO shifts (employee_id, check_in_time, check_out_time) VALUES (?, ?, ?)",
            [emp1, `${workDate} 08:00:00`, `${workDate} 15:30:00`]
          );
          await conn.execute(
            "INSERT INTO shifts (employee_id, check_in_time, check_out_time) VALUES (?, ?, ?)",
            [emp2, `${workDate} 15:00:00`, `${workDate} 22:30:00`]
          );
        }

        // Today's open shifts
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
        if (empIds.length > 0) {
          const emp1 = empIds[0];
          await conn.execute(
            "INSERT INTO shifts (employee_id, check_in_time) VALUES (?, ?)",
            [emp1, `${todayStr} 08:30:00`]
          );
          console.log(`Created 1 OPEN shift for employee #${emp1} today (${todayStr})`);
        }

        console.log("Demo data successfully populated!");
      }
    }

    console.log("Seeding completed successfully.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
