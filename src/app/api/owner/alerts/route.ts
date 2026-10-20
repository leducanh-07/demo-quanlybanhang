import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { computeOwnerAlerts } from "@/server/services/ownerService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER"]);
    const alerts = await computeOwnerAlerts();
    return jsonSuccess({ alerts });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    if (err.message === "FORBIDDEN") return jsonError("Không có quyền truy cập cảnh báo", 403);
    return jsonError("Lỗi tính toán cảnh báo", 500);
  }
}
