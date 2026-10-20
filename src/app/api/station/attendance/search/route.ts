import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { lookupEmployees } from "@/server/services/attendanceService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["STATION", "OWNER"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const employees = await lookupEmployees(q);
    return jsonSuccess({ employees });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    return jsonError("Lỗi tìm kiếm nhân viên", 500);
  }
}
