import type { OwnerDashboardData } from "@/types";

export const EMPTY_OWNER_DASHBOARD: OwnerDashboardData = {
  days: [],
  employeeHours: [],
  topItems: [],
  abnormalDays: [],
};

export function normalizeOwnerDashboardData(
  raw: Partial<OwnerDashboardData> | null | undefined
): OwnerDashboardData {
  return {
    days: raw?.days ?? [],
    employeeHours: raw?.employeeHours ?? [],
    topItems: raw?.topItems ?? [],
    abnormalDays: raw?.abnormalDays ?? [],
  };
}
