import { query } from "./pool";
import type { AuditLog } from "@/types";

export async function insertAuditLog(
  action: string,
  entity: string,
  entityRef: string,
  detail: any,
  createdAt: string
): Promise<number> {
  const detailJson = detail !== undefined ? JSON.stringify(detail) : null;
  const result: any = await query(
    "INSERT INTO audit_logs (action, entity, entity_ref, detail, created_at) VALUES (?, ?, ?, ?, ?)",
    [action, entity, entityRef, detailJson, createdAt]
  );
  return result.insertId;
}

export async function listAuditLogs(limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
  const rows = await query<any>(
    "SELECT id, action, entity, entity_ref, detail, created_at FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );

  return rows.map((r: any) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entity_ref: r.entity_ref,
    detail: typeof r.detail === "string" ? JSON.parse(r.detail) : r.detail,
    created_at: r.created_at,
  }));
}
