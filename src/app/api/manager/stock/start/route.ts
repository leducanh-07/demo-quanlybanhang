import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { startDaySchema } from "@/lib/validation";
import { startDay } from "@/server/services/stockService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["MANAGER"]);
    const body = await req.json();
    const parsed = startDaySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const result = await startDay(parsed.data.items, session);
    if (!result.success) {
      return jsonError(result.error || "Không thể mở ngày bán", 400);
    }

    return jsonSuccess({
      message: `Đã mở ngày bán ${result.workDate} thành công`,
      workDate: result.workDate,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    if (err.message === "FORBIDDEN") return jsonError("Không có quyền mở ngày bán", 403);
    return jsonError("Lỗi hệ thống khi mở ngày bán", 500);
  }
}
