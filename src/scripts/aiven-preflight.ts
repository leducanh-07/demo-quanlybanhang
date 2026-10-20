import fs from "fs";
import path from "path";
import dotenv from "dotenv";

/**
 * Loads .env.aiven with override and validates required variables
 */
export function loadAndValidateAivenEnv(): {
  host: string;
  port: number;
  user: string;
  database: string;
  sslOptions?: { ca: string; rejectUnauthorized: boolean };
} {
  const aivenEnvPath = path.resolve(process.cwd(), ".env.aiven");
  if (!fs.existsSync(aivenEnvPath)) {
    console.error("❌ Lỗi: Không tìm thấy tệp cấu hình .env.aiven.");
    process.exit(1);
  }

  // Override any existing environment variables with .env.aiven
  const envConfig = dotenv.parse(fs.readFileSync(aivenEnvPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }

  const host = process.env.DB_HOST || "";
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "";
  const sessionSecret = process.env.SESSION_SECRET || "";

  // 1. Always print target first (never print passwords)
  console.log(`Target: ${host}:${port} / ${database}`);

  // 2. Validate DB_PASSWORD
  if (!password.trim()) {
    console.error(
      "❌ Lỗi: Chưa cung cấp DB_PASSWORD trong .env.aiven.\n" +
        "👉 Vui lòng mở Aiven Console (Connection information), sao chép mật khẩu và điền vào biến DB_PASSWORD trong .env.aiven."
    );
    process.exit(1);
  }

  // 3. Validate SESSION_SECRET
  if (!sessionSecret.trim() || sessionSecret.trim().length < 32) {
    console.error(
      "❌ Lỗi: Chưa cung cấp SESSION_SECRET hợp lệ trong .env.aiven.\n" +
        "👉 Vui lòng điền một chuỗi bí mật ngẫu nhiên có độ dài tối thiểu 32 ký tự vào biến SESSION_SECRET trong .env.aiven."
    );
    process.exit(1);
  }

  // 4. Validate SSL & CA file if DB_SSL=true
  let sslOptions: { ca: string; rejectUnauthorized: boolean } | undefined = undefined;

  if (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") {
    let caText: string | undefined = undefined;

    if (process.env.DB_SSL_CA) {
      caText = process.env.DB_SSL_CA.replace(/\\n/g, "\n");
    } else if (process.env.DB_SSL_CA_FILE) {
      const caPath = path.resolve(process.cwd(), process.env.DB_SSL_CA_FILE);
      if (!fs.existsSync(caPath)) {
        console.error(
          `❌ Lỗi: Không tìm thấy tệp chứng chỉ CA tại đường dẫn: ${process.env.DB_SSL_CA_FILE}.\n` +
            "👉 Vui lòng tải ca.pem từ Aiven Console và đặt tại certs/aiven-ca.pem."
        );
        process.exit(1);
      }
      caText = fs.readFileSync(caPath, "utf8");
    } else {
      console.error(
        "❌ Lỗi: DB_SSL đang bật (true) nhưng thiếu cấu hình DB_SSL_CA hoặc DB_SSL_CA_FILE.\n" +
          "👉 Vui lòng kiểm tra lại cấu hình tệp chứng chỉ trong .env.aiven."
      );
      process.exit(1);
    }

    sslOptions = {
      ca: caText,
      rejectUnauthorized: true,
    };
  }

  return {
    host,
    port,
    user,
    database,
    sslOptions,
  };
}
