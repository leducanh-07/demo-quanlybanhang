import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { adjustStockSchema } from "@/lib/validation";
import { addRestockQuantity } from "@/server/services/stockService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["MANAGER", "OWNER"]);
    const body = await req.json();
    const parsed = adjustStockSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const result = await addRestockQuantity(
      parsed.data.workDate,
      parsed.data.itemId,
      parsed.data.qty,
      session
    );

    if (!result.success) {
      return jsonError(result.error || "Không thể thêm hàng", 400);
    }

    return jsonSuccess({ message: "Đã thêm hàng thành công" });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    if (err.message === "FORBIDDEN") return jsonError("Không có quyền thực hiện", 403);
    return jsonError("Lỗi hệ thống khi thêm hàng", 500);
  }
}
