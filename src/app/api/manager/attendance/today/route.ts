import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getTodayAttendance } from "@/server/services/attendanceService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["MANAGER"]);
    const data = await getTodayAttendance();
    return jsonSuccess(data);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    return jsonError("Lỗi tải thông tin ca hôm nay", 500);
  }
}
