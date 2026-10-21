import {
  getBusinessDay,
  listUnclosedDays,
  createBusinessDay,
  closeBusinessDay,
  reopenBusinessDay,
  getLatestOpenDay,
} from "../db/businessDays";
import {
  getDailyStockForDay,
  getDailyStockItem,
  insertDailyStockRow,
  addRestock as repoAddRestock,
  addWaste as repoAddWaste,
  updateEndingQty,
  updateStockRow,
} from "../db/dailyStock";
import { listActiveItems, getItemById } from "../db/items";
import { insertStockCount, getLatestCountsForDay, getLatestCountTimestamp } from "../db/stockCounts";
import { insertAuditLog } from "../db/auditLogs";
import { nowVN, todayVN } from "@/lib/time";
import { withTransaction } from "../db/pool";
import type { BusinessDay, DailyStock, SessionPayload } from "@/types";

export interface StockItemView extends DailyStock {
  latestCountedQty?: number;
  latestCountedAt?: string;
  impliedSoldSoFar?: number;
  impliedRevenueSoFar?: number;
}

export interface DayStockState {
  day: BusinessDay | null;
  items: StockItemView[];
  isOpen: boolean;
  isToday: boolean;
  unclosedOlderDays: BusinessDay[];
  latestCountTimestamp: string | null;
  estimatedRevenue: number;
}

/**
 * Get current stock state for MANAGER or OWNER
 */
export async function getTodayStockState(): Promise<DayStockState> {
  const today = todayVN();
  const unclosed = await listUnclosedDays();

  // If today's day exists, use it. Otherwise, the manager can continue working on an unclosed day.
  let currentDay = await getBusinessDay(today);
  if (!currentDay && unclosed.length > 0) {
    // Open day carried over from yesterday/earlier
    currentDay = unclosed[unclosed.length - 1];
  }

  const olderUnclosed = unclosed.filter(
    (d) => currentDay && d.work_date < currentDay.work_date
  );

  if (!currentDay) {
    return {
      day: null,
      items: [],
      isOpen: false,
      isToday: true,
      unclosedOlderDays: unclosed,
      latestCountTimestamp: null,
      estimatedRevenue: 0,
    };
  }

  const [stockRows, latestCounts, latestTs] = await Promise.all([
    getDailyStockForDay(currentDay.work_date),
    getLatestCountsForDay(currentDay.work_date),
    getLatestCountTimestamp(currentDay.work_date),
  ]);

  const countMap = new Map<number, { counted_qty: number; counted_at: string }>();
  for (const c of latestCounts) {
    countMap.set(c.item_id, c);
  }

  let runningEst = 0;
  const itemsView: StockItemView[] = stockRows.map((row) => {
    const c = countMap.get(row.item_id);
    const available = row.import_qty + row.restock_qty - row.waste_qty;

    let impliedSold = 0;
    if (c !== undefined) {
      impliedSold = Math.max(0, available - c.counted_qty);
    } else if (row.ending_qty !== null && row.ending_qty !== undefined) {
      impliedSold = row.sold_qty ?? 0;
    }

    const impliedRev = impliedSold * row.unit_price;
    runningEst += impliedRev;

    return {
      ...row,
      latestCountedQty: c?.counted_qty,
      latestCountedAt: c?.counted_at,
      impliedSoldSoFar: impliedSold,
      impliedRevenueSoFar: impliedRev,
    };
  });

  return {
    day: currentDay,
    items: itemsView,
    isOpen: currentDay.closed_at === null,
    isToday: currentDay.work_date === today,
    unclosedOlderDays: olderUnclosed,
    latestCountTimestamp: latestTs,
    estimatedRevenue: currentDay.closed_at ? (currentDay.total_revenue ?? 0) : runningEst,
  };
}

/**
 * Start a new business day (work_date = todayVN())
 */
export async function startDay(
  itemsInput: Array<{ itemId: number; importQty: number }>,
  actor: SessionPayload
): Promise<{ success: boolean; error?: string; workDate?: string }> {
  const today = todayVN();

  const existing = await getBusinessDay(today);
  if (existing) {
    return {
      success: false,
      error: `Ngày ${today} đã được mở trước đó. Không thể tạo lại.`,
    };
  }

  const activeItems = await listActiveItems();
  if (activeItems.length === 0) {
    return {
      success: false,
      error: "Không có món nào đang hoạt động trong thực đơn để mở ngày.",
    };
  }

  const inputMap = new Map<number, number>();
  for (const item of itemsInput) {
    inputMap.set(item.itemId, item.importQty);
  }

  await withTransaction(async (conn) => {
    // 1. Insert business_days
    await conn.execute("INSERT INTO business_days (work_date) VALUES (?)", [today]);

    // 2. Insert daily_stock with unit_price snapshot
    for (const item of activeItems) {
      const importQty = inputMap.get(item.id) ?? 0;
      await conn.execute(
        `INSERT INTO daily_stock (work_date, item_id, import_qty, restock_qty, waste_qty, unit_price)
         VALUES (?, ?, ?, 0, 0, ?)`,
        [today, item.id, importQty, item.unit_price]
      );
    }
  });

  await insertAuditLog(
    "START_DAY",
    "business_days",
    today,
    { startedBy: actor.username, itemCount: activeItems.length },
    nowVN()
  );

  return { success: true, workDate: today };
}

/**
 * Add restock quantity during open day
 */
export async function addRestockQuantity(
  workDate: string,
  itemId: number,
  qty: number,
  actor: SessionPayload
): Promise<{ success: boolean; error?: string }> {
  const day = await getBusinessDay(workDate);
  if (!day) return { success: false, error: "Không tìm thấy ngày bán." };
  if (day.closed_at !== null) {
    return { success: false, error: "Ngày bán đã chốt, không thể thêm hàng." };
  }

  const item = await getDailyStockItem(workDate, itemId);
  if (!item) return { success: false, error: "Món không nằm trong danh sách bán của ngày này." };

  await repoAddRestock(workDate, itemId, qty);
  await insertAuditLog(
    "STOCK_RESTOCK",
    "daily_stock",
    `${workDate}:${itemId}`,
    {
      itemId,
      qty,
      before: item.restock_qty,
      after: item.restock_qty + qty,
      updatedBy: actor.username,
    },
    nowVN()
  );
  return { success: true };
}

/**
 * Add waste quantity during open day
 */
export async function addWasteQuantity(
  workDate: string,
  itemId: number,
  qty: number,
  actor: SessionPayload
): Promise<{ success: boolean; error?: string }> {
  const day = await getBusinessDay(workDate);
  if (!day) return { success: false, error: "Không tìm thấy ngày bán." };
  if (day.closed_at !== null) {
    return { success: false, error: "Ngày bán đã chốt, không thể nhập hao hụt." };
  }

  const item = await getDailyStockItem(workDate, itemId);
  if (!item) return { success: false, error: "Món không nằm trong danh sách bán của ngày này." };

  // Validate that waste doesn't exceed total stock so far
  const totalStock = item.import_qty + item.restock_qty;
  if (item.waste_qty + qty > totalStock) {
    return {
      success: false,
      error: `Hao hụt vượt quá tổng số hàng hiện có (${totalStock}).`,
    };
  }

  await repoAddWaste(workDate, itemId, qty);
  await insertAuditLog(
    "STOCK_WASTE",
    "daily_stock",
    `${workDate}:${itemId}`,
    {
      itemId,
      qty,
      before: item.waste_qty,
      after: item.waste_qty + qty,
      updatedBy: actor.username,
    },
    nowVN()
  );
  return { success: true };
}

/**
 * Record mid-day stock counts (snapshots)
 */
export async function recordMidDayCounts(
  workDate: string,
  counts: Array<{ itemId: number; countedQty: number }>,
  actor: SessionPayload
): Promise<{ success: boolean; error?: string }> {
  const day = await getBusinessDay(workDate);
  if (!day) return { success: false, error: "Không tìm thấy ngày bán." };
  if (day.closed_at !== null) {
    return { success: false, error: "Ngày bán đã chốt, không thể nhập kiểm kê." };
  }

  const now = nowVN();
  for (const c of counts) {
    await insertStockCount(workDate, c.itemId, c.countedQty, now);
  }

  return { success: true };
}

/**
 * Close day (ONE DB Transaction)
 * Requires ending_qty for EVERY item and cash_counted >= 0
 */
export async function closeDay(
  workDate: string,
  cashCounted: number,
  endingItems: Array<{ itemId: number; endingQty: number }>,
  actor: SessionPayload
): Promise<{
  success: boolean;
  error?: string;
  totalRevenue?: number;
  variance?: number;
  soldSummary?: Array<{ itemId: number; soldQty: number; subtotal: number }>;
}> {
  const day = await getBusinessDay(workDate);
  if (!day) return { success: false, error: "Không tìm thấy ngày bán." };
  if (day.closed_at !== null) {
    return { success: false, error: "Ngày bán này đã được chốt trước đó." };
  }

  const currentItems = await getDailyStockForDay(workDate);
  if (currentItems.length === 0) {
    return { success: false, error: "Ngày bán không có mặt hàng nào." };
  }

  const endingMap = new Map<number, number>();
  for (const it of endingItems) {
    endingMap.set(it.itemId, it.endingQty);
  }

  // Check every item has ending_qty and bounds validation:
  // 0 <= ending_qty <= import_qty + restock_qty - waste_qty
  for (const row of currentItems) {
    const endingQty = endingMap.get(row.item_id);
    if (endingQty === undefined || endingQty === null) {
      return {
        success: false,
        error: `Vui lòng nhập số lượng tồn cuối ngày cho món "${row.item_name || row.item_id}".`,
      };
    }

    const maxAllowed = row.import_qty + row.restock_qty - row.waste_qty;
    if (endingQty < 0) {
      return {
        success: false,
        error: `Số lượng tồn của "${row.item_name}" không được âm.`,
      };
    }
    if (endingQty > maxAllowed) {
      return {
        success: false,
        error: `Tồn cuối ngày của "${row.item_name}" (${endingQty}) không thể lớn hơn số lượng có thể bán (${maxAllowed} = nhập ${row.import_qty} + thêm ${row.restock_qty} - hao hụt ${row.waste_qty}).`,
      };
    }
  }

  if (cashCounted < 0) {
    return {
      success: false,
      error: "Tiền mặt kiểm đếm không được âm.",
    };
  }

  const closeTime = nowVN();

  // Run in ONE DB transaction
  await withTransaction(async (conn) => {
    for (const row of currentItems) {
      const endingQty = endingMap.get(row.item_id)!;
      await conn.execute(
        "UPDATE daily_stock SET ending_qty = ? WHERE work_date = ? AND item_id = ?",
        [endingQty, workDate, row.item_id]
      );
    }

    await conn.execute(
      "UPDATE business_days SET cash_counted = ?, closed_at = ? WHERE work_date = ?",
      [cashCounted, closeTime, workDate]
    );
  });

  // Fetch updated day with computed virtual columns
  const closedDay = await getBusinessDay(workDate);
  const updatedStock = await getDailyStockForDay(workDate);

  await insertAuditLog(
    "CLOSE_DAY",
    "business_days",
    workDate,
    {
      closedBy: actor.username,
      cashCounted,  
      totalRevenue: closedDay?.total_revenue,
      variance: closedDay?.variance,
    },
    closeTime
  );

  return {
    success: true,
    totalRevenue: closedDay?.total_revenue,
    variance: closedDay?.variance ?? 0,
    soldSummary: updatedStock.map((s) => ({
      itemId: s.item_id,
      soldQty: s.sold_qty ?? 0,
      subtotal: s.subtotal ?? 0,
    })),
  };
}

/**
 * Reopen a closed day (OWNER ONLY)
 */
export async function reopenClosedDay(
  workDate: string,
  actor: SessionPayload
): Promise<{ success: boolean; error?: string }> {
  if (actor.role !== "OWNER") {
    return { success: false, error: "Chỉ chủ quán mới có quyền mở lại ngày đã chốt." };
  }

  const day = await getBusinessDay(workDate);
  if (!day) return { success: false, error: "Không tìm thấy ngày bán." };
  if (day.closed_at === null) {
    return { success: false, error: "Ngày bán này đang mở, không cần mở lại." };
  }

  await reopenBusinessDay(workDate);

  await insertAuditLog(
    "REOPEN_DAY",
    "business_days",
    workDate,
    {
      reopenedBy: actor.username,
      previousClosedAt: day.closed_at,
      previousCashCounted: day.cash_counted,
    },
    nowVN()
  );

  return { success: true };
}

/**
 * Edit closed day data (OWNER ONLY, AUDITED)
 */
export async function editClosedDay(
  workDate: string,
  cashCounted: number,
  items: Array<{
    itemId: number;
    importQty: number;
    restockQty: number;
    wasteQty: number;
    endingQty: number | null;
  }>,
  actor: SessionPayload
): Promise<{ success: boolean; error?: string }> {
  if (actor.role !== "OWNER") {
    return { success: false, error: "Chỉ chủ quán mới có quyền chỉnh sửa ngày đã chốt." };
  }

  const dayBefore = await getBusinessDay(workDate);
  if (!dayBefore) return { success: false, error: "Không tìm thấy ngày bán." };

  const stockBefore = await getDailyStockForDay(workDate);

  // Validate bounds for all items
  for (const it of items) {
    const maxAllowed = it.importQty + it.restockQty - it.wasteQty;
    if (it.endingQty !== null && (it.endingQty < 0 || it.endingQty > maxAllowed)) {
      return {
        success: false,
        error: `Số lượng tồn món #${it.itemId} (${it.endingQty}) vượt quá giới hạn hợp lệ (0 đến ${maxAllowed}).`,
      };
    }
  }

  await withTransaction(async (conn) => {
    await conn.execute(
      "UPDATE business_days SET cash_counted = ? WHERE work_date = ?",
      [cashCounted, workDate]
    );

    for (const it of items) {
      await conn.execute(
        `UPDATE daily_stock 
         SET import_qty = ?, restock_qty = ?, waste_qty = ?, ending_qty = ?
         WHERE work_date = ? AND item_id = ?`,
        [it.importQty, it.restockQty, it.wasteQty, it.endingQty, workDate, it.itemId]
      );
    }
  });

  const dayAfter = await getBusinessDay(workDate);
  const stockAfter = await getDailyStockForDay(workDate);

  await insertAuditLog(
    "EDIT_CLOSED_DAY",
    "business_days",
    workDate,
    {
      editedBy: actor.username,
      before: { day: dayBefore, stock: stockBefore },
      after: { day: dayAfter, stock: stockAfter },
    },
    nowVN()
  );

  return { success: true };
}
