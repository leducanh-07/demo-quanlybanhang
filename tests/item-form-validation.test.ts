import { describe, expect, it } from "vitest";
import { itemFormSchema } from "../src/lib/validation";

const item = {
  name: "Cá viên chiên",
  unitPrice: 10000,
};

describe("Item form active status", () => {
  it("defaults new items to inactive when the checkbox value is missing", () => {
    const parsed = itemFormSchema.safeParse(item);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.isActive).toBe(false);
  });

  it("preserves explicit boolean and integer active values", () => {
    expect(itemFormSchema.parse({ ...item, isActive: true }).isActive).toBe(true);
    expect(itemFormSchema.parse({ ...item, isActive: false }).isActive).toBe(false);
    expect(itemFormSchema.parse({ ...item, is_active: 1 }).isActive).toBe(true);
    expect(itemFormSchema.parse({ ...item, is_active: 0 }).isActive).toBe(false);
  });

  it("rejects non-boolean active values instead of coercing truthy strings", () => {
    expect(itemFormSchema.safeParse({ ...item, isActive: "false" }).success).toBe(false);
  });
});
