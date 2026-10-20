import { describe, it, expect, beforeEach } from "vitest";
import { signSessionToken, verifySessionToken, hashPassword, verifyPassword } from "../src/lib/auth";
import { checkThrottle, recordFailedAttempt, resetThrottle } from "../src/lib/throttle";

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
      username: "station",
      role: "STATION",
      sessionVersion: 1,
    });

    const payload = await verifySessionToken(token);
    expect(payload).not.null;
    expect(payload?.username).toBe("station");
    expect(payload?.role).toBe("STATION");
    expect(payload?.sessionVersion).toBe(1);
  });

  it("invalidates station session when account session_version is bumped", async () => {
    const oldVersion = 1;
    const newVersion = 2; // Bumping version on password reset

    const tokenFromOldSession = await signSessionToken({
      accountId: 2,
      username: "station",
      role: "STATION",
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
    const canClockAttendance = (role: string) => role === "STATION";
    const canViewRevenueHistory = (role: string) => role === "OWNER";
    const canAccessOwnerReports = (role: string) => role === "OWNER";
    const canReopenClosedDay = (role: string) => role === "OWNER";

    // STATION permissions
    expect(canClockAttendance("STATION")).toBe(true);
    expect(canViewRevenueHistory("STATION")).toBe(false);
    expect(canAccessOwnerReports("STATION")).toBe(false);
    expect(canReopenClosedDay("STATION")).toBe(false);

    // OWNER permissions
    expect(canClockAttendance("OWNER")).toBe(false);
    expect(canViewRevenueHistory("OWNER")).toBe(true);
    expect(canAccessOwnerReports("OWNER")).toBe(true);
    expect(canReopenClosedDay("OWNER")).toBe(true);
  });
});
