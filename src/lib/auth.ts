import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { CONFIG } from "@/config";
import type { AccountRole, SessionPayload } from "@/types";
import { getAccountById } from "@/server/db/accounts";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "default_super_secret_fallback_key_32_chars_min"
);

/**
 * Hash password with bcrypt
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

/**
 * Verify password with bcrypt
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Sign session JWT with sliding expiration
 */
export async function signSessionToken(payload: {
  accountId: number;
  username: string;
  role: AccountRole;
  sessionVersion: number;
}): Promise<string> {
  const days = payload.role === "STATION" ? CONFIG.STATION_SESSION_DAYS : CONFIG.OWNER_SESSION_DAYS;
  const expSeconds = days * 24 * 60 * 60;

  return new SignJWT({
    accountId: payload.accountId,
    username: payload.username,
    role: payload.role,
    sessionVersion: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expSeconds}s`)
    .sign(SECRET_KEY);
}

/**
 * Verify JWT token string
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      accountId: payload.accountId as number,
      username: payload.username as string,
      role: payload.role as AccountRole,
      sessionVersion: payload.sessionVersion as number,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Get current session from Next.js cookies, checking against DB accounts.session_version
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CONFIG.COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // Validate session_version against current DB record
  try {
    const account = await getAccountById(payload.accountId);
    if (!account) return null;
    if (account.session_version !== payload.sessionVersion) {
      // Invalidated session!
      return null;
    }
    return payload;
  } catch (err) {
    // DB error or test fallback
    console.error("Session DB check error:", err);
    return null;
  }
}

/**
 * Set session cookie (httpOnly, SameSite=Lax, Secure in prod)
 */
export async function setSessionCookie(token: string, role: AccountRole): Promise<void> {
  const cookieStore = await cookies();
  const days = role === "STATION" ? CONFIG.STATION_SESSION_DAYS : CONFIG.OWNER_SESSION_DAYS;
  const maxAge = days * 24 * 60 * 60;

  cookieStore.set(CONFIG.COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CONFIG.COOKIE_NAME);
}

/**
 * Server-side guard: requires a specific role or throws/returns null
 */
export async function requireAuth(allowedRoles: AccountRole[] = ["OWNER", "STATION"]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (!allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
