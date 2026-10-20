# Quản Lý Xe Cá Viên Chiên & Ăn Vặt (Fishball Cart Management)

Hệ thống web app tinh gọn, chuyên dụng cho quán/xe cá viên chiên và đồ ăn vặt tại Việt Nam. Phục vụ 2 vai trò: Quản lý chi nhánh (MANAGER) chấm công và nhập kho/chốt ngày; và Chủ chi nhánh (OWNER) theo dõi trực tiếp từ xa trên điện thoại/laptop.

---

## 1. Hướng Dẫn Cài Đặt (5 Bước)

1. **Chuẩn bị file môi trường:**
   Tạo file `.env` từ `.env.example` (hoặc sử dụng file `.env` đã có sẵn):
   ```bash
   cp .env.example .env
   ```
2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```
3. **Khởi tạo tài khoản quản trị:**
   ```bash
   npm run seed
   # Hoặc tạo thêm dữ liệu mẫu kiểm thử nếu cơ sở dữ liệu còn trống:
   npm run seed -- --demo
   ```
4. **Chạy kiểm thử:**
   ```bash
   npm test
   ```
5. **Khởi động ứng dụng:**
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

---

## 2. Tài Khoản Khởi Tạo (Seed Credentials)

> [!WARNING]
> Mật khẩu dưới đây chỉ dành cho môi trường phát triển (Development). Hãy đổi mật khẩu ngay sau khi triển khai thực tế.

- **Tài khoản Chủ chi nhánh (OWNER):**
  - Tên đăng nhập: `owner`
  - Mật khẩu mặc định: `cavienchien`
  - Đường dẫn truy cập: `/owner`
- **Tài khoản Quản lý chi nhánh (MANAGER):**
  - Tên đăng nhập: `manager`
  - Mật khẩu mặc định: `yaemiko`
  - Đường dẫn truy cập: `/manager`

---

## 3. Triển Khai Thực Tế (Deployment Notes)

- **Node.js:** Hỗ trợ Node 18, 20, 22 và 24.
- **Cơ sở dữ liệu:** MySQL 8.0.16+ (hỗ trợ Virtual Columns và CHECK constraints).
- **Trên VPS (Ubuntu/Debian với PM2 & Nginx):**
  ```bash
  npm run build
  pm2 start npm --name "fishball-cart" -- start
  ```
- **Trên Vercel / Railway / Render:**
  - Cấu hình các biến môi trường: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET`.
  - Kết nối qua MySQL connection pool an toàn, không mở migration hay sửa đổi schema.

---

## 4. Deploy to Render (with Aiven MySQL)

### Local vs Aiven env workflow

| Purpose | Command | Config loaded |
|---|---|---|
| Local dev (local MySQL) | `npm run dev` | `.env` |
| Aiven dev/test | `npm run dev:aiven` | `.env.aiven` overrides `.env` |
| Check Aiven tables | `npm run db:check:aiven` | `.env.aiven` |
| Seed accounts on Aiven | `npm run seed:aiven` | `.env.aiven` |

The `*:aiven` scripts always print `Target: <host>:<port> / <db>` before doing anything, and exit with a clear error if `DB_PASSWORD`, `SESSION_SECRET`, or the CA file is missing.

### Step-by-step Render deployment

1. **Create a Render Web Service** linked to this repository.
2. Set the following in Render dashboard → Environment:

| Variable | Value |
|---|---|
| `NODE_VERSION` | `20` |
| `DB_HOST` | `mysql-34909891-lducanh2707-6544.b.aivencloud.com` |
| `DB_PORT` | `11514` |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | *(from Aiven Console → Connection info)* |
| `DB_NAME` | `defaultdb` |
| `DB_SSL` | `true` |
| `DB_SSL_CA` | *(full PEM text of the Aiven CA certificate — paste all lines including `-----BEGIN CERTIFICATE-----`)* |
| `SESSION_SECRET` | *(new random string ≥ 32 chars)* |

3. **Build Command:** `npm ci --include=dev && npm run build`
4. **Start Command:** `npm run start`
5. **Instance type:** Starter (or higher)
6. **Health Check Path:** `/api/health`

> [!IMPORTANT]
> Do NOT set `DEFAULT_OWNER_PASSWORD` or `DEFAULT_MANAGER_PASSWORD` in Render. Run `npm run seed:aiven` locally after filling `.env.aiven`, before the first deploy.

> [!NOTE]
> `DB_SSL_CA` on Render takes the full PEM text with literal `\n` sequences — the app converts them to real newlines automatically.

---

## 5. Các Giả Định Kỹ Thuật (Assumptions)

1. **Schema Thực Tế Khớp Hoàn Toàn:** CSDL thực tế `fishball_cart` được ánh xạ chính xác qua kiểm tra `SHOW CREATE TABLE` và ghi lại tại [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md). Không thực hiện migration, DROP hay ALTER cấu trúc bảng.
2. **Độc Lập Giữa Chấm Công Và Doanh Thu:** Chấm công (bảng `shifts`) và quản lý kho/doanh thu (bảng `daily_stock`, `business_days`) hoạt động độc lập. Doanh thu thuộc về ngày bán (`work_date`), không gắn cứng vào ca làm của một cá nhân riêng lẻ.
3. **Cột Sinh (Generated Columns):** Các cột `open_employee_id`, `sold_qty`, `subtotal` được máy chủ MySQL tự động tính toán. Mã nguồn ứng dụng chỉ đọc (SELECT) và không bao giờ chèn hay sửa (INSERT/UPDATE) trực tiếp vào các cột này.
4. **Múi Giờ Việt Nam:** Mọi mốc thời gian DATETIME và DATE đều được lưu dưới dạng chuỗi địa phương `Asia/Ho_Chi_Minh` (UTC+7) qua các helper `nowVN()` và `todayVN()`. Driver MySQL sử dụng `timezone: '+07:00'` và `dateStrings: true` để tránh mọi sai lệch múi giờ.
5. **Chống Brute-force Đăng Nhập:** Giới hạn đăng nhập sai tối đa 5 lần mỗi cặp `username + IP`, sau đó tạm khóa 5 phút (lưu trữ in-memory không cần thêm cột vào DB).
6. **Thu Hồi Phiên Quản Lý Từ Xa:** Khi OWNER đặt lại mật khẩu tài khoản MANAGER, trường `session_version` tự động tăng lên 1 và thu hồi mọi phiên đăng nhập cũ của tài khoản đó.
