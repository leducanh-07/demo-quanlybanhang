import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getEmployeeById, updateEmployee, deactivateEmployee } from "@/server/db/employees";
import { employeeFormSchema } from "@/lib/validation";
import { insertAuditLog } from "@/server/db/auditLogs";
import { nowVN } from "@/lib/time";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["OWNER"]);
    const { id } = await context.params;
    const empId = Number(id);
    if (isNaN(empId)) return jsonError("ID nhân viên không hợp lệ", 400);

    const existing = await getEmployeeById(empId);
    if (!existing) return jsonError("Không tìm thấy nhân viên", 404);

    const body = await req.json();
    const parsed = employeeFormSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    await updateEmployee(
      empId,
      parsed.data.code,
      parsed.data.fullName,
      parsed.data.isActive
    );

    await insertAuditLog(
      "UPDATE_EMPLOYEE",
      "employees",
      String(empId),
      {
        before: existing,
        after: { code: parsed.data.code, fullName: parsed.data.fullName, isActive: parsed.data.isActive },
        updatedBy: session.username,
      },
      nowVN()
    );

    return jsonSuccess({ message: "Cập nhật nhân viên thành công" });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return jsonError("Mã nhân viên này đã trùng với nhân viên khác.", 400);
    }
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    return jsonError("Lỗi hệ thống khi cập nhật nhân viên", 500);
  }
}
