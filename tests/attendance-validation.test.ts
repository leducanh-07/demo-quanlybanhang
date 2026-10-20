import { describe, it, expect } from "vitest";

describe("Attendance Logic & Rules", () => {
  const employees = [
    { id: 1, code: "NV001", full_name: "Nguyễn Văn An", is_active: 1 },
    { id: 2, code: "NV002", full_name: "Trần Thị Bình", is_active: 1 },
    { id: 3, code: "NV003", full_name: "Lê Hoàng Cường", is_active: 0 }, // inactive
  ];

  it("looks up employees by code (case-insensitive) or by name matching only active employees", () => {
    const lookup = (term: string) => {
      const q = term.trim().toLowerCase();
      return employees.filter(
        (e) =>
          e.is_active === 1 &&
          (e.code.toLowerCase() === q || e.full_name.toLowerCase().includes(q))
      );
    };

    // By exact code
    expect(lookup("nv001")).toHaveLength(1);
    expect(lookup("nv001")[0].full_name).toBe("Nguyễn Văn An");

    // By name
    expect(lookup("Bình")).toHaveLength(1);
    expect(lookup("Bình")[0].code).toBe("NV002");

    // Inactive employee is excluded
    expect(lookup("NV003")).toHaveLength(0);
    expect(lookup("Cường")).toHaveLength(0);
  });

  it("handles clock toggle transition (Clock-In -> Clock-Out -> Clock-In)", () => {
    let currentOpenShift: { id: number; check_in_time: string; check_out_time: string | null } | null = null;

    const clockToggle = (currentTime: string) => {
      if (currentOpenShift) {
        // Clock OUT
        currentOpenShift.check_out_time = currentTime;
        const closed = { ...currentOpenShift };
        currentOpenShift = null;
        return { action: "CLOCK_OUT", shift: closed };
      } else {
        // Clock IN
        currentOpenShift = { id: 101, check_in_time: currentTime, check_out_time: null };
        return { action: "CLOCK_IN", shift: { ...currentOpenShift } };
      }
    };

    // First tap: clocks IN
    const step1 = clockToggle("2026-10-20 08:00:00");
    expect(step1.action).toBe("CLOCK_IN");
    expect(step1.shift.check_out_time).toBeNull();

    // Second tap: clocks OUT
    const step2 = clockToggle("2026-10-20 16:30:00");
    expect(step2.action).toBe("CLOCK_OUT");
    expect(step2.shift.check_out_time).toBe("2026-10-20 16:30:00");

    // Third tap: clocks IN again
    const step3 = clockToggle("2026-10-20 17:00:00");
    expect(step3.action).toBe("CLOCK_IN");
    expect(step3.shift.check_out_time).toBeNull();
  });

  it("enforces check_out_time >= check_in_time", () => {
    const checkIn = "2026-10-20 08:30:00";
    const invalidCheckOut = "2026-10-20 08:15:00";
    const validCheckOut = "2026-10-20 12:00:00";

    const isValidClockOut = (inTime: string, outTime: string) => outTime >= inTime;

    expect(isValidClockOut(checkIn, invalidCheckOut)).toBe(false);
    expect(isValidClockOut(checkIn, validCheckOut)).toBe(true);
  });

  it("handles duplicate open shift unique constraint translation", () => {
    const duplicateKeyError = {
      code: "ER_DUP_ENTRY",
      message: "Duplicate entry '1' for key 'uq_shifts_open_employee'",
    };

    const translateError = (err: any, employeeName: string) => {
      if (err.code === "ER_DUP_ENTRY" || err.message?.includes("uq_shifts_open_employee")) {
        return `${employeeName} hiện đã có một ca đang mở. Vui lòng kiểm tra lại.`;
      }
      return "Lỗi chấm công";
    };

    const msg = translateError(duplicateKeyError, "Nguyễn Văn An");
    expect(msg).toBe("Nguyễn Văn An hiện đã có một ca đang mở. Vui lòng kiểm tra lại.");
  });
});
