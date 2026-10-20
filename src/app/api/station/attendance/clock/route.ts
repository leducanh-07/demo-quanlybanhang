import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { clockToggleSchema } from "@/lib/validation";
import { toggleAttendance } from "@/server/services/attendanceService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["STATION", "OWNER"]);

    // Enforce permission: OWNER cannot clock in/out
    if (session.role !== "STATION") {
      return jsonError("Tài khoản Chủ quán chỉ có quyền xem, không được chấm công.", 403);
    }

    const body = await req.json();
    const parsed = clockToggleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const result = await toggleAttendance(parsed.data.employeeId, session.role);
    if (!result.success) {
      return jsonError(result.error || "Không thể chấm công", 400);
    }

    return jsonSuccess({
      action: result.action,
      message: result.message,
      employee: result.employee,
      time: result.time,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    if (err.message === "FORBIDDEN") return jsonError("Không có quyền thực hiện", 403);
    return jsonError("Lỗi hệ thống khi chấm công", 500);
  }
}
