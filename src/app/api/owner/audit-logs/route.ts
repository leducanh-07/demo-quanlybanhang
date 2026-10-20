import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listAuditLogs } from "@/server/db/auditLogs";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER"]);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 100;
    const offset = Number(searchParams.get("offset")) || 0;

    const logs = await listAuditLogs(limit, offset);
    return jsonSuccess({ logs });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền truy cập nhật ký", 403);
    }
    return jsonError("Lỗi tải nhật ký hoạt động", 500);
  }
}
