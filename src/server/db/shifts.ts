import { query } from "./pool";
import type { Shift } from "@/types";

export async function getShiftById(id: number): Promise<Shift | null> {
  const rows = await query<Shift>(
    `SELECT s.id, s.employee_id, s.check_in_time, s.check_out_time, s.open_employee_id,
            e.full_name as employee_name, e.code as employee_code
     FROM shifts s
     JOIN employees e ON s.employee_id = e.id
     WHERE s.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function getOpenShiftByEmployee(employeeId: number): Promise<Shift | null> {
  const rows = await query<Shift>(
    `SELECT s.id, s.employee_id, s.check_in_time, s.check_out_time, s.open_employee_id,
            e.full_name as employee_name, e.code as employee_code
     FROM shifts s
     JOIN employees e ON s.employee_id = e.id
     WHERE s.employee_id = ? AND s.check_out_time IS NULL`,
    [employeeId]
  );
  return rows[0] || null;
}

export async function clockIn(employeeId: number, checkInTime: string): Promise<number> {
  const result: any = await query(
    "INSERT INTO shifts (employee_id, check_in_time) VALUES (?, ?)",
    [employeeId, checkInTime]
  );
  return result.insertId;
}

export async function clockOut(shiftId: number, checkOutTime: string): Promise<void> {
  await query(
    "UPDATE shifts SET check_out_time = ? WHERE id = ? AND check_out_time IS NULL",
    [checkOutTime, shiftId]
  );
}

export async function listOpenShifts(): Promise<Shift[]> {
  return query<Shift>(
    `SELECT s.id, s.employee_id, s.check_in_time, s.check_out_time, s.open_employee_id,
            e.full_name as employee_name, e.code as employee_code
     FROM shifts s
     JOIN employees e ON s.employee_id = e.id
     WHERE s.check_out_time IS NULL
     ORDER BY s.check_in_time ASC`
  );
}

export async function listTodayShifts(todayDate: string): Promise<Shift[]> {
  // Includes shifts checked in today, or shifts currently open
  return query<Shift>(
    `SELECT s.id, s.employee_id, s.check_in_time, s.check_out_time, s.open_employee_id,
            e.full_name as employee_name, e.code as employee_code
     FROM shifts s
     JOIN employees e ON s.employee_id = e.id
     WHERE DATE(s.check_in_time) = ? OR s.check_out_time IS NULL
     ORDER BY s.check_in_time DESC`,
    [todayDate]
  );
}

export async function listShifts(filters: {
  employeeId?: number;
  startDate?: string;
  endDate?: string;
  isOpenOnly?: boolean;
}): Promise<Shift[]> {
  const whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (filters.employeeId) {
    whereClauses.push("s.employee_id = ?");
    params.push(filters.employeeId);
  }

  if (filters.startDate) {
    whereClauses.push("s.check_in_time >= ?");
    params.push(`${filters.startDate} 00:00:00`);
  }

  if (filters.endDate) {
    whereClauses.push("s.check_in_time <= ?");
    params.push(`${filters.endDate} 23:59:59`);
  }

  if (filters.isOpenOnly) {
    whereClauses.push("s.check_out_time IS NULL");
  }

  const sql = `
    SELECT s.id, s.employee_id, s.check_in_time, s.check_out_time, s.open_employee_id,
           e.full_name as employee_name, e.code as employee_code
    FROM shifts s
    JOIN employees e ON s.employee_id = e.id
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY s.check_in_time DESC
  `;

  return query<Shift>(sql, params);
}

export async function updateShiftTimes(
  id: number,
  checkInTime: string,
  checkOutTime: string | null
): Promise<void> {
  await query(
    "UPDATE shifts SET check_in_time = ?, check_out_time = ? WHERE id = ?",
    [checkInTime, checkOutTime, id]
  );
}
