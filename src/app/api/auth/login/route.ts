import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation";
import { loginService } from "@/server/services/authService";
import { jsonSuccess, jsonError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ", 400);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const result = await loginService(parsed.data.username, parsed.data.password, ip);

    if (!result.success) {
      return jsonError(result.error || "Đăng nhập thất bại", 401);
    }

    return jsonSuccess({
      role: result.role,
      redirect: result.role === "MANAGER" ? "/manager" : "/owner",
    });
  } catch (err: any) {
    console.error("Login route error:", err);
    return jsonError("Lỗi hệ thống khi đăng nhập", 500);
  }
}
