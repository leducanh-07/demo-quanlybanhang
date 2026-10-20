# Live Database Schema Documentation (`fishball_cart`)

Introspected via `SHOW CREATE TABLE` on MySQL 8.0.45.
Host: 127.0.0.1:3306

```sql
CREATE TABLE `accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('OWNER','MANAGER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_version` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employees_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `check_in_time` datetime NOT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `open_employee_id` int GENERATED ALWAYS AS (if((`check_out_time` is null),`employee_id`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shifts_open_employee` (`open_employee_id`),
  KEY `idx_shifts_check_in` (`check_in_time`),
  KEY `idx_shifts_employee` (`employee_id`,`check_in_time`),
  CONSTRAINT `fk_shifts_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_shifts_time` CHECK (((`check_out_time` is null) or (`check_out_time` >= `check_in_time`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_price` int NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_items_name` (`name`),
  CONSTRAINT `chk_items_price` CHECK ((`unit_price` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `business_days` (
  `work_date` date NOT NULL,
  `cash_counted` int DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`work_date`),
  CONSTRAINT `chk_days_cash` CHECK (((`cash_counted` is null) or (`cash_counted` >= 0))),
  CONSTRAINT `chk_days_close_needs_cash` CHECK (((`closed_at` is null) or (`cash_counted` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `daily_stock` (
  `work_date` date NOT NULL,
  `item_id` int NOT NULL,
  `import_qty` int NOT NULL,
  `restock_qty` int NOT NULL DEFAULT '0',
  `waste_qty` int NOT NULL DEFAULT '0',
  `ending_qty` int DEFAULT NULL,
  `unit_price` int NOT NULL,
  `sold_qty` int GENERATED ALWAYS AS ((((`import_qty` + `restock_qty`) - `waste_qty`) - `ending_qty`)) VIRTUAL,
  `subtotal` int GENERATED ALWAYS AS ((`sold_qty` * `unit_price`)) VIRTUAL,
  PRIMARY KEY (`work_date`,`item_id`),
  KEY `idx_daily_stock_item` (`item_id`),
  CONSTRAINT `fk_daily_stock_day` FOREIGN KEY (`work_date`) REFERENCES `business_days` (`work_date`) ON DELETE CASCADE,
  CONSTRAINT `fk_daily_stock_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_daily_stock_qty` CHECK (((`import_qty` >= 0) and (`restock_qty` >= 0) and (`waste_qty` >= 0) and (`unit_price` >= 0) and ((`ending_qty` is null) or ((`ending_qty` >= 0) and (`ending_qty` <= ((`import_qty` + `restock_qty`) - `waste_qty`))))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stock_counts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_date` date NOT NULL,
  `item_id` int NOT NULL,
  `counted_qty` int NOT NULL,
  `counted_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stock_counts_day_item_time` (`work_date`,`item_id`,`counted_at`),
  KEY `idx_stock_counts_item` (`item_id`),
  CONSTRAINT `fk_stock_counts_day` FOREIGN KEY (`work_date`) REFERENCES `business_days` (`work_date`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_counts_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_stock_counts_qty` CHECK ((`counted_qty` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_ref` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entity`,`entity_ref`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
