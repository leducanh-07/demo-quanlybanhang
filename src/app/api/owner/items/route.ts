import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listAllItems, createItem } from "@/server/db/items";
import { itemFormSchema } from "@/lib/validation";
import { insertAuditLog } from "@/server/db/auditLogs";
import { nowVN } from "@/lib/time";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER"]);
    const items = await listAllItems();
    return jsonSuccess({ items });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền truy cập", 403);
    }
    return jsonError("Lỗi tải danh sách món", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["OWNER"]);
    const body = await req.json();
    const parsed = itemFormSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const newId = await createItem(
      parsed.data.name,
      parsed.data.unitPrice,
      parsed.data.imageUrl,
      parsed.data.isActive
    );

    await insertAuditLog(
      "CREATE_ITEM",
      "items",
      String(newId),
      {
        name: parsed.data.name,
        unitPrice: parsed.data.unitPrice,
        imageUrl: parsed.data.imageUrl,
        isActive: parsed.data.isActive,
        createdBy: session.username,
      },
      nowVN()
    );

    return jsonSuccess({ message: "Thêm món thành công", id: newId });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return jsonError("Tên món này đã tồn tại trong thực đơn.", 400);
    }
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    return jsonError("Lỗi hệ thống khi thêm món", 500);
  }
}
