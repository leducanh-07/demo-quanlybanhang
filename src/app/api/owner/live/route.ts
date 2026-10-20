import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOwnerLiveView } from "@/server/services/ownerService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER"]);
    const liveView = await getOwnerLiveView();
    return jsonSuccess(liveView);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return jsonError("Chưa đăng nhập", 401);
    if (err.message === "FORBIDDEN") return jsonError("Chỉ chủ quán mới có quyền xem trang này", 403);
    return jsonError("Lỗi tải dữ liệu trực tiếp", 500);
  }
}
