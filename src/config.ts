export const CONFIG = {
  // Business rule constants
  VARIANCE_ABS_VND: 20000,
  VARIANCE_PCT: 3,
  FORGOTTEN_SHIFT_HOURS: 14,
  STALE_COUNT_HOURS: 3,

  // Session lifetimes in days
  MANAGER_SESSION_DAYS: 30,
  OWNER_SESSION_DAYS: 7,

  // Login throttling
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 5,

  // Cookie name
  COOKIE_NAME: process.env.COOKIE_NAME || "fishball_session",
} as const;
