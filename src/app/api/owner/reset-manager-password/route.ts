import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resetManagerPasswordSchema } from "@/lib/validation";
import { resetManagerPasswordService } from "@/server/services/authService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const owner = await requireAuth(["OWNER"]);
    const body = await req.json();
    const parsed = resetManagerPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const result = await resetManagerPasswordService(
      owner,
      parsed.data.username,
      parsed.data.newPassword
    );
    if (!result.success) {
      return jsonError(result.error || "Không thể đặt lại mật khẩu", 400);
    }

    return jsonSuccess({ message: "Đã đặt lại mật khẩu quản lý và thu hồi các phiên đăng nhập." });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return jsonError("Vui lòng đăng nhập lại", 401);
    }
    if (err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    console.error("Manager password reset route error:", err);
    return jsonError("Lỗi hệ thống khi đặt lại mật khẩu quản lý", 500);
  }
}
