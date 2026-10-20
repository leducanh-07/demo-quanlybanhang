import { getAccountByUsername, updatePasswordAndBumpSession, updateStationPassword } from "../db/accounts";
import { hashPassword, verifyPassword, signSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { checkThrottle, recordFailedAttempt, resetThrottle } from "@/lib/throttle";
import { insertAuditLog } from "../db/auditLogs";
import { nowVN } from "@/lib/time";
import type { SessionPayload } from "@/types";

export async function loginService(
  username: string,
  plainPassword: string,
  ip: string
): Promise<{ success: boolean; role?: "OWNER" | "STATION"; error?: string }> {
  // Check throttle
  const throttle = checkThrottle(username, ip);
  if (throttle.isLocked) {
    const minutes = Math.ceil(throttle.remainingSeconds / 60);
    return {
      success: false,
      error: `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
    };
  }

  const account = await getAccountByUsername(username);
  if (!account) {
    recordFailedAttempt(username, ip);
    return { success: false, error: "Tên đăng nhập hoặc mật khẩu không chính xác." };
  }

  const isMatch = await verifyPassword(plainPassword, account.password_hash);
  if (!isMatch) {
    const res = recordFailedAttempt(username, ip);
    if (res.isNowLocked) {
      return {
        success: false,
        error: "Đăng nhập sai quá 5 lần. Tài khoản bị tạm khóa 5 phút.",
      };
    }
    return { success: false, error: "Tên đăng nhập hoặc mật khẩu không chính xác." };
  }

  // Success: reset throttle
  resetThrottle(username, ip);

  const token = await signSessionToken({
    accountId: account.id,
    username: account.username,
    role: account.role,
    sessionVersion: account.session_version,
  });

  await setSessionCookie(token, account.role);

  return { success: true, role: account.role };
}

export async function logoutService(): Promise<void> {
  await clearSessionCookie();
}

export async function changeOwnPasswordService(
  session: SessionPayload,
  currentPlain: string,
  newPlain: string
): Promise<{ success: boolean; error?: string }> {
  const account = await getAccountByUsername(session.username);
  if (!account) {
    return { success: false, error: "Tài khoản không tồn tại." };
  }

  const isMatch = await verifyPassword(currentPlain, account.password_hash);
  if (!isMatch) {
    return { success: false, error: "Mật khẩu hiện tại không đúng." };
  }

  const newHash = await hashPassword(newPlain);
  await updatePasswordAndBumpSession(account.id, newHash);

  await insertAuditLog(
    "ACCOUNT_CHANGE_PASSWORD",
    "accounts",
    String(account.id),
    { username: account.username },
    nowVN()
  );

  return { success: true };
}

export async function resetStationPasswordService(
  session: SessionPayload,
  newPlain: string
): Promise<{ success: boolean; error?: string }> {
  if (session.role !== "OWNER") {
    return { success: false, error: "Chỉ chủ quán mới có quyền đổi mật khẩu trạm." };
  }

  const newHash = await hashPassword(newPlain);
  await updateStationPassword(newHash);

  await insertAuditLog(
    "STATION_PASSWORD_RESET",
    "accounts",
    "station",
    { resetBy: session.username },
    nowVN()
  );

  return { success: true };
}
