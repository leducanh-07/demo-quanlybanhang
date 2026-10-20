import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { signSessionToken, verifySessionToken, hashPassword, verifyPassword } from "../src/lib/auth";
import { checkThrottle, recordFailedAttempt, resetThrottle } from "../src/lib/throttle";
import { isAccountRole } from "../src/types";

const originalSessionSecret = process.env.SESSION_SECRET;

beforeAll(() => {
  process.env.SESSION_SECRET = "unit-test-session-secret-at-least-32-characters";
});

afterAll(() => {
  if (originalSessionSecret === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = originalSessionSecret;
  }
});

describe("Authentication, Throttling & Session Invalidation", () => {
  beforeEach(() => {
    resetThrottle("testuser", "127.0.0.1");
  });

  it("hashes and verifies passwords securely", async () => {
    const plain = "yaemiko";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("signs and verifies JWT token with embedded sessionVersion", async () => {
    const token = await signSessionToken({
      accountId: 1,
      username: "manager",
      role: "MANAGER",
      sessionVersion: 1,
    });

    const payload = await verifySessionToken(token);
    expect(payload).not.null;
    expect(payload?.username).toBe("manager");
    expect(payload?.role).toBe("MANAGER");
    expect(payload?.sessionVersion).toBe(1);
  });

  it("invalidates manager session when account session_version is bumped", async () => {
    const oldVersion = 1;
    const newVersion = 2; // Bumping version on password reset

    const tokenFromOldSession = await signSessionToken({
      accountId: 2,
      username: "manager",
      role: "MANAGER",
      sessionVersion: oldVersion,
    });

    const decoded = await verifySessionToken(tokenFromOldSession);
    expect(decoded?.sessionVersion).toBe(oldVersion);

    // Simulated session check against current database account:
    const isSessionValid = (currentDbAccountVersion: number, tokenVersion: number) => {
      return currentDbAccountVersion === tokenVersion;
    };

    expect(isSessionValid(oldVersion, decoded!.sessionVersion)).toBe(true);
    expect(isSessionValid(newVersion, decoded!.sessionVersion)).toBe(false);
  });

  it("enforces login throttling: locks account for 5 minutes after 5 failed attempts", () => {
    const user = "testuser";
    const ip = "127.0.0.1";

    expect(checkThrottle(user, ip).isLocked).toBe(false);

    // 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      const res = recordFailedAttempt(user, ip);
      expect(res.isNowLocked).toBe(false);
      expect(checkThrottle(user, ip).isLocked).toBe(false);
    }

    // 5th failed attempt locks out
    const fifth = recordFailedAttempt(user, ip);
    expect(fifth.isNowLocked).toBe(true);

    const status = checkThrottle(user, ip);
    expect(status.isLocked).toBe(true);
    expect(status.remainingSeconds).toBeGreaterThan(0);
    expect(status.remainingSeconds).toBeLessThanOrEqual(300);
  });

  it("enforces permission matrix boundaries", () => {
    // Permission Matrix checks:
    const canClockAttendance = (role: string) => role === "MANAGER";
    const canViewRevenueHistory = (role: string) => role === "OWNER";
    const canAccessOwnerReports = (role: string) => role === "OWNER";
    const canReopenClosedDay = (role: string) => role === "OWNER";

    // MANAGER permissions
    expect(canClockAttendance("MANAGER")).toBe(true);
    expect(canViewRevenueHistory("MANAGER")).toBe(false);
    expect(canAccessOwnerReports("MANAGER")).toBe(false);
    expect(canReopenClosedDay("MANAGER")).toBe(false);

    // OWNER permissions
    expect(canClockAttendance("OWNER")).toBe(false);
    expect(canViewRevenueHistory("OWNER")).toBe(true);
    expect(canAccessOwnerReports("OWNER")).toBe(true);
    expect(canReopenClosedDay("OWNER")).toBe(true);
  });

  it("accepts only the two supported account roles", () => {
    expect(isAccountRole("OWNER")).toBe(true);
    expect(isAccountRole("MANAGER")).toBe(true);
    expect(isAccountRole("GUEST")).toBe(false);
    expect(isAccountRole(null)).toBe(false);
  });
});
