import { query } from "./pool";
import type { DailyStock } from "@/types";

export async function getDailyStockForDay(workDate: string): Promise<DailyStock[]> {
  return query<DailyStock>(
    `SELECT d.work_date, d.item_id, d.import_qty, d.restock_qty, d.waste_qty, 
            d.ending_qty, d.unit_price, d.sold_qty, d.subtotal,
            i.name as item_name, i.image_url as item_image_url
     FROM daily_stock d
     JOIN items i ON d.item_id = i.id
     WHERE d.work_date = ?
     ORDER BY d.item_id ASC`,
    [workDate]
  );
}

export async function getDailyStockItem(
  workDate: string,
  itemId: number
): Promise<DailyStock | null> {
  const rows = await query<DailyStock>(
    `SELECT d.work_date, d.item_id, d.import_qty, d.restock_qty, d.waste_qty, 
            d.ending_qty, d.unit_price, d.sold_qty, d.subtotal,
            i.name as item_name, i.image_url as item_image_url
     FROM daily_stock d
     JOIN items i ON d.item_id = i.id
     WHERE d.work_date = ? AND d.item_id = ?`,
    [workDate, itemId]
  );
  return rows[0] || null;
}

export async function insertDailyStockRow(
  workDate: string,
  itemId: number,
  importQty: number,
  unitPrice: number
): Promise<void> {
  await query(
    `INSERT INTO daily_stock (work_date, item_id, import_qty, restock_qty, waste_qty, unit_price)
     VALUES (?, ?, ?, 0, 0, ?)`,
    [workDate, itemId, importQty, unitPrice]
  );
}

export async function addRestock(
  workDate: string,
  itemId: number,
  qty: number
): Promise<void> {
  await query(
    `UPDATE daily_stock 
     SET restock_qty = restock_qty + ? 
     WHERE work_date = ? AND item_id = ?`,
    [qty, workDate, itemId]
  );
}

export async function addWaste(
  workDate: string,
  itemId: number,
  qty: number
): Promise<void> {
  await query(
    `UPDATE daily_stock 
     SET waste_qty = waste_qty + ? 
     WHERE work_date = ? AND item_id = ?`,
    [qty, workDate, itemId]
  );
}

export async function updateEndingQty(
  workDate: string,
  itemId: number,
  endingQty: number
): Promise<void> {
  await query(
    `UPDATE daily_stock 
     SET ending_qty = ? 
     WHERE work_date = ? AND item_id = ?`,
    [endingQty, workDate, itemId]
  );
}

export async function updateStockRow(
  workDate: string,
  itemId: number,
  importQty: number,
  restockQty: number,
  wasteQty: number,
  endingQty: number | null
): Promise<void> {
  await query(
    `UPDATE daily_stock 
     SET import_qty = ?, restock_qty = ?, waste_qty = ?, ending_qty = ? 
     WHERE work_date = ? AND item_id = ?`,
    [importQty, restockQty, wasteQty, endingQty, workDate, itemId]
  );
}
