import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { recordCountSchema } from "@/lib/validation";
import { recordMidDayCounts } from "@/server/services/stockService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["MANAGER"]);
    const body = await req.json();
    const parsed = recordCountSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const { workDate } = body;
    if (!workDate) return jsonError("Thiếu ngày bán", 400);

    const result = await recordMidDayCounts(workDate, parsed.data.items, session);
    if (!result.success) {
      return jsonError(result.error || "Không thể lưu kiểm kê", 400);
    }

    return jsonSuccess({ message: "Đã lưu số liệu kiểm kê thành công" });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    if (err.message === "FORBIDDEN") return jsonError("Không có quyền thực hiện", 403);
    return jsonError("Lỗi hệ thống khi lưu kiểm kê", 500);
  }
}
