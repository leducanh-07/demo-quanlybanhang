"use client";

import { useMemo, useState } from "react";
import { Edit3, Image as ImageIcon, Minus, Plus, Search } from "lucide-react";
import { formatVND } from "@/lib/format";
import type { DailyStock, Item } from "@/types";

export type InventoryRow = DailyStock & {
  latestCountedQty?: number | null;
};

type ItemFilter = "all" | "active" | "inactive";

interface ItemInventoryGridProps {
  items: Item[];
  stockRows: InventoryRow[];
  canAdjustStock?: boolean;
  canEditItems?: boolean;
  importDraft?: Record<number, number>;
  onImportDraftChange?: (itemId: number, qty: number) => void;
  onRestock?: (itemId: number) => void;
  onWaste?: (itemId: number) => void;
  onEdit?: (item: Item) => void;
}

function isActive(item: Item): boolean {
  return item.is_active === true || item.is_active === 1;
}

export function ItemInventoryGrid({
  items,
  stockRows,
  canAdjustStock = false,
  canEditItems = false,
  importDraft,
  onImportDraftChange,
  onRestock,
  onWaste,
  onEdit,
}: ItemInventoryGridProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [brokenImages, setBrokenImages] = useState<Record<number, string>>({});
  const stockByItem = useMemo(
    () => new Map(stockRows.map((row) => [row.item_id, row])),
    [stockRows]
  );
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"));
    const matchesFilter =
      filter === "all" || (filter === "active" ? isActive(item) : !isActive(item));
    return matchesSearch && matchesFilter;
  });

  const filters: Array<{ key: ItemFilter; label: string }> = [
    { key: "all", label: "Tất cả" },
    { key: "active", label: "Đang bán" },
    { key: "inactive", label: "Ngưng bán" },
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên món..."
            aria-label="Tìm theo tên món"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc trạng thái món">
          {filters.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              aria-pressed={filter === option.key}
              className={`rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition ${
                filter === option.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm font-semibold text-slate-500">
          {items.length === 0 ? "Chưa có món nào trong thực đơn." : "Không tìm thấy món phù hợp."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const stock = stockByItem.get(item.id);
            const available = stock
              ? stock.import_qty + stock.restock_qty - stock.waste_qty
              : null;
            const endingQty = stock
              ? stock.ending_qty ?? stock.latestCountedQty ?? available
              : null;
            const active = isActive(item);
            const draftQty = importDraft?.[item.id] ?? 0;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex gap-4 p-4">
                  <div className="aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
                    {item.image_url && brokenImages[item.id] !== item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={() =>
                          setBrokenImages((current) => ({
                            ...current,
                            [item.id]: item.image_url || "",
                          }))
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageIcon className="h-8 w-8" aria-label="Chưa có hình ảnh" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-slate-900">{item.name}</h3>
                        <p className="mt-1 text-sm font-extrabold text-orange-600">
                          {formatVND(item.unit_price)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                          active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {active ? "Đang bán" : "Ngưng bán"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-50 px-1.5 py-2">
                        <span className="block text-[10px] font-bold uppercase text-slate-400">Đầu ngày</span>
                        <span className="mt-0.5 block text-sm font-black text-slate-800">
                          {stock ? stock.import_qty : importDraft ? draftQty : "—"}
                        </span>
                      </div>
                      <div className="rounded-lg bg-blue-50 px-1.5 py-2">
                        <span className="block text-[10px] font-bold uppercase text-blue-400">Nhập thêm</span>
                        <span className="mt-0.5 block text-sm font-black text-blue-700">
                          {stock?.restock_qty ?? 0}
                        </span>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-1.5 py-2">
                        <span className="block text-[10px] font-bold uppercase text-emerald-500">Tồn hôm nay</span>
                        <span className="mt-0.5 block text-sm font-black text-emerald-700">
                          {endingQty ?? "—"}
                        </span>
                      </div>
                    </div>
                    {stock && (
                      <p className="mt-2 text-[11px] font-semibold text-slate-500">
                        Hao hụt: <span className="font-extrabold text-amber-700">{stock.waste_qty}</span>
                      </p>
                    )}
                  </div>
                </div>

                {importDraft && onImportDraftChange && !stock && active && (
                  <div className="mx-4 mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <span className="text-xs font-bold text-slate-600">Số lượng đầu ngày</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Giảm số lượng đầu ngày ${item.name}`}
                        onClick={() => onImportDraftChange(item.id, Math.max(0, draftQty - 5))}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={draftQty}
                        onChange={(event) =>
                          onImportDraftChange(item.id, Math.max(0, Number(event.target.value) || 0))
                        }
                        aria-label={`Số lượng đầu ngày ${item.name}`}
                        className="w-16 bg-transparent text-center text-sm font-black text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        aria-label={`Tăng số lượng đầu ngày ${item.name}`}
                        onClick={() => onImportDraftChange(item.id, draftQty + 5)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {(canAdjustStock || canEditItems) && (
                  <div className="flex gap-2 border-t border-slate-100 p-3">
                    {canAdjustStock && stock && (
                      <>
                        <button
                          type="button"
                          onClick={() => onRestock?.(item.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-2 py-2.5 text-xs font-extrabold text-blue-700 hover:bg-blue-100"
                        >
                          <Plus className="h-4 w-4" />
                          Nhập kho
                        </button>
                        <button
                          type="button"
                          onClick={() => onWaste?.(item.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-2 py-2.5 text-xs font-extrabold text-amber-700 hover:bg-amber-100"
                        >
                          <Minus className="h-4 w-4" />
                          Trừ hao hụt / trả hàng
                        </button>
                      </>
                    )}
                    {canEditItems && (
                      <button
                        type="button"
                        onClick={() => onEdit?.(item)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-200"
                      >
                        <Edit3 className="h-4 w-4" />
                        Chỉnh sửa món & giá
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
