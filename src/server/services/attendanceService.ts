import { searchActiveEmployees, getEmployeeById } from "../db/employees";
import {
  getOpenShiftByEmployee,
  clockIn,
  clockOut,
  listOpenShifts,
  listTodayShifts,
  getShiftById,
} from "../db/shifts";
import { nowVN, todayVN, formatTimeOnly } from "@/lib/time";
import type { Employee, Shift } from "@/types";

export interface AttendanceTodayResult {
  openShifts: Shift[];
  todayLog: Shift[];
}

export async function lookupEmployees(queryStr: string): Promise<Employee[]> {
  return searchActiveEmployees(queryStr);
}

export async function toggleAttendance(
  employeeId: number,
  actorRole: "OWNER" | "STATION"
): Promise<{
  success: boolean;
  action?: "CLOCK_IN" | "CLOCK_OUT";
  message?: string;
  employee?: Employee;
  time?: string;
  error?: string;
}> {
  if (actorRole !== "STATION") {
    return {
      success: false,
      error: "Tài khoản Chủ quán (OWNER) chỉ có quyền xem, không được chấm công.",
    };
  }

  const employee = await getEmployeeById(employeeId);
  if (!employee || !employee.is_active) {
    return {
      success: false,
      error: "Nhân viên không tồn tại hoặc đã ngừng hoạt động.",
    };
  }

  const openShift = await getOpenShiftByEmployee(employeeId);
  const currentTime = nowVN();
  const displayTime = formatTimeOnly(currentTime);

  if (openShift) {
    // Clock OUT
    // Constraint check: check_out_time >= check_in_time
    if (currentTime < openShift.check_in_time) {
      return {
        success: false,
        error: "Thời gian ra ca không thể trước thời gian vào ca.",
      };
    }

    await clockOut(openShift.id, currentTime);

    return {
      success: true,
      action: "CLOCK_OUT",
      message: `${employee.full_name} đã ra ca lúc ${displayTime}`,
      employee,
      time: currentTime,
    };
  } else {
    // Clock IN
    try {
      await clockIn(employeeId, currentTime);
      return {
        success: true,
        action: "CLOCK_IN",
        message: `${employee.full_name} đã vào ca lúc ${displayTime}`,
        employee,
        time: currentTime,
      };
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY" || err.message?.includes("uq_shifts_open_employee")) {
        return {
          success: false,
          error: `${employee.full_name} hiện đã có một ca đang mở. Vui lòng kiểm tra lại.`,
        };
      }
      throw err;
    }
  }
}

export async function getTodayAttendance(): Promise<AttendanceTodayResult> {
  const today = todayVN();
  const [openShifts, todayLog] = await Promise.all([
    listOpenShifts(),
    listTodayShifts(today),
  ]);
  return { openShifts, todayLog };
}
