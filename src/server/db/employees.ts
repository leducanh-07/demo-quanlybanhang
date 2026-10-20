import { query } from "./pool";
import type { Employee } from "@/types";

export async function getEmployeeById(id: number): Promise<Employee | null> {
  const rows = await query<Employee>(
    "SELECT id, code, full_name, is_active FROM employees WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

export async function getEmployeeByCode(code: string): Promise<Employee | null> {
  const rows = await query<Employee>(
    "SELECT id, code, full_name, is_active FROM employees WHERE LOWER(code) = LOWER(?)",
    [code.trim()]
  );
  return rows[0] || null;
}

/**
 * Lookup by exact code or name search. Only active employees.
 */
export async function searchActiveEmployees(searchTerm: string): Promise<Employee[]> {
  const term = searchTerm.trim();
  if (!term) {
    return listActiveEmployees();
  }

  // Exact code match gets first priority, or partial full_name match
  const rows = await query<Employee>(
    `SELECT id, code, full_name, is_active 
     FROM employees 
     WHERE is_active = 1 
       AND (LOWER(code) = LOWER(?) OR full_name LIKE ?)
     ORDER BY 
       CASE WHEN LOWER(code) = LOWER(?) THEN 0 ELSE 1 END,
       full_name ASC`,
    [term, `%${term}%`, term]
  );

  return rows;
}

export async function listActiveEmployees(): Promise<Employee[]> {
  return query<Employee>(
    "SELECT id, code, full_name, is_active FROM employees WHERE is_active = 1 ORDER BY code ASC"
  );
}

export async function listAllEmployees(): Promise<Employee[]> {
  return query<Employee>(
    "SELECT id, code, full_name, is_active FROM employees ORDER BY id ASC"
  );
}

export async function createEmployee(code: string, fullName: string): Promise<number> {
  const result: any = await query(
    "INSERT INTO employees (code, full_name, is_active) VALUES (?, ?, 1)",
    [code.trim(), fullName.trim()]
  );
  return result.insertId;
}

export async function updateEmployee(
  id: number,
  code: string,
  fullName: string,
  isActive: boolean
): Promise<void> {
  await query(
    "UPDATE employees SET code = ?, full_name = ?, is_active = ? WHERE id = ?",
    [code.trim(), fullName.trim(), isActive ? 1 : 0, id]
  );
}

export async function deactivateEmployee(id: number): Promise<void> {
  await query("UPDATE employees SET is_active = 0 WHERE id = ?", [id]);
}
