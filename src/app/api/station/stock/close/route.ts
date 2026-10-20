import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { closeDaySchema } from "@/lib/validation";
import { closeDay } from "@/server/services/stockService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["STATION"]);
    const body = await req.json();
    const parsed = closeDaySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu chốt ngày không hợp lệ", 400);
    }

    const { workDate } = body;
    if (!workDate) return jsonError("Thiếu ngày bán", 400);

    const result = await closeDay(
      workDate,
      parsed.data.cashCounted,
      parsed.data.items,
      session
    );

    if (!result.success) {
      return jsonError(result.error || "Không thể chốt sổ ngày bán", 400);
    }

    return jsonSuccess({
      message: `Đã chốt sổ ngày ${workDate} thành công`,
      totalRevenue: result.totalRevenue,
      variance: result.variance,
      soldSummary: result.soldSummary,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    if (err.message === "FORBIDDEN") return jsonError("Không có quyền chốt sổ", 403);
    return jsonError("Lỗi hệ thống khi chốt sổ ngày bán", 500);
  }
}
