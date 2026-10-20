import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { shiftTimeEditSchema } from "@/lib/validation";
import { editShiftTimes } from "@/server/services/ownerService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["OWNER"]);
    const { id } = await context.params;
    const shiftId = Number(id);
    if (isNaN(shiftId)) return jsonError("ID ca không hợp lệ", 400);

    const body = await req.json();
    const parsed = shiftTimeEditSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const result = await editShiftTimes(
      shiftId,
      parsed.data.checkInTime,
      parsed.data.checkOutTime || null,
      session
    );

    if (!result.success) {
      return jsonError(result.error || "Không thể cập nhật ca làm", 400);
    }

    return jsonSuccess({ message: "Cập nhật giờ ca làm thành công" });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    return jsonError("Lỗi hệ thống khi cập nhật ca làm", 500);
  }
}
