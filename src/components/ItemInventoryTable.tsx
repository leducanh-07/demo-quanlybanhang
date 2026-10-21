"use client";

import { useMemo, useState } from "react";
import { Edit3, Image as ImageIcon, Minus, Plus, Search } from "lucide-react";
import { formatVND } from "@/lib/format";
import type { DailyStock, Item } from "@/types";

export type InventoryRow = DailyStock & {
  latestCountedQty?: number | null;
};

type ItemFilter = "all" | "active" | "inactive";

interface ItemInventoryTableProps {
  items: Item[];
  stockRows: InventoryRow[];
  canAdjustStock?: boolean;
  canEditItems?: boolean;
  importDraft?: Record<number, string>;
  onImportDraftChange?: (itemId: number, value: string) => void;
  endingDraft?: Record<number, string>;
  onEndingDraftChange?: (itemId: number, value: string) => void;
  onRestock?: (itemId: number) => void;
  onWaste?: (itemId: number) => void;
  onEdit?: (item: Item) => void;
}

function isActive(item: Item): boolean {
  return item.is_active === true || item.is_active === 1;
}

function numericValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function NumericCell({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      onBlur={(event) => {
        if (event.currentTarget.value.trim() === "") onChange("0");
      }}
      onWheel={(event) => event.currentTarget.blur()}
      aria-label={label}
      className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-2 text-center font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
    />
  );
}

export function ItemInventoryTable({
  items,
  stockRows,
  canAdjustStock = false,
  canEditItems = false,
  importDraft,
  onImportDraftChange,
  endingDraft,
  onEndingDraftChange,
  onRestock,
  onWaste,
  onEdit,
}: ItemInventoryTableProps) {
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
    <section className="space-y-4">
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
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Mặt hàng</th>
                <th className="px-3 py-3 text-right">Đơn giá</th>
                <th className="px-3 py-3 text-center">Đầu ngày</th>
                <th className="px-3 py-3 text-center">Nhập thêm</th>
                <th className="px-3 py-3 text-center">Hao hụt</th>
                <th className="px-3 py-3 text-center">Tồn hôm nay</th>
                <th className="px-3 py-3 text-center">Đã bán</th>
                <th className="px-3 py-3 text-right">Tạm tính</th>
                {(canEditItems || canAdjustStock) && <th className="px-3 py-3 text-center">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredItems.map((item) => {
                const stock = stockByItem.get(item.id);
                const active = isActive(item);
                const available = stock
                  ? stock.import_qty + stock.restock_qty - stock.waste_qty
                  : null;
                const imported = stock?.import_qty ?? numericValue(importDraft?.[item.id]);
                const enteredEnding = endingDraft?.[item.id];
                const endingValue =
                  enteredEnding !== undefined
                    ? enteredEnding
                    : stock?.ending_qty !== null && stock?.ending_qty !== undefined
                      ? String(stock.ending_qty)
                      : stock?.latestCountedQty !== null && stock?.latestCountedQty !== undefined
                        ? String(stock.latestCountedQty)
                        : "";
                const hasEnding =
                  enteredEnding !== undefined
                    ? enteredEnding.trim() !== ""
                    : stock?.ending_qty !== null && stock?.ending_qty !== undefined
                      ? true
                      : stock?.latestCountedQty !== null && stock?.latestCountedQty !== undefined;
                const ending = numericValue(endingValue);
                const sold = available !== null && hasEnding ? available - ending : null;
                const revenue = sold === null ? null : sold * (stock?.unit_price ?? item.unit_price);
                const canEditImport = Boolean(
                  importDraft && onImportDraftChange && !stock && active
                );
                const canEditEnding = Boolean(endingDraft && onEndingDraftChange && stock && active);

                return (
                  <tr key={item.id} className="align-middle hover:bg-slate-50/70">
                    <td className="px-3 py-3">
                      <div className="flex min-w-[190px] items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {item.image_url && brokenImages[item.id] !== item.image_url ? (
                            <img
                              src={item.image_url}
                              alt=""
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
                              <ImageIcon className="h-5 w-5" aria-label="Chưa có hình ảnh" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{item.name}</p>
                          <span
                            className={`text-[10px] font-extrabold ${
                              active ? "text-green-700" : "text-slate-500"
                            }`}
                          >
                            {active ? "Đang bán" : "Ngưng bán"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-700">
                      {formatVND(stock?.unit_price ?? item.unit_price)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {canEditImport ? (
                        <NumericCell
                          value={importDraft?.[item.id] ?? ""}
                          label={`Đầu ngày ${item.name}`}
                          onChange={(value) => onImportDraftChange?.(item.id, value)}
                        />
                      ) : (
                        <span className="font-bold text-slate-800">
                          {stock ? stock.import_qty : importDraft ? imported : "—"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center">
                      <span className="font-bold text-blue-700">+{stock?.restock_qty ?? 0}</span>
                      {canAdjustStock && stock && (
                        <button
                          type="button"
                          onClick={() => onRestock?.(item.id)}
                          aria-label={`Nhập thêm ${item.name}`}
                          className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center">
                      <span className="font-bold text-amber-700">-{stock?.waste_qty ?? 0}</span>
                      {canAdjustStock && stock && (
                        <button
                          type="button"
                          onClick={() => onWaste?.(item.id)}
                          aria-label={`Ghi nhận hao hụt ${item.name}`}
                          className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {canEditEnding ? (
                        <NumericCell
                          value={endingValue}
                          label={`Tồn hôm nay ${item.name}`}
                          onChange={(value) => onEndingDraftChange?.(item.id, value)}
                        />
                      ) : (
                        <span className="font-bold text-slate-800">
                          {endingValue === "" ? "—" : endingValue}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-emerald-700">
                      {sold === null ? "—" : sold}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-black text-slate-900">
                      {revenue === null ? "—" : formatVND(revenue)}
                    </td>
                    {(canEditItems || canAdjustStock) && (
                      <td className="px-3 py-3 text-center">
                        {canEditItems && (
                          <button
                            type="button"
                            onClick={() => onEdit?.(item)}
                            aria-label={`Chỉnh sửa ${item.name}`}
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Sửa
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
