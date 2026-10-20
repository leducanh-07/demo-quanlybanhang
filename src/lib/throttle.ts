import { CONFIG } from "@/config";

interface ThrottleRecord {
  attempts: number;
  lockedUntil: number; // timestamp in ms
}

const throttleMap = new Map<string, ThrottleRecord>();

export function checkThrottle(username: string, ip: string): { isLocked: boolean; remainingSeconds: number } {
  const key = `${username.toLowerCase()}:${ip}`;
  const record = throttleMap.get(key);
  const now = Date.now();

  if (!record) {
    return { isLocked: false, remainingSeconds: 0 };
  }

  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  // Lock expired, reset if it was locked
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    throttleMap.delete(key);
  }

  return { isLocked: false, remainingSeconds: 0 };
}

export function recordFailedAttempt(username: string, ip: string): { isNowLocked: boolean; attempts: number } {
  const key = `${username.toLowerCase()}:${ip}`;
  const now = Date.now();
  const record = throttleMap.get(key) || { attempts: 0, lockedUntil: 0 };

  record.attempts += 1;
  if (record.attempts >= CONFIG.MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + CONFIG.LOCKOUT_MINUTES * 60 * 1000;
    throttleMap.set(key, record);
    return { isNowLocked: true, attempts: record.attempts };
  }

  throttleMap.set(key, record);
  return { isNowLocked: false, attempts: record.attempts };
}

export function resetThrottle(username: string, ip: string): void {
  const key = `${username.toLowerCase()}:${ip}`;
  throttleMap.delete(key);
}
