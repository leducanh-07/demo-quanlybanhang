import { describe, it, expect } from "vitest";

describe("Stock Day Closing & Lock Validation", () => {
  const currentItems = [
    { itemId: 1, name: "Cá viên chiên", importQty: 40, restockQty: 10, wasteQty: 2 }, // available: 48
    { itemId: 2, name: "Bò viên chiên", importQty: 30, restockQty: 0, wasteQty: 0 },  // available: 30
  ];

  it("requires ending_qty for every item of the day", () => {
    const validateClosingItems = (
      items: typeof currentItems,
      providedEndings: Record<number, number>
    ) => {
      for (const it of items) {
        if (providedEndings[it.itemId] === undefined) {
          return { valid: false, error: `Vui lòng nhập số lượng tồn cuối ngày cho món "${it.name}".` };
        }
      }
      return { valid: true };
    };

    // Missing item #2
    const res1 = validateClosingItems(currentItems, { 1: 5 });
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain('Vui lòng nhập số lượng tồn cuối ngày cho món "Bò viên chiên"');

    // Both provided
    const res2 = validateClosingItems(currentItems, { 1: 5, 2: 4 });
    expect(res2.valid).toBe(true);
  });

  it("rejects negative ending_qty and ending_qty exceeding available stock", () => {
    const validateBounds = (
      importQty: number,
      restockQty: number,
      wasteQty: number,
      endingQty: number
    ) => {
      const maxAllowed = importQty + restockQty - wasteQty;
      if (endingQty < 0) return { valid: false, error: "Số lượng tồn không được âm." };
      if (endingQty > maxAllowed) return { valid: false, error: "Tồn cuối ngày không thể lớn hơn số lượng có thể bán." };
      return { valid: true };
    };

    // Available = 40 + 10 - 2 = 48
    expect(validateBounds(40, 10, 2, -1).valid).toBe(false);
    expect(validateBounds(40, 10, 2, 49).valid).toBe(false);
    expect(validateBounds(40, 10, 2, 48).valid).toBe(true);
    expect(validateBounds(40, 10, 2, 0).valid).toBe(true);
  });

  it("rejects negative cash_counted", () => {
    const validateCash = (cash: number) => cash >= 0;
    expect(validateCash(-1000)).toBe(false);
    expect(validateCash(0)).toBe(true);
    expect(validateCash(500000)).toBe(true);
  });

  it("locks closed day for MANAGER and allows reopen only for OWNER", () => {
    const canModifyDay = (dayClosedAt: string | null, role: "MANAGER" | "OWNER") => {
      if (dayClosedAt !== null) {
        // Day is CLOSED
        return role === "OWNER";
      }
      // Day is OPEN
      return true;
    };

    expect(canModifyDay("2026-10-20 22:30:00", "MANAGER")).toBe(false);
    expect(canModifyDay("2026-10-20 22:30:00", "OWNER")).toBe(true);
    expect(canModifyDay(null, "MANAGER")).toBe(true);
  });
});
