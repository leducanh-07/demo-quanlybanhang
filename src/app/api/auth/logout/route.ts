import { NextRequest } from "next/server";
import { logoutService } from "@/server/services/authService";
import { jsonSuccess } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  await logoutService();
  return jsonSuccess({ message: "Đã đăng xuất" });
}
