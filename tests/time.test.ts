import { describe, it, expect } from "vitest";
import {
  nowVN,
  todayVN,
  hoursBetween,
  durationSecondsBetween,
  formatDurationSeconds,
  formatTimeOnly,
  parseVNDateTime,
  formatDateVN,
} from "../src/lib/time";

describe("Vietnam Timezone Helpers (Asia/Ho_Chi_Minh)", () => {
  it("todayVN returns format YYYY-MM-DD", () => {
    const today = todayVN();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("nowVN returns format YYYY-MM-DD HH:MM:SS", () => {
    const now = nowVN();
    expect(now).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("converts a known UTC date correctly to Vietnam (+7 hours)", () => {
    // 2026-10-20T01:30:00Z should be 2026-10-20 08:30:00 in VN
    const utcDate = new Date(Date.UTC(2026, 9, 20, 1, 30, 0));
    expect(nowVN(utcDate)).toBe("2026-10-20 08:30:00");
    expect(todayVN(utcDate)).toBe("2026-10-20");
  });

  it("formatTimeOnly extracts HH:mm correctly", () => {
    expect(formatTimeOnly("2026-10-20 08:05:42")).toBe("08:05");
    expect(formatTimeOnly("2026-10-20 22:30:00")).toBe("22:30");
    expect(formatTimeOnly(null)).toBe("");
  });

  it("formatDateVN formats YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(formatDateVN("2026-10-20")).toBe("20/10/2026");
  });

  it("hoursBetween computes elapsed hours accurately", () => {
    const start = "2026-10-20 08:00:00";
    const end = "2026-10-20 15:30:00";
    expect(hoursBetween(start, end)).toBe(7.5);
  });

  it("formats work durations with exact hours, minutes, and seconds", () => {
    expect(durationSecondsBetween("2026-10-20 08:00:00", "2026-10-20 08:05:00")).toBe(300);
    expect(formatDurationSeconds(300)).toBe("0 giờ 5 phút 0 giây");
    expect(formatDurationSeconds(15 * 60 + 30)).toBe("0 giờ 15 phút 30 giây");
    expect(formatDurationSeconds(4 * 3600 + 45 * 60)).toBe("4 giờ 45 phút 0 giây");
  });
});
