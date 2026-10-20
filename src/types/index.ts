export type AccountRole = "OWNER" | "MANAGER";

export function isAccountRole(value: unknown): value is AccountRole {
  return value === "OWNER" || value === "MANAGER";
}

export interface Account {
  id: number;
  username: string;
  role: AccountRole;
  password_hash: string;
  session_version: number;
}

export interface Employee {
  id: number;
  code: string;
  full_name: string;
  is_active: number | boolean;
}

export interface Shift {
  id: number;
  employee_id: number;
  check_in_time: string;
  check_out_time: string | null;
  open_employee_id?: number | null;
  // Joins
  employee_name?: string;
  employee_code?: string;
}

export interface Item {
  id: number;
  name: string;
  unit_price: number;
  image_url: string | null;
  image_address?: string | null;
  is_active: number | boolean;
}

export interface BusinessDay {
  work_date: string;
  cash_counted: number | null;
  closed_at: string | null;
  // Computed aggregations
  total_revenue?: number;
  variance?: number | null;
  item_count?: number;
}

export interface OwnerDashboardEmployeeHours {
  id: number;
  name: string;
  code: string;
  totalHours: number;
  shiftCount: number;
  totalHoursFormatted: number;
}

export interface OwnerDashboardTopItem {
  id: number;
  name: string;
  totalSold: number;
  totalRevenue: number;
}

export interface OwnerDashboardData {
  days: BusinessDay[];
  employeeHours: OwnerDashboardEmployeeHours[];
  topItems: OwnerDashboardTopItem[];
  abnormalDays: BusinessDay[];
}

export interface DailyStock {
  work_date: string;
  item_id: number;
  import_qty: number;
  restock_qty: number;
  waste_qty: number;
  ending_qty: number | null;
  unit_price: number;
  sold_qty: number | null;
  subtotal: number | null;
  // Joins
  item_name?: string;
  item_image_url?: string | null;
}

export interface StockCount {
  id: number;
  work_date: string;
  item_id: number;
  counted_qty: number;
  counted_at: string;
  // Joins
  item_name?: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entity_ref: string;
  detail: any;
  created_at: string;
}

export interface SessionPayload {
  accountId: number;
  username: string;
  role: AccountRole;
  sessionVersion: number;
  exp?: number;
}

export interface AlertItem {
  id: string;
  type: "variance" | "forgotten_shift" | "unclosed_day" | "stale_count" | "low_sales";
  level: "warning" | "danger" | "info";
  title: string;
  message: string;
  timestamp?: string;
}
