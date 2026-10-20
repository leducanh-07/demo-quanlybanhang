import { query } from "./pool";
import type { Item } from "@/types";

export async function getItemById(id: number): Promise<Item | null> {
  const rows = await query<Item>(
    "SELECT id, name, unit_price, image_url, is_active FROM items WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

export async function listActiveItems(): Promise<Item[]> {
  return query<Item>(
    "SELECT id, name, unit_price, image_url, is_active FROM items WHERE is_active = 1 ORDER BY id ASC"
  );
}

export async function listAllItems(): Promise<Item[]> {
  return query<Item>(
    "SELECT id, name, unit_price, image_url, is_active FROM items ORDER BY id ASC"
  );
}

export async function createItem(
  name: string,
  unitPrice: number,
  imageUrl?: string | null,
  isActive: boolean = false
): Promise<number> {
  const result: any = await query(
    "INSERT INTO items (name, unit_price, image_url, is_active) VALUES (?, ?, ?, ?)",
    [name.trim(), unitPrice, imageUrl?.trim() || null, isActive ? 1 : 0]
  );
  return result.insertId;
}

export async function updateItem(
  id: number,
  name: string,
  unitPrice: number,
  imageUrl?: string | null,
  isActive: boolean = true
): Promise<void> {
  await query(
    "UPDATE items SET name = ?, unit_price = ?, image_url = ?, is_active = ? WHERE id = ?",
    [name.trim(), unitPrice, imageUrl?.trim() || null, isActive ? 1 : 0, id]
  );
}

export async function deactivateItem(id: number): Promise<void> {
  await query("UPDATE items SET is_active = 0 WHERE id = ?", [id]);
}
