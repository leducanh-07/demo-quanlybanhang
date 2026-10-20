import { query } from "./pool";
import type { Account, AccountRole } from "@/types";

export async function getAccountById(id: number): Promise<Account | null> {
  const rows = await query<Account>(
    "SELECT id, username, role, password_hash, session_version FROM accounts WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

export async function getAccountByUsername(username: string): Promise<Account | null> {
  const rows = await query<Account>(
    "SELECT id, username, role, password_hash, session_version FROM accounts WHERE username = ?",
    [username]
  );
  return rows[0] || null;
}

export async function createAccount(
  username: string,
  role: AccountRole,
  passwordHash: string
): Promise<number> {
  const result: any = await query(
    "INSERT INTO accounts (username, role, password_hash, session_version) VALUES (?, ?, ?, 1)",
    [username, role, passwordHash]
  );
  return result.insertId;
}

export async function updatePasswordAndBumpSession(
  accountId: number,
  newPasswordHash: string
): Promise<void> {
  await query(
    "UPDATE accounts SET password_hash = ?, session_version = session_version + 1 WHERE id = ?",
    [newPasswordHash, accountId]
  );
}

export async function updateStationPassword(newPasswordHash: string): Promise<void> {
  await query(
    "UPDATE accounts SET password_hash = ?, session_version = session_version + 1 WHERE role = 'STATION'",
    [newPasswordHash]
  );
}
