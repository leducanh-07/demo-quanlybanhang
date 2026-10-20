import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getTodayStockState } from "@/server/services/stockService";
import { listActiveItems } from "@/server/db/items";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(["STATION", "OWNER"]);
    const [stockState, activeItems] = await Promise.all([
      getTodayStockState(),
      listActiveItems(),
    ]);

    // If day is closed and user is STATION, permission matrix says:
    // "design note: at closing, the STATION user enters cash_counted and sees the computed sold qty and revenue for THAT shift/day only; after the day is closed it disappears or is locked."
    return jsonSuccess({
      ...stockState,
      activeMenuItems: activeItems,
      canEdit: session.role === "STATION" && stockState.isOpen,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    return jsonError("Lỗi tải thông tin kho", 500);
  }
}
