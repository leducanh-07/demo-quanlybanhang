import { listOpenShifts, listShifts, updateShiftTimes, getShiftById } from "../db/shifts";
import {
  listBusinessDays,
  listUnclosedDays,
  getBusinessDay,
} from "../db/businessDays";
import { getDailyStockForDay } from "../db/dailyStock";
import { getLatestCountsForDay, getLatestCountTimestamp } from "../db/stockCounts";
import { listAllEmployees, listActiveEmployees } from "../db/employees";
import { listAllItems, listActiveItems } from "../db/items";
import { insertAuditLog } from "../db/auditLogs";
import { nowVN, todayVN, hoursBetween } from "@/lib/time";
import { CONFIG } from "@/config";
import type { AlertItem, Shift, BusinessDay, SessionPayload, OwnerDashboardData } from "@/types";
import { normalizeOwnerDashboardData } from "@/lib/ownerDashboard";

export interface LiveAttendanceView {
  shiftId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  checkInTime: string;
  hoursElapsed: number;
}

export interface LiveStockItemView {
  itemId: number;
  itemName: string;
  unitPrice: number;
  importQty: number;
  restockQty: number;
  wasteQty: number;
  latestCountedQty: number | null;
  impliedSoldSoFar: number;
  impliedRevenue: number;
}

export interface OwnerLiveView {
  todayDate: string;
  isDayOpen: boolean;
  dayClosedAt: string | null;
  cashCounted: number | null;
  totalRevenue: number;
  variance: number | null;
  activeStaff: LiveAttendanceView[];
  stockItems: LiveStockItemView[];
  latestCountTimestamp: string | null;
  runningRevenueEstimate: number;
  alerts: AlertItem[];
}

/**
 * Compute all active alerts for Owner
 */
export async function computeOwnerAlerts(): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];
  const today = todayVN();
  const currentNow = nowVN();

  // 1. Forgotten shifts (open > 14 hours)
  const openShifts = await listOpenShifts();
  for (const s of openShifts) {
    const elapsed = hoursBetween(s.check_in_time, currentNow);
    if (elapsed >= CONFIG.FORGOTTEN_SHIFT_HOURS) {
      alerts.push({
        id: `forgotten-shift-${s.id}`,
        type: "forgotten_shift",
        level: "warning",
        title: "Ca làm việc bị quên chốt",
        message: `Nhân viên ${s.employee_name} (${s.employee_code}) đã vào ca từ ${s.check_in_time} (${Math.floor(elapsed)} giờ trước) nhưng chưa ra ca.`,
        timestamp: s.check_in_time,
      });
    }
  }

  // 2. Unclosed days older than today
  const unclosedDays = await listUnclosedDays();
  for (const d of unclosedDays) {
    if (d.work_date < today) {
      alerts.push({
        id: `unclosed-day-${d.work_date}`,
        type: "unclosed_day",
        level: "danger",
        title: "Ngày bán cũ chưa chốt sổ",
        message: `Ngày bán ${d.work_date} chưa được chốt kiểm tiền và đóng sổ.`,
      });
    }
  }

  // 3. Stale mid-day stock count (> 3 hours while today is open)
  const todayDay = await getBusinessDay(today);
  if (todayDay && todayDay.closed_at === null) {
    const latestCountTime = await getLatestCountTimestamp(today);
    if (latestCountTime) {
      const hoursSinceCount = hoursBetween(latestCountTime, currentNow);
      if (hoursSinceCount >= CONFIG.STALE_COUNT_HOURS) {
        alerts.push({
          id: `stale-count-${today}`,
          type: "stale_count",
          level: "info",
          title: "Chưa kiểm kê định kỳ",
          message: `Lần kiểm kê kho gần nhất lúc ${latestCountTime} (${Math.floor(hoursSinceCount)} giờ trước). Quán cần thực hiện kiểm kê giữa ca.`,
          timestamp: latestCountTime,
        });
      }
    } else {
      // Never counted today yet
      alerts.push({
        id: `no-count-${today}`,
        type: "stale_count",
        level: "info",
        title: "Chưa có kiểm kê kho hôm nay",
        message: "Ngày hôm nay đang mở nhưng chưa có lần kiểm kê kho giữa ca nào.",
      });
    }
  }

  // 4. Abnormal variance in recent closed days
  const recentDays = await listBusinessDays();
  for (const d of recentDays.slice(0, 10)) {
    if (d.closed_at !== null && d.variance !== null && d.variance !== undefined) {
      const absVariance = Math.abs(d.variance);
      const revenue = d.total_revenue || 0;
      const pctThreshold = Math.round((revenue * CONFIG.VARIANCE_PCT) / 100);
      const threshold = Math.max(CONFIG.VARIANCE_ABS_VND, pctThreshold);

      if (absVariance > threshold) {
        alerts.push({
          id: `variance-${d.work_date}`,
          type: "variance",
          level: "danger",
          title: `Chênh lệch tiền mặt bất thường ngày ${d.work_date}`,
          message: `Chênh lệch ${d.variance > 0 ? "+" : ""}${d.variance.toLocaleString("vi-VN")}đ (vượt ngưỡng cho phép ${threshold.toLocaleString("vi-VN")}đ). Tiền kiểm: ${(d.cash_counted || 0).toLocaleString("vi-VN")}đ, Doanh thu: ${revenue.toLocaleString("vi-VN")}đ.`,
        });
      }
    }
  }

  // 5. Item sales drop < 50% of last 14 closed days average
  if (todayDay && todayDay.closed_at !== null) {
    // Only evaluate after day is closed or mid-day
    const past14Days = recentDays.filter((d) => d.closed_at !== null && d.work_date !== today).slice(0, 14);
    if (past14Days.length >= 3) {
      const pastStockList = await Promise.all(
        past14Days.map((d) => getDailyStockForDay(d.work_date))
      );

      const itemSalesTotals = new Map<number, { totalSold: number; count: number }>();
      for (const dayStock of pastStockList) {
        for (const it of dayStock) {
          const prev = itemSalesTotals.get(it.item_id) || { totalSold: 0, count: 0 };
          prev.totalSold += it.sold_qty || 0;
          prev.count += 1;
          itemSalesTotals.set(it.item_id, prev);
        }
      }

      const todayStock = await getDailyStockForDay(today);
      for (const it of todayStock) {
        const stats = itemSalesTotals.get(it.item_id);
        if (stats && stats.count > 0) {
          const avg = stats.totalSold / stats.count;
          const todaySold = it.sold_qty || 0;
          if (avg >= 5 && todaySold < 0.5 * avg) {
            alerts.push({
              id: `low-sales-${it.item_id}`,
              type: "low_sales",
              level: "warning",
              title: `Món bán chậm bất thường: ${it.item_name}`,
              message: `Hôm nay bán được ${todaySold} phần (thấp hơn 50% mức trung bình 14 ngày qua: ${Math.round(avg)} phần).`,
            });
          }
        }
      }
    }
  }

  return alerts;
}

/**
 * Live view for Owner with 20s polling
 */
export async function getOwnerLiveView(): Promise<OwnerLiveView> {
  const today = todayVN();
  const currentNow = nowVN();

  const [openShifts, currentDay, stockRows, latestCounts, latestTs, alerts] =
    await Promise.all([
      listOpenShifts(),
      getBusinessDay(today),
      getDailyStockForDay(today),
      getLatestCountsForDay(today),
      getLatestCountTimestamp(today),
      computeOwnerAlerts(),
    ]);

  const countMap = new Map<number, number>();
  for (const c of latestCounts) {
    countMap.set(c.item_id, c.counted_qty);
  }

  let runningRev = 0;
  const stockItems: LiveStockItemView[] = stockRows.map((row) => {
    const counted = countMap.get(row.item_id) ?? null;
    const available = row.import_qty + row.restock_qty - row.waste_qty;

    let impliedSold = 0;
    if (counted !== null) {
      impliedSold = Math.max(0, available - counted);
    } else if (row.ending_qty !== null && row.ending_qty !== undefined) {
      impliedSold = row.sold_qty ?? 0;
    }

    const impliedRev = impliedSold * row.unit_price;
    runningRev += impliedRev;

    return {
      itemId: row.item_id,
      itemName: row.item_name || `Món #${row.item_id}`,
      unitPrice: row.unit_price,
      importQty: row.import_qty,
      restockQty: row.restock_qty,
      wasteQty: row.waste_qty,
      latestCountedQty: counted,
      impliedSoldSoFar: impliedSold,
      impliedRevenue: impliedRev,
    };
  });

  const activeStaff: LiveAttendanceView[] = openShifts.map((s) => ({
    shiftId: s.id,
    employeeId: s.employee_id,
    employeeName: s.employee_name || "",
    employeeCode: s.employee_code || "",
    checkInTime: s.check_in_time,
    hoursElapsed: Math.round(hoursBetween(s.check_in_time, currentNow) * 10) / 10,
  }));

  return {
    todayDate: today,
    isDayOpen: currentDay ? currentDay.closed_at === null : false,
    dayClosedAt: currentDay?.closed_at || null,
    cashCounted: currentDay?.cash_counted || null,
    totalRevenue: currentDay?.total_revenue || 0,
    variance: currentDay?.variance ?? null,
    activeStaff,
    stockItems,
    latestCountTimestamp: latestTs,
    runningRevenueEstimate: currentDay?.closed_at ? (currentDay.total_revenue || 0) : runningRev,
    alerts,
  };
}

/**
 * Dashboard stats: revenue chart, top items, employee hours
 */
export async function getOwnerDashboardData(
  filters?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<OwnerDashboardData> {
  const days = await listBusinessDays(filters);
  const shifts = await listShifts({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
  });

  // 1. Employee hours worked: sum of check_out_time - check_in_time
  const empHoursMap = new Map<
    number,
    { id: number; name: string; code: string; totalHours: number; shiftCount: number }
  >();

  for (const s of shifts) {
    if (s.check_out_time) {
      const h = hoursBetween(s.check_in_time, s.check_out_time);
      const prev = empHoursMap.get(s.employee_id) || {
        id: s.employee_id,
        name: s.employee_name || "",
        code: s.employee_code || "",
        totalHours: 0,
        shiftCount: 0,
      };
      prev.totalHours += Math.max(0, h);
      prev.shiftCount += 1;
      empHoursMap.set(s.employee_id, prev);
    }
  }

  // 2. Top selling items across the selected days
  const itemSalesMap = new Map<
    number,
    { id: number; name: string; totalSold: number; totalRevenue: number }
  >();

  for (const d of days.filter((day) => day.closed_at !== null)) {
    const stock = await getDailyStockForDay(d.work_date);
    for (const it of stock) {
      const prev = itemSalesMap.get(it.item_id) || {
        id: it.item_id,
        name: it.item_name || "",
        totalSold: 0,
        totalRevenue: 0,
      };
      prev.totalSold += it.sold_qty || 0;
      prev.totalRevenue += it.subtotal || 0;
      itemSalesMap.set(it.item_id, prev);
    }
  }

  // 3. Days with abnormal variance
  const abnormalDays = days.filter((d) => {
    if (!d.closed_at || d.variance === null || d.variance === undefined) return false;
    const absVar = Math.abs(d.variance);
    const threshold = Math.max(CONFIG.VARIANCE_ABS_VND, Math.round(((d.total_revenue || 0) * CONFIG.VARIANCE_PCT) / 100));
    return absVar > threshold;
  });

  return normalizeOwnerDashboardData({
    days,
    employeeHours: Array.from(empHoursMap.values()).map((e) => ({
      ...e,
      totalHoursFormatted: Math.round(e.totalHours * 10) / 10,
    })),
    topItems: Array.from(itemSalesMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    ),
    abnormalDays,
  });
}

/**
 * Edit attendance times (OWNER only, audited)
 */
export async function editShiftTimes(
  shiftId: number,
  checkInTime: string,
  checkOutTime: string | null,
  actor: SessionPayload
): Promise<{ success: boolean; error?: string }> {
  if (actor.role !== "OWNER") {
    return { success: false, error: "Chỉ chủ quán mới có quyền sửa giờ ca làm việc." };
  }

  const shiftBefore = await getShiftById(shiftId);
  if (!shiftBefore) return { success: false, error: "Không tìm thấy ca làm việc." };

  if (checkOutTime && checkOutTime < checkInTime) {
    return { success: false, error: "Thời gian ra ca không thể trước thời gian vào ca." };
  }

  await updateShiftTimes(shiftId, checkInTime, checkOutTime);

  await insertAuditLog(
    "EDIT_SHIFT_TIME",
    "shifts",
    String(shiftId),
    {
      editedBy: actor.username,
      before: { checkInTime: shiftBefore.check_in_time, checkOutTime: shiftBefore.check_out_time },
      after: { checkInTime, checkOutTime },
    },
    nowVN()
  );

  return { success: true };
}

/**
 * CSV Generation for Revenue & Attendance
 */
export async function exportRevenueCSV(): Promise<string> {
  const days = await listBusinessDays();
  const header = "Ngày,Trạng thái,Tiền đếm được (VNĐ),Doanh thu (VNĐ),Chênh lệch (VNĐ),Giờ chốt sổ\n";
  const rows = days.map((d) => {
    const status = d.closed_at ? "Đã chốt" : "Đang mở";
    const cash = d.cash_counted ?? "";
    const rev = d.total_revenue ?? 0;
    const variance = d.variance ?? "";
    const closed = d.closed_at ?? "";
    return `"${d.work_date}","${status}","${cash}","${rev}","${variance}","${closed}"`;
  });
  return "\uFEFF" + header + rows.join("\n");
}

export async function exportAttendanceCSV(): Promise<string> {
  const shifts = await listShifts({});
  const header = "Mã NV,Họ tên,Giờ vào ca,Giờ ra ca,Số giờ làm việc\n";
  const rows = shifts.map((s) => {
    const code = s.employee_code || "";
    const name = s.employee_name || "";
    const inTime = s.check_in_time;
    const outTime = s.check_out_time || "Đang làm";
    let hours = "";
    if (s.check_out_time) {
      hours = (Math.round(hoursBetween(s.check_in_time, s.check_out_time) * 10) / 10).toString();
    }
    return `"${code}","${name}","${inTime}","${outTime}","${hours}"`;
  });
  return "\uFEFF" + header + rows.join("\n");
}
