import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getItemById, updateItem } from "@/server/db/items";
import { itemFormSchema } from "@/lib/validation";
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
    const itemId = Number(id);
    if (isNaN(itemId)) return jsonError("ID món không hợp lệ", 400);

    const existing = await getItemById(itemId);
    if (!existing) return jsonError("Không tìm thấy món", 404);

    const body = await req.json();
    const parsed = itemFormSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const priceChanged = existing.unit_price !== parsed.data.unitPrice;

    await updateItem(
      itemId,
      parsed.data.name,
      parsed.data.unitPrice,
      parsed.data.imageUrl,
      parsed.data.isActive
    );

    await insertAuditLog(
      priceChanged ? "ITEM_PRICE_CHANGE" : "UPDATE_ITEM",
      "items",
      String(itemId),
      {
        before: existing,
        after: {
          name: parsed.data.name,
          unitPrice: parsed.data.unitPrice,
          imageUrl: parsed.data.imageUrl,
          isActive: parsed.data.isActive,
        },
        updatedBy: session.username,
      },
      nowVN()
    );

    return jsonSuccess({ message: "Cập nhật món thành công" });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return jsonError("Tên món này đã trùng với món khác.", 400);
    }
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return jsonError("Không có quyền thực hiện", 403);
    }
    return jsonError("Lỗi hệ thống khi cập nhật món", 500);
  }
}
