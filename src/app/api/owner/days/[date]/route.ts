import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getBusinessDay } from "@/server/db/businessDays";
import { getDailyStockForDay } from "@/server/db/dailyStock";
import { editClosedDay } from "@/server/services/stockService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ date: string }> }
) {
  try {
    await requireAuth(["OWNER"]);
    const { date } = await context.params;
    const [day, stock] = await Promise.all([
      getBusinessDay(date),
      getDailyStockForDay(date),
    ]);

    if (!day) return jsonError("Không tìm thấy ngày bán", 404);

    return jsonSuccess({ day, stock });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền truy cập", 403);
    }
    return jsonError("Lỗi tải thông tin ngày bán", 500);
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ date: string }> }
) {
  try {
    const session = await requireAuth(["OWNER"]);
    const { date } = await context.params;
    const body = await req.json();

    const { cashCounted, items } = body;
    if (cashCounted === undefined || !Array.isArray(items)) {
      return jsonError("Dữ liệu không đầy đủ", 400);
    }

    const result = await editClosedDay(date, cashCounted, items, session);
    if (!result.success) {
      return jsonError(result.error || "Không thể cập nhật ngày bán", 400);
    }

    return jsonSuccess({ message: `Cập nhật ngày ${date} thành công` });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    return jsonError("Lỗi hệ thống khi cập nhật ngày bán", 500);
  }
}
