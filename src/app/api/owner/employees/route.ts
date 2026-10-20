import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listAllEmployees, createEmployee } from "@/server/db/employees";
import { employeeFormSchema } from "@/lib/validation";
import { insertAuditLog } from "@/server/db/auditLogs";
import { nowVN } from "@/lib/time";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER"]);
    const employees = await listAllEmployees();
    return jsonSuccess({ employees });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền truy cập", 403);
    }
    return jsonError("Lỗi tải danh sách nhân viên", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["OWNER"]);
    const body = await req.json();
    const parsed = employeeFormSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const newId = await createEmployee(parsed.data.code, parsed.data.fullName);

    await insertAuditLog(
      "CREATE_EMPLOYEE",
      "employees",
      String(newId),
      { code: parsed.data.code, fullName: parsed.data.fullName, createdBy: session.username },
      nowVN()
    );

    return jsonSuccess({ message: "Thêm nhân viên thành công", id: newId });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return jsonError("Mã nhân viên này đã tồn tại trong hệ thống.", 400);
    }
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    return jsonError("Lỗi hệ thống khi tạo nhân viên", 500);
  }
}
