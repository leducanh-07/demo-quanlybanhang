"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Package,
  Search,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  TrendingUp,
  Coins,
  ClipboardList,
  AlertCircle,
  X,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { formatVND, formatSignedVND } from "@/lib/format";
import { formatTimeOnly, formatDateTimeVN, todayVN } from "@/lib/time";
import type { Employee, Shift, Item } from "@/types";
import { ItemInventoryGrid } from "@/components/ItemInventoryGrid";

interface StockStateResponse {
  day: any;
  items: any[];
  isOpen: boolean;
  isToday: boolean;
  unclosedOlderDays: any[];
  latestCountTimestamp: string | null;
  estimatedRevenue: number;
  activeMenuItems: Item[];
  menuItems: Item[];
  canEdit: boolean;
}

export default function ManagerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"attendance" | "stock">("attendance");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // -------------------------------------------------------------
  // ATTENDANCE STATE
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [matchedEmployees, setMatchedEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [todayLog, setTodayLog] = useState<Shift[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // STOCK STATE
  // -------------------------------------------------------------
  const [stockState, setStockState] = useState<StockStateResponse | null>(null);
  const [importDraft, setImportDraft] = useState<Record<number, number>>({});

  // Modals for Stock operations
  const [modalType, setModalType] = useState<"restock" | "waste" | "count" | "close" | null>(null);
  const [modalItemId, setModalItemId] = useState<number | null>(null);
  const [modalQty, setModalQty] = useState<number>(1);
  const [countDraft, setCountDraft] = useState<Record<number, number>>({});
  const [closingCash, setClosingCash] = useState<number>(0);
  const [closingEndingQty, setClosingEndingQty] = useState<Record<number, number>>({});
  const [modalError, setModalError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadAttendanceData();
    loadStockData();
    loadLocalStorageDraft();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // ATTENDANCE LOGIC
  // -------------------------------------------------------------
  const loadAttendanceData = async () => {
    try {
      const res = await fetch("/api/manager/attendance/today");
      const data = await res.json();
      if (res.ok && data.success) {
        setOpenShifts(data.data.openShifts || []);
        setTodayLog(data.data.todayLog || []);
      } else if (res.status === 401) {
        router.push("/");
      }
    } catch (e) {
      console.error("Error loading attendance:", e);
    }
  };

  // Search employees on input
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/manager/attendance/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (res.ok && data.success) {
          const list: Employee[] = data.data.employees || [];
          setMatchedEmployees(list);
          if (list.length === 1 && searchQuery.trim().length >= 2) {
            setSelectedEmployee(list[0]);
          } else if (list.length === 0) {
            setSelectedEmployee(null);
          }
        }
      } catch (e) {
        console.error("Search error:", e);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClockToggle = async (emp: Employee) => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/attendance/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.data.message);
        setSearchQuery("");
        setSelectedEmployee(null);
        await loadAttendanceData();
        searchInputRef.current?.focus();
      } else {
        alert(data.error || "Không thể thực hiện chấm công");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const isEmployeeWorking = (empId: number) => {
    return openShifts.some((s) => s.employee_id === empId);
  };

  const getWorkingShift = (empId: number) => {
    return openShifts.find((s) => s.employee_id === empId);
  };

  // -------------------------------------------------------------
  // STOCK LOGIC & LOCALSTORAGE DRAFT
  // -------------------------------------------------------------
  const loadLocalStorageDraft = () => {
    try {
      const draft = localStorage.getItem("fishball_import_draft");
      if (draft) {
        setImportDraft(JSON.parse(draft));
      }
    } catch {}
  };

  const saveLocalStorageDraft = (draft: Record<number, number>) => {
    setImportDraft(draft);
    try {
      localStorage.setItem("fishball_import_draft", JSON.stringify(draft));
    } catch {}
  };

  const loadStockData = async () => {
    try {
      const res = await fetch("/api/manager/stock/today");
      const data = await res.json();
      if (res.ok && data.success) {
        setStockState(data.data);
      }
    } catch (e) {
      console.error("Error loading stock:", e);
    }
  };

  // Start Day action
  const handleStartDay = async () => {
    if (!stockState?.activeMenuItems || stockState.activeMenuItems.length === 0) {
      alert("Không có món nào trong thực đơn");
      return;
    }

    const itemsPayload = stockState.activeMenuItems.map((item) => ({
      itemId: item.id,
      importQty: importDraft[item.id] || 0,
    }));

    setLoading(true);
    try {
      const res = await fetch("/api/manager/stock/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsPayload }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.data.message);
        localStorage.removeItem("fishball_import_draft");
        setImportDraft({});
        await loadStockData();
      } else {
        alert(data.error || "Không thể bắt đầu ngày bán");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  // Restock action
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItemId || modalQty <= 0) return;
    setLoading(true);
    setModalError(null);
    try {
      const res = await fetch("/api/manager/stock/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: stockState?.day.work_date,
          itemId: modalItemId,
          qty: modalQty,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Đã thêm hàng thành công");
        setModalType(null);
        await loadStockData();
      } else {
        setModalError(data.error || "Không thể thêm hàng");
      }
    } catch {
      setModalError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  // Waste action
  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItemId || modalQty <= 0) return;
    setLoading(true);
    setModalError(null);
    try {
      const res = await fetch("/api/manager/stock/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: stockState?.day.work_date,
          itemId: modalItemId,
          qty: modalQty,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Đã ghi nhận hao hụt");
        setModalType(null);
        await loadStockData();
      } else {
        setModalError(data.error || "Không thể ghi nhận hao hụt");
      }
    } catch {
      setModalError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  // Mid-Day Count action
  const openCountModal = () => {
    if (!stockState?.items) return;
    const initial: Record<number, number> = {};
    for (const it of stockState.items) {
      initial[it.item_id] = it.latestCountedQty ?? (it.import_qty + it.restock_qty - it.waste_qty);
    }
    setCountDraft(initial);
    setModalError(null);
    setModalType("count");
  };

  const handleCountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockState?.day) return;
    setLoading(true);
    setModalError(null);
    try {
      const payload = Object.entries(countDraft).map(([id, qty]) => ({
        itemId: Number(id),
        countedQty: Number(qty) || 0,
      }));

      const res = await fetch("/api/manager/stock/count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: stockState.day.work_date,
          items: payload,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Đã lưu số liệu kiểm kê");
        setModalType(null);
        await loadStockData();
      } else {
        setModalError(data.error || "Không thể lưu kiểm kê");
      }
    } catch {
      setModalError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  // Close Day action
  const openCloseModal = () => {
    if (!stockState?.items) return;
    const initial: Record<number, number> = {};
    for (const it of stockState.items) {
      initial[it.item_id] = it.latestCountedQty ?? 0;
    }
    setClosingEndingQty(initial);
    setClosingCash(stockState.estimatedRevenue || 0);
    setModalError(null);
    setModalType("close");
  };

  // Live calculations for Closing Modal
  const computeClosingPreview = () => {
    if (!stockState?.items) return { totalRev: 0, itemsSummary: [] };
    let totalRev = 0;
    const itemsSummary = stockState.items.map((row) => {
      const ending = closingEndingQty[row.item_id] ?? 0;
      const available = row.import_qty + row.restock_qty - row.waste_qty;
      const sold = Math.max(0, available - ending);
      const sub = sold * row.unit_price;
      totalRev += sub;
      return {
        ...row,
        ending,
        sold,
        sub,
      };
    });
    return { totalRev, itemsSummary };
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockState?.day) return;
    setLoading(true);
    setModalError(null);

    const itemsPayload = Object.entries(closingEndingQty).map(([id, qty]) => ({
      itemId: Number(id),
      endingQty: Number(qty) || 0,
    }));

    try {
      const res = await fetch("/api/manager/stock/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: stockState.day.work_date,
          cashCounted: Number(closingCash) || 0,
          items: itemsPayload,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Đã chốt sổ ngày bán thành công!");
        setModalType(null);
        await loadStockData();
      } else {
        setModalError(data.error || "Không thể chốt sổ ngày bán");
      }
    } catch {
      setModalError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-emerald-200" />
          <span className="text-base sm:text-lg">{toastMessage}</span>
        </div>
      )}

      {/* Top App Header */}
      <header className="bg-orange-600 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">
              🍢
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                CÁ VIÊN CHIÊN - ĐIỂM BÁN
              </h1>
              <p className="text-xs text-orange-200 font-medium">
                Tài khoản Quản lý chi nhánh (MANAGER) • Hôm nay: {todayVN()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 active:bg-orange-900 text-white text-sm font-semibold flex items-center gap-1.5 transition"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 flex gap-2 border-t border-orange-500/40">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex-1 sm:flex-initial py-3 px-6 font-bold text-sm sm:text-base border-b-4 flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === "attendance"
                ? "border-white text-white bg-orange-700/40"
                : "border-transparent text-orange-100 hover:bg-orange-700/20"
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Chấm công nhân viên</span>
            {openShifts.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500 text-white font-black">
                {openShifts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("stock")}
            className={`flex-1 sm:flex-initial py-3 px-6 font-bold text-sm sm:text-base border-b-4 flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === "stock"
                ? "border-white text-white bg-orange-700/40"
                : "border-transparent text-orange-100 hover:bg-orange-700/20"
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Kho & Bán hàng</span>
            {stockState?.isOpen && (
              <span className="ml-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* ============================================================== */}
        {/* ATTENDANCE TAB                                                 */}
        {/* ============================================================== */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* Search and Action Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                Chấm công: Nhập mã hoặc tên nhân viên
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Chỉ cần gõ mã (ví dụ: NV001) hoặc tên để hệ thống tìm kiếm, sau đó bấm 1 nút để Vào hoặc Ra ca.
              </p>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Gõ mã nhân viên hoặc tên..."
                  className="w-full pl-14 pr-4 py-4 sm:py-5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xl sm:text-2xl font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                />
              </div>

              {/* Matched Employee Picker / Selected Card */}
              {matchedEmployees.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {matchedEmployees.map((emp) => {
                    const working = isEmployeeWorking(emp.id);
                    const shift = getWorkingShift(emp.id);
                    const isSelected = selectedEmployee?.id === emp.id;

                    return (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedEmployee(emp)}
                        className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-orange-500 bg-orange-50/50 shadow-md ring-2 ring-orange-500/20"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                              {emp.code}
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 mt-1">
                              {emp.full_name}
                            </h3>
                          </div>
                          {working ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                              Đang làm
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-200 text-slate-600">
                              Chưa vào ca
                            </span>
                          )}
                        </div>

                        {working && shift && (
                          <div className="text-xs text-emerald-700 font-semibold mt-2">
                            Vào lúc: {formatTimeOnly(shift.check_in_time)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Confirmation Banner */}
              {selectedEmployee && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-extrabold text-orange-600">
                      Xác nhận nhân viên
                    </span>
                    <h3 className="text-2xl font-black text-slate-900">
                      {selectedEmployee.full_name} ({selectedEmployee.code})
                    </h3>
                    <p className="text-sm font-medium text-slate-600">
                      {isEmployeeWorking(selectedEmployee.id)
                        ? `Nhân viên đang trong ca (vào ca từ ${formatTimeOnly(getWorkingShift(selectedEmployee.id)?.check_in_time)}). Bấm bên dưới để Ra ca.`
                        : "Nhân viên chưa vào ca. Bấm bên dưới để Vào ca."}
                    </p>
                  </div>

                  <button
                    onClick={() => handleClockToggle(selectedEmployee)}
                    disabled={loading}
                    className={`w-full sm:w-auto px-8 py-5 rounded-2xl text-xl font-black text-white shadow-xl flex items-center justify-center gap-3 transition cursor-pointer ${
                      isEmployeeWorking(selectedEmployee.id)
                        ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/30"
                        : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/30"
                    }`}
                  >
                    <UserCheck className="w-7 h-7" />
                    <span>
                      {isEmployeeWorking(selectedEmployee.id) ? "XÁC NHẬN RA CA" : "XÁC NHẬN VÀO CA"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Attendance Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Working Now */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    Đang làm việc ({openShifts.length})
                  </h3>
                  <button
                    onClick={loadAttendanceData}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Làm mới
                  </button>
                </div>

                {openShifts.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    Hiện chưa có nhân viên nào đang trong ca làm việc.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {openShifts.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-500 mr-2">
                            {s.employee_code}
                          </span>
                          <span className="font-bold text-slate-900">
                            {s.employee_name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-50">
                            Từ {formatTimeOnly(s.check_in_time)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's Clock Log */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-black text-slate-900 mb-4">
                  Nhật ký chấm công hôm nay
                </h3>

                {todayLog.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    Chưa có lượt chấm công nào trong hôm nay.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {todayLog.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-sm"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{s.employee_name}</span>
                          <span className="text-xs text-slate-400 ml-1.5">({s.employee_code})</span>
                        </div>
                        <div className="text-xs font-medium text-slate-600 flex items-center gap-2">
                          <span className="text-emerald-600 font-bold">
                            Vào: {formatTimeOnly(s.check_in_time)}
                          </span>
                          {s.check_out_time ? (
                            <span className="text-rose-600 font-bold">
                              • Ra: {formatTimeOnly(s.check_out_time)}
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-black text-[10px]">
                              Đang làm
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STOCK & SALES TAB                                              */}
        {/* ============================================================== */}
        {activeTab === "stock" && (
          <div className="space-y-6">
            {/* Warning if older day is unclosed */}
            {stockState?.unclosedOlderDays && stockState.unclosedOlderDays.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-black text-sm">Cảnh báo: Ngày cũ chưa chốt sổ!</h4>
                  <p className="text-xs mt-0.5 font-medium">
                    Có {stockState.unclosedOlderDays.length} ngày bán cũ (ví dụ:{" "}
                    {stockState.unclosedOlderDays.map((d) => d.work_date).join(", ")}) chưa được chốt tiền mặt.
                  </p>
                </div>
              </div>
            )}

            {/* Case 1: No open day yet (Start Day screen) */}
            {!stockState?.day && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      Bắt đầu ngày bán mới ({todayVN()})
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      Nhập số lượng hàng mang theo ban đầu cho từng món. Bản nháp được tự động lưu lại nếu tải lại trang.
                    </p>
                  </div>

                  <button
                    onClick={handleStartDay}
                    disabled={loading}
                    className="px-8 py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-black text-lg shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>BẮT ĐẦU BÁN HÔM NAY</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <ItemInventoryGrid
                  items={stockState?.menuItems ?? []}
                  stockRows={[]}
                  importDraft={importDraft}
                  onImportDraftChange={(itemId, qty) =>
                    saveLocalStorageDraft({ ...importDraft, [itemId]: qty })
                  }
                />
              </div>
            )}

            {/* Case 2: Open Day is Active */}
            {stockState?.day && stockState.isOpen && (
              <div className="space-y-6">
                {/* Status & Quick Action Bar */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          Đang mở bán
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          Ngày: {stockState.day.work_date}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 mt-1">
                        Ước tính doanh thu:{" "}
                        <span className="text-orange-600">
                          {formatVND(stockState.estimatedRevenue)}
                        </span>
                      </h2>
                      {stockState.latestCountTimestamp && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Lần kiểm kê kho gần nhất:{" "}
                          <b>{formatDateTimeVN(stockState.latestCountTimestamp)}</b>
                        </p>
                      )}
                    </div>

                    {/* Operational Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => {
                          setModalItemId(stockState.items[0]?.item_id || null);
                          setModalQty(5);
                          setModalError(null);
                          setModalType("restock");
                        }}
                        className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm border border-blue-200 transition cursor-pointer"
                      >
                        + Thêm hàng
                      </button>

                      <button
                        onClick={() => {
                          setModalItemId(stockState.items[0]?.item_id || null);
                          setModalQty(1);
                          setModalError(null);
                          setModalType("waste");
                        }}
                        className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-sm border border-amber-200 transition cursor-pointer"
                      >
                        - Hao hụt / Tặng
                      </button>

                      <button
                        onClick={openCountModal}
                        className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-sm border border-purple-200 transition cursor-pointer"
                      >
                        📋 Kiểm kê kho
                      </button>

                      <button
                        onClick={openCloseModal}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-base shadow-lg shadow-rose-600/20 transition cursor-pointer"
                      >
                        🔒 CHỐT NGÀY BÁN
                      </button>
                    </div>
                  </div>

                  <ItemInventoryGrid
                    items={stockState.menuItems}
                    stockRows={stockState.items}
                    canAdjustStock
                    onRestock={(itemId) => {
                      setModalItemId(itemId);
                      setModalQty(1);
                      setModalError(null);
                      setModalType("restock");
                    }}
                    onWaste={(itemId) => {
                      setModalItemId(itemId);
                      setModalQty(1);
                      setModalError(null);
                      setModalType("waste");
                    }}
                  />

                  {/* Stock Table */}
                  <div className="overflow-x-auto mt-6">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3">Mặt hàng</th>
                          <th className="py-3 px-3 text-right">Đơn giá</th>
                          <th className="py-3 px-3 text-center">Đầu ngày</th>
                          <th className="py-3 px-3 text-center">Đã thêm</th>
                          <th className="py-3 px-3 text-center">Hao hụt</th>
                          <th className="py-3 px-3 text-center">Kiểm kê gần nhất</th>
                          <th className="py-3 px-3 text-center">Đã bán (ước tính)</th>
                          <th className="py-3 px-3 text-right">Tạm tính</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {stockState.items.map((row) => (
                          <tr key={row.item_id} className="hover:bg-slate-50/80">
                            <td className="py-3.5 px-3 font-bold text-slate-900">
                              {row.item_name}
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-slate-600">
                              {formatVND(row.unit_price)}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                              {row.import_qty}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-blue-600">
                              +{row.restock_qty}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-amber-600">
                              -{row.waste_qty}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {row.latestCountedQty !== undefined && row.latestCountedQty !== null ? (
                                <span className="px-2 py-0.5 rounded font-black bg-purple-100 text-purple-800 text-xs">
                                  {row.latestCountedQty}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Chưa đếm</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-center font-black text-emerald-600">
                              {row.impliedSoldSoFar ?? 0}
                            </td>
                            <td className="py-3.5 px-3 text-right font-black text-slate-900">
                              {formatVND(row.impliedRevenueSoFar)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Case 3: Day is Closed */}
            {stockState?.day && !stockState.isOpen && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  Ngày bán {stockState.day.work_date} đã chốt sổ
                </h2>
                <p className="text-sm text-slate-500 mt-1 mb-6">
                  Đã khóa sổ lúc {formatDateTimeVN(stockState.day.closed_at)}. Chỉ chủ quán mới có quyền xem lịch sử chi tiết hoặc mở lại.
                </p>

                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">Doanh thu bán</span>
                    <span className="text-lg font-black text-slate-900">
                      {formatVND(stockState.day.total_revenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">Tiền thực đếm</span>
                    <span className="text-lg font-black text-slate-900">
                      {formatVND(stockState.day.cash_counted)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">Chênh lệch</span>
                    <span
                      className={`text-lg font-black ${
                        (stockState.day.variance || 0) < 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {formatSignedVND(stockState.day.variance)}
                    </span>
                  </div>
                </div>
                </div>
                <ItemInventoryGrid
                  items={stockState.menuItems}
                  stockRows={stockState.items}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODALS: RESTOCK, WASTE, COUNT, CLOSE                           */}
      {/* ============================================================== */}

      {/* Restock Modal */}
      {modalType === "restock" && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900">Thêm hàng vào quầy</h3>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Chọn món
                </label>
                <select
                  value={modalItemId || ""}
                  onChange={(e) => setModalItemId(Number(e.target.value))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900"
                >
                  {stockState?.items.map((it) => (
                    <option key={it.item_id} value={it.item_id}>
                      {it.item_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Số lượng thêm
                </label>
                <input
                  type="number"
                  min="1"
                  value={modalQty}
                  onChange={(e) => setModalQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xl font-black text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="flex-1 py-3.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold cursor-pointer"
                >
                  Xác nhận thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waste Modal */}
      {modalType === "waste" && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900">Ghi nhận Hao hụt / Tặng</h3>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleWasteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Chọn món
                </label>
                <select
                  value={modalItemId || ""}
                  onChange={(e) => setModalItemId(Number(e.target.value))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900"
                >
                  {stockState?.items.map((it) => (
                    <option key={it.item_id} value={it.item_id}>
                      {it.item_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Số lượng hao hụt / tặng
                </label>
                <input
                  type="number"
                  min="1"
                  value={modalQty}
                  onChange={(e) => setModalQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xl font-black text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="flex-1 py-3.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold cursor-pointer"
                >
                  Xác nhận hao hụt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mid-Day Count Modal */}
      {modalType === "count" && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">Kiểm kê kho giữa ca</h3>
                <p className="text-xs text-slate-500">
                  Đếm số lượng thực tế hiện còn tại xe để chủ quán xem từ xa.
                </p>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCountSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {stockState?.items.map((row) => (
                  <div
                    key={row.item_id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{row.item_name}</h4>
                      <span className="text-xs text-slate-400">
                        Tổng có: {row.import_qty + row.restock_qty - row.waste_qty}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-semibold">Còn:</span>
                      <input
                        type="number"
                        min="0"
                        value={countDraft[row.item_id] ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setCountDraft({ ...countDraft, [row.item_id]: val });
                        }}
                        className="w-20 p-2 bg-white border border-slate-300 rounded-lg text-center font-black text-lg text-slate-900"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="flex-1 py-3.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold cursor-pointer"
                >
                  Lưu số liệu kiểm kê
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Day Modal with Live Revenue and Variance Preview */}
      {modalType === "close" && (() => {
        const { totalRev, itemsSummary } = computeClosingPreview();
        const variance = (Number(closingCash) || 0) - totalRev;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Chốt sổ ngày {stockState?.day.work_date}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Nhập tồn cuối ngày và tiền mặt kiểm đếm. Hệ thống sẽ tự động tính số lượng đã bán và doanh thu.
                  </p>
                </div>
                <button
                  onClick={() => setModalType(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleCloseSubmit} className="flex-1 flex flex-col overflow-hidden mt-4">
                {/* Ending quantities list */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 mb-4">
                  <span className="text-xs uppercase font-extrabold text-slate-400 block mb-1">
                    Số lượng tồn thực tế cuối ngày:
                  </span>
                  {itemsSummary.map((item) => (
                    <div
                      key={item.item_id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{item.item_name}</h4>
                        <span className="text-xs text-slate-500">
                          Đã bán: <b className="text-emerald-600">{item.sold}</b> • Tạm tính:{" "}
                          <b>{formatVND(item.sub)}</b>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold">Tồn:</span>
                        <input
                          type="number"
                          min="0"
                          value={closingEndingQty[item.item_id] ?? 0}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setClosingEndingQty({ ...closingEndingQty, [item.item_id]: val });
                          }}
                          className="w-20 p-2 bg-white border border-slate-300 rounded-lg text-center font-black text-lg text-slate-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cash count input & Live Variance preview */}
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs uppercase font-extrabold text-slate-600 mb-1">
                      Tổng tiền mặt thực tế kiểm đếm (VNĐ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={closingCash}
                      onChange={(e) => setClosingCash(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-2xl font-black text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500 font-bold block">Tổng doanh thu tính từ hàng</span>
                      <span className="text-lg font-black text-slate-900">{formatVND(totalRev)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-bold block">Chênh lệch (Tiền - Doanh thu)</span>
                      <span
                        className={`text-lg font-black ${
                          variance < 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {formatSignedVND(variance)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="flex-1 py-3.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-base shadow-lg shadow-rose-600/30 cursor-pointer"
                  >
                    XÁC NHẬN CHỐT SỔ
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
