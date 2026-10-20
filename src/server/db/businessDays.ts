import { query } from "./pool";
import type { BusinessDay } from "@/types";

export async function getBusinessDay(workDate: string): Promise<BusinessDay | null> {
  const rows = await query<BusinessDay>(
    `SELECT b.work_date, b.cash_counted, b.closed_at,
            COALESCE(SUM(d.subtotal), 0) as total_revenue,
            CASE 
              WHEN b.cash_counted IS NOT NULL THEN (b.cash_counted - COALESCE(SUM(d.subtotal), 0))
              ELSE NULL 
            END as variance,
            COUNT(d.item_id) as item_count
     FROM business_days b
     LEFT JOIN daily_stock d ON b.work_date = d.work_date
     WHERE b.work_date = ?
     GROUP BY b.work_date, b.cash_counted, b.closed_at`,
    [workDate]
  );
  return rows[0] || null;
}

export async function getLatestOpenDay(): Promise<BusinessDay | null> {
  const rows = await query<BusinessDay>(
    `SELECT b.work_date, b.cash_counted, b.closed_at,
            COALESCE(SUM(d.subtotal), 0) as total_revenue,
            COUNT(d.item_id) as item_count
     FROM business_days b
     LEFT JOIN daily_stock d ON b.work_date = d.work_date
     WHERE b.closed_at IS NULL
     GROUP BY b.work_date, b.cash_counted, b.closed_at
     ORDER BY b.work_date DESC
     LIMIT 1`
  );
  return rows[0] || null;
}

export async function listUnclosedDays(): Promise<BusinessDay[]> {
  return query<BusinessDay>(
    `SELECT b.work_date, b.cash_counted, b.closed_at,
            COALESCE(SUM(d.subtotal), 0) as total_revenue,
            COUNT(d.item_id) as item_count
     FROM business_days b
     LEFT JOIN daily_stock d ON b.work_date = d.work_date
     WHERE b.closed_at IS NULL
     GROUP BY b.work_date, b.cash_counted, b.closed_at
     ORDER BY b.work_date ASC`
  );
}

export async function listBusinessDays(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<BusinessDay[]> {
  const whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (filters?.startDate) {
    whereClauses.push("b.work_date >= ?");
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    whereClauses.push("b.work_date <= ?");
    params.push(filters.endDate);
  }

  const sql = `
    SELECT b.work_date, b.cash_counted, b.closed_at,
           COALESCE(SUM(d.subtotal), 0) as total_revenue,
           CASE 
             WHEN b.cash_counted IS NOT NULL THEN (b.cash_counted - COALESCE(SUM(d.subtotal), 0))
             ELSE NULL 
           END as variance,
           COUNT(d.item_id) as item_count
    FROM business_days b
    LEFT JOIN daily_stock d ON b.work_date = d.work_date
    WHERE ${whereClauses.join(" AND ")}
    GROUP BY b.work_date, b.cash_counted, b.closed_at
    ORDER BY b.work_date DESC
  `;

  return query<BusinessDay>(sql, params);
}

export async function createBusinessDay(workDate: string): Promise<void> {
  await query("INSERT INTO business_days (work_date) VALUES (?)", [workDate]);
}

export async function closeBusinessDay(
  workDate: string,
  cashCounted: number,
  closedAt: string
): Promise<void> {
  await query(
    "UPDATE business_days SET cash_counted = ?, closed_at = ? WHERE work_date = ?",
    [cashCounted, closedAt, workDate]
  );
}

export async function reopenBusinessDay(workDate: string): Promise<void> {
  await query(
    "UPDATE business_days SET closed_at = NULL WHERE work_date = ?",
    [workDate]
  );
}

export async function updateBusinessDayCash(
  workDate: string,
  cashCounted: number
): Promise<void> {
  await query(
    "UPDATE business_days SET cash_counted = ? WHERE work_date = ?",
    [cashCounted, workDate]
  );
}
