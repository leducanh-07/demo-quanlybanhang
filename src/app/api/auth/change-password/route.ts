import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";
import { changeOwnPasswordService } from "@/server/services/authService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["OWNER", "MANAGER"]);
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const result = await changeOwnPasswordService(
      session,
      parsed.data.currentPassword,
      parsed.data.newPassword
    );

    if (!result.success) {
      return jsonError(result.error || "Không thể đổi mật khẩu", 400);
    }

    return jsonSuccess({ message: "Đổi mật khẩu thành công" });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return jsonError("Vui lòng đăng nhập lại", 401);
    }
    if (err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    return jsonError("Lỗi hệ thống khi đổi mật khẩu", 500);
  }
}
