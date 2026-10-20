import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getTodayStockState } from "@/server/services/stockService";
import { listActiveItems, listAllItems } from "@/server/db/items";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(["MANAGER", "OWNER"]);
    const [stockState, menuItems, activeMenuItems] = await Promise.all([
      getTodayStockState(),
      listAllItems(),
      listActiveItems(),
    ]);

    // If day is closed and user is MANAGER, permission matrix says:
    // "design note: at closing, the MANAGER user enters cash_counted and sees the computed sold qty and revenue for THAT shift/day only; after the day is closed it disappears or is locked."
    return jsonSuccess({
      ...stockState,
      activeMenuItems,
      menuItems,
      canEdit: session.role === "MANAGER" && stockState.isOpen,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    return jsonError("Lỗi tải thông tin kho", 500);
  }
}
