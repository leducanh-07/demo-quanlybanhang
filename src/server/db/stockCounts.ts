import { query } from "./pool";
import type { StockCount } from "@/types";

export async function insertStockCount(
  workDate: string,
  itemId: number,
  countedQty: number,
  countedAt: string
): Promise<number> {
  const result: any = await query(
    "INSERT INTO stock_counts (work_date, item_id, counted_qty, counted_at) VALUES (?, ?, ?, ?)",
    [workDate, itemId, countedQty, countedAt]
  );
  return result.insertId;
}

export async function listStockCountsForDay(workDate: string): Promise<StockCount[]> {
  return query<StockCount>(
    `SELECT sc.id, sc.work_date, sc.item_id, sc.counted_qty, sc.counted_at,
            i.name as item_name
     FROM stock_counts sc
     JOIN items i ON sc.item_id = i.id
     WHERE sc.work_date = ?
     ORDER BY sc.counted_at DESC, sc.item_id ASC`,
    [workDate]
  );
}

/**
 * Returns latest counted_qty and counted_at for each item on a given workDate
 */
export async function getLatestCountsForDay(
  workDate: string
): Promise<Array<{ item_id: number; counted_qty: number; counted_at: string }>> {
  return query<{ item_id: number; counted_qty: number; counted_at: string }>(
    `SELECT sc1.item_id, sc1.counted_qty, sc1.counted_at
     FROM stock_counts sc1
     INNER JOIN (
       SELECT item_id, MAX(id) as max_id
       FROM stock_counts
       WHERE work_date = ?
       GROUP BY item_id
     ) sc2 ON sc1.id = sc2.max_id`,
    [workDate]
  );
}

/**
 * Returns the most recent counted_at timestamp on the given workDate
 */
export async function getLatestCountTimestamp(workDate: string): Promise<string | null> {
  const rows = await query<{ latest: string }>(
    "SELECT MAX(counted_at) as latest FROM stock_counts WHERE work_date = ?",
    [workDate]
  );
  return rows[0]?.latest || null;
}
