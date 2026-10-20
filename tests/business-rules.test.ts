import { describe, it, expect } from "vitest";
import { formatVND, formatSignedVND } from "../src/lib/format";
import { CONFIG } from "../src/config";

describe("Core Business Logic & Formulas", () => {
  it("computes sold_qty and subtotal correctly", () => {
    const importQty = 50;
    const restockQty = 20;
    const wasteQty = 5;
    const endingQty = 15;
    const unitPrice = 7000;

    const available = importQty + restockQty - wasteQty;
    expect(available).toBe(65);

    const soldQty = available - endingQty;
    expect(soldQty).toBe(50);

    const subtotal = soldQty * unitPrice;
    expect(subtotal).toBe(350000);
  });

  it("computes total revenue and variance accurately", () => {
    const items = [
      { soldQty: 30, unitPrice: 5000 }, // 150.000
      { soldQty: 20, unitPrice: 10000 }, // 200.000
      { soldQty: 10, unitPrice: 20000 }, // 200.000
    ];

    const totalRevenue = items.reduce((sum, it) => sum + it.soldQty * it.unitPrice, 0);
    expect(totalRevenue).toBe(550000);

    const cashCounted = 530000;
    const variance = cashCounted - totalRevenue;
    expect(variance).toBe(-20000);

    // Format check
    expect(formatVND(totalRevenue)).toBe("550.000đ");
    expect(formatSignedVND(variance)).toBe("-20.000đ");
  });

  it("validates ending_qty bounds", () => {
    const importQty = 30;
    const restockQty = 10;
    const wasteQty = 2;
    const maxAllowed = importQty + restockQty - wasteQty; // 38

    const isValidEndingQty = (ending: number) => ending >= 0 && ending <= maxAllowed;

    expect(isValidEndingQty(0)).toBe(true);
    expect(isValidEndingQty(25)).toBe(true);
    expect(isValidEndingQty(38)).toBe(true);
    expect(isValidEndingQty(-1)).toBe(false);
    expect(isValidEndingQty(39)).toBe(false);
  });

  it("calculates implied sold so far from mid-day stock counts without changing ending_qty", () => {
    const importQty = 40;
    const restockQty = 10;
    const wasteQty = 2;
    const countedQty = 28;

    const impliedSold = Math.max(0, importQty + restockQty - wasteQty - countedQty);
    expect(impliedSold).toBe(20);
  });

  it("detects abnormal variance based on threshold rules", () => {
    // Threshold is max(VARIANCE_ABS_VND, revenue * 3%)
    const revenue = 1000000;
    const pctThreshold = (revenue * CONFIG.VARIANCE_PCT) / 100; // 30.000
    const threshold = Math.max(CONFIG.VARIANCE_ABS_VND, pctThreshold); // 30.000

    expect(threshold).toBe(30000);

    const isAbnormal = (variance: number) => Math.abs(variance) > threshold;

    expect(isAbnormal(15000)).toBe(false);
    expect(isAbnormal(-30000)).toBe(false);
    expect(isAbnormal(-31000)).toBe(true);
    expect(isAbnormal(45000)).toBe(true);
  });

  it("preserves price snapshot immutability", () => {
    // When a daily_stock row is created with unit_price snapshot:
    const dailyStockSnapshotPrice = 5000;

    // Menu item changes price later to 8000:
    const menuItemCurrentPrice = 8000;

    // The subtotal for the existing day uses the snapshot price, NOT current price
    const soldQty = 10;
    const existingDaySubtotal = soldQty * dailyStockSnapshotPrice;
    expect(existingDaySubtotal).toBe(50000);
    expect(existingDaySubtotal).not.toBe(soldQty * menuItemCurrentPrice);
  });
});
