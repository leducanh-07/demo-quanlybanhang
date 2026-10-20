import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return jsonError("Chưa đăng nhập", 401);
  }

  return jsonSuccess({
    accountId: session.accountId,
    username: session.username,
    role: session.role,
  });
}
