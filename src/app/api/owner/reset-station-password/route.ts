import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resetStationPasswordSchema } from "@/lib/validation";
import { resetStationPasswordService } from "@/server/services/authService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["OWNER"]);
    const body = await req.json();
    const parsed = resetStationPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Mật khẩu không hợp lệ", 400);
    }

    const result = await resetStationPasswordService(session, parsed.data.newPassword);
    if (!result.success) {
      return jsonError(result.error || "Không thể đặt lại mật khẩu", 400);
    }

    return jsonSuccess({
      message: "Đã đặt lại mật khẩu tài khoản trạm. Mọi phiên đăng nhập của trạm đã bị thu hồi.",
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    return jsonError("Lỗi hệ thống khi đặt lại mật khẩu trạm", 500);
  }
}
