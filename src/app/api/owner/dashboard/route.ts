import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOwnerDashboardData } from "@/server/services/ownerService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER"]);
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await getOwnerDashboardData({ startDate, endDate });
    return jsonSuccess(data);
  } catch (err: unknown) {
    console.error("[GET /api/owner/dashboard]", err);
    const message = err instanceof Error ? err.message : String(err);
    if (message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    if (message === "FORBIDDEN") return jsonError("Không có quyền truy cập báo cáo", 403);
    return jsonError("Lỗi tải dữ liệu báo cáo", 500);
  }
}
