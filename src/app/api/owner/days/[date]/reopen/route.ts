import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { reopenClosedDay } from "@/server/services/stockService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ date: string }> }
) {
  try {
    const session = await requireAuth(["OWNER"]);
    const { date } = await context.params;

    const result = await reopenClosedDay(date, session);
    if (!result.success) {
      return jsonError(result.error || "Không thể mở lại ngày bán", 400);
    }

    return jsonSuccess({ message: `Đã mở lại ngày ${date} thành công` });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    return jsonError("Lỗi hệ thống khi mở lại ngày bán", 500);
  }
}
