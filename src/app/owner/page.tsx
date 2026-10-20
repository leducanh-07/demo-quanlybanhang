"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Users,
  UtensilsCrossed,
  ShieldCheck,
  LogOut,
  AlertOctagon,
  Download,
  KeyRound,
  RotateCcw,
  Edit3,
  CheckCircle,
  Plus,
  RefreshCw,
  Clock,
  Coins,
  ChevronDown,
  Calendar,
  X,
} from "lucide-react";
import { formatVND, formatSignedVND } from "@/lib/format";
import { formatDateTimeVN, formatTimeOnly, todayVN } from "@/lib/time";
import type { AlertItem, Item, OwnerDashboardData } from "@/types";
import { EMPTY_OWNER_DASHBOARD, normalizeOwnerDashboardData } from "@/lib/ownerDashboard";
import { ItemInventoryGrid, type InventoryRow } from "@/components/ItemInventoryGrid";

export default function OwnerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"live" | "dashboard" | "employees" | "items" | "days" | "audit">("live");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live View State
  const [liveData, setLiveData] = useState<any>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Dashboard State
  const [dashData, setDashData] = useState<OwnerDashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Employees State
  const [employees, setEmployees] = useState<any[]>([]);
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [empFormCode, setEmpFormCode] = useState("");
  const [empFormName, setEmpFormName] = useState("");
  const [empFormActive, setEmpFormActive] = useState(true);

  // Items State
  const [items, setItems] = useState<Item[]>([]);
  const [itemStockRows, setItemStockRows] = useState<InventoryRow[]>([]);
  const [itemStockDate, setItemStockDate] = useState<string | null>(null);
  const [itemStockOpen, setItemStockOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemFormName, setItemFormName] = useState("");
  const [itemFormPrice, setItemFormPrice] = useState<number>(0);
  const [itemFormUrl, setItemFormUrl] = useState("");
  const [itemFormActive, setItemFormActive] = useState(false);
  const [stockAdjustType, setStockAdjustType] = useState<"restock" | "waste" | null>(null);
  const [stockAdjustItemId, setStockAdjustItemId] = useState<number | null>(null);
  const [stockAdjustQty, setStockAdjustQty] = useState(1);
  const [stockAdjustError, setStockAdjustError] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Password Modals
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  // Shift & Day Edit Modals
  const [editShiftModal, setEditShiftModal] = useState<any | null>(null);
  const [shiftCheckIn, setShiftCheckIn] = useState("");
  const [shiftCheckOut, setShiftCheckOut] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchLive = async () => {
    try {
      const res = await fetch("/api/owner/live");
      const data = await res.json();
      if (res.ok && data.success) {
        setLiveData(data.data);
        setLastRefreshed(new Date().toLocaleTimeString("vi-VN"));
      } else if (res.status === 401 || res.status === 403) {
        router.push("/");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboard = async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      let url = "/api/owner/dashboard";
      const params = new URLSearchParams();
      if (startDateFilter) params.append("startDate", startDateFilter);
      if (endDateFilter) params.append("endDate", endDateFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setDashData(normalizeOwnerDashboardData(data.data));
      } else if (res.status === 401 || res.status === 403) {
        router.push("/");
      } else {
        const msg =
          (typeof data?.error === "string" && data.error) ||
          "Không tải được dữ liệu báo cáo.";
        setDashError(msg);
      }
    } catch (e) {
      console.error(e);
      setDashError("Không tải được dữ liệu báo cáo. Vui lòng thử lại.");
    } finally {
      setDashLoading(false);
    }
  };

  const renderDashboardBody = (content: ReactNode): ReactNode => {
    if (dashLoading && dashData === null) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-orange-500" />
          <p className="text-sm font-bold">Đang tải dữ liệu báo cáo...</p>
        </div>
      );
    }
    if (dashError && dashData === null) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm font-bold text-rose-600 mb-4 text-center max-w-md">{dashError}</p>
          <button
            type="button"
            onClick={fetchDashboard}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
          >
            Thử lại
          </button>
        </div>
      );
    }
    return content;
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/owner/employees");
      const data = await res.json();
      if (res.ok && data.success) setEmployees(data.data.employees);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchItems = async () => {
    try {
      const [itemsResponse, stockResponse] = await Promise.all([
        fetch("/api/owner/items"),
        fetch("/api/manager/stock/today"),
      ]);
      const [itemsData, stockData] = await Promise.all([
        itemsResponse.json(),
        stockResponse.json(),
      ]);
      if (itemsResponse.ok && itemsData.success) setItems(itemsData.data.items);
      if (stockResponse.ok && stockData.success) {
        setItemStockRows(stockData.data.items || []);
        setItemStockDate(stockData.data.day?.work_date || null);
        setItemStockOpen(Boolean(stockData.data.isOpen));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/owner/audit-logs");
      const data = await res.json();
      if (res.ok && data.success) setAuditLogs(data.data.logs);
    } catch (e) {
      console.error(e);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLive();
  }, []);

  // 20s Polling for Live Tab
  useEffect(() => {
    if (activeTab === "live") {
      const interval = setInterval(fetchLive, 20000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Tab change triggers
  useEffect(() => {
    if (activeTab === "dashboard") fetchDashboard();
    if (activeTab === "employees") fetchEmployees();
    if (activeTab === "items") fetchItems();
    if (activeTab === "days") fetchDashboard();
    if (activeTab === "audit") fetchAuditLogs();
  }, [activeTab]);

  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  // Save employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingEmp ? `/api/owner/employees/${editingEmp.id}` : "/api/owner/employees";
      const method = editingEmp ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: empFormCode.trim(),
          fullName: empFormName.trim(),
          isActive: empFormActive,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(editingEmp ? "Đã cập nhật nhân viên" : "Đã thêm nhân viên mới");
        setEmpModalOpen(false);
        fetchEmployees();
      } else {
        alert(data.error || "Thất bại");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  // Save menu item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingItem ? `/api/owner/items/${editingItem.id}` : "/api/owner/items";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemFormName.trim(),
          unitPrice: Number(itemFormPrice),
          imageUrl: itemFormUrl.trim() || null,
          isActive: itemFormActive,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(editingItem ? "Đã cập nhật món ăn" : "Đã thêm món mới");
        setItemModalOpen(false);
        fetchItems();
      } else {
        alert(data.error || "Thất bại");
      }
    } catch {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustType || stockAdjustItemId === null || !itemStockDate) return;

    setLoading(true);
    setStockAdjustError(null);
    try {
      const res = await fetch(`/api/manager/stock/${stockAdjustType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: itemStockDate,
          itemId: stockAdjustItemId,
          qty: stockAdjustQty,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(stockAdjustType === "restock" ? "Đã nhập thêm hàng" : "Đã ghi nhận hao hụt");
        setStockAdjustType(null);
        await fetchItems();
      } else {
        setStockAdjustError(data.error || "Không thể cập nhật tồn kho");
      }
    } catch {
      setStockAdjustError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  // Reopen day
  const handleReopenDay = async (workDate: string) => {
    if (!confirm(`Bạn có chắc chắn muốn mở lại ngày bán ${workDate}?`)) return;
    try {
      const res = await fetch(`/api/owner/days/${workDate}/reopen`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Đã mở lại ngày ${workDate}`);
        fetchDashboard();
      } else {
        alert(data.error || "Không thể mở lại");
      }
    } catch {
      alert("Lỗi kết nối");
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Đổi mật khẩu thành công!");
        setChangePwdOpen(false);
        setCurrentPwd("");
        setNewPwd("");
      } else {
        alert(data.error || "Đổi mật khẩu thất bại");
      }
    } catch {
      alert("Lỗi kết nối");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm sm:text-base">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-xl shadow-md shadow-orange-600/30">
              🍢
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                CHỦ QUÁN QUẢN TRỊ
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-600 text-white">
                  Owner
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Theo dõi từ xa • Ngày: {todayVN()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setChangePwdOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
              title="Đổi mật khẩu của tôi"
            >
              <KeyRound className="w-4 h-4 text-orange-400" />
              <span className="hidden sm:inline">Đổi MK</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation (Responsive Horizontal Scroll) */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar border-t border-slate-800">
          <button
            onClick={() => setActiveTab("live")}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === "live"
                ? "border-orange-500 text-orange-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Trực tiếp</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          </button>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === "dashboard"
                ? "border-orange-500 text-orange-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Doanh thu & Báo cáo</span>
          </button>

          <button
            onClick={() => setActiveTab("employees")}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === "employees"
                ? "border-orange-500 text-orange-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Nhân sự</span>
          </button>

          <button
            onClick={() => setActiveTab("items")}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === "items"
                ? "border-orange-500 text-orange-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Thực đơn</span>
          </button>

          <button
            onClick={() => setActiveTab("days")}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === "days"
                ? "border-orange-500 text-orange-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Chốt sổ các ngày</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === "audit"
                ? "border-orange-500 text-orange-400 bg-slate-800/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Nhật ký hệ thống</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ============================================================== */}
        {/* 1. LIVE VIEW TAB (POLLING EVERY 20s)                           */}
        {/* ============================================================== */}
        {activeTab === "live" && (
          <div className="space-y-6">
            {/* Status bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-sm font-bold text-slate-700">
                  Tự động làm mới mỗi 20 giây
                </span>
                {lastRefreshed && (
                  <span className="text-xs text-slate-400">
                    (Cập nhật lúc: {lastRefreshed})
                  </span>
                )}
              </div>

              <button
                onClick={fetchLive}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Làm mới ngay
              </button>
            </div>

            {/* Active Alerts Banner */}
            {liveData?.alerts && liveData.alerts.length > 0 && (
              <div className="space-y-3">
                {liveData.alerts.map((alert: AlertItem) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border-2 flex items-start gap-3.5 ${
                      alert.level === "danger"
                        ? "bg-rose-50 border-rose-300 text-rose-950"
                        : alert.level === "warning"
                        ? "bg-amber-50 border-amber-300 text-amber-950"
                        : "bg-blue-50 border-blue-300 text-blue-950"
                    }`}
                  >
                    <AlertOctagon
                      className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                        alert.level === "danger"
                          ? "text-rose-600"
                          : alert.level === "warning"
                          ? "text-amber-600"
                          : "text-blue-600"
                      }`}
                    />
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base">
                        {alert.title}
                      </h4>
                      <p className="text-xs sm:text-sm mt-0.5 font-medium leading-relaxed">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Estimated Revenue */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                  <Coins className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {liveData?.isDayOpen ? "Doanh thu ước tính hôm nay" : "Doanh thu chốt hôm nay"}
                  </span>
                  <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                    {formatVND(liveData?.runningRevenueEstimate)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {liveData?.isDayOpen ? "Tính từ kiểm kê kho" : "Đã đóng sổ ngày"}
                  </span>
                </div>
              </div>

              {/* Working Staff */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Nhân viên đang trực
                  </span>
                  <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                    {liveData?.activeStaff?.length || 0} người
                  </span>
                  <span className="text-xs text-emerald-700 font-bold">
                    {liveData?.activeStaff?.length > 0 ? "Đang có ca làm" : "Chưa có ai vào ca"}
                  </span>
                </div>
              </div>

              {/* Day Status */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Trạng thái điểm bán
                  </span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">
                    {liveData?.isDayOpen ? "ĐANG BÁN HÀNG" : "CHƯA MỞ / ĐÃ CHỐT"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {liveData?.latestCountTimestamp
                      ? `Đếm kho lúc: ${formatTimeOnly(liveData.latestCountTimestamp)}`
                      : "Chưa kiểm kê hôm nay"}
                  </span>
                </div>
              </div>
            </div>

            {/* Who is Clocked In */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Nhân viên đang trong ca làm việc ({liveData?.activeStaff?.length || 0})
              </h3>

              {liveData?.activeStaff?.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  Hiện không có nhân viên nào đang trong ca.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {liveData?.activeStaff?.map((s: any) => (
                    <div
                      key={s.shiftId}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-400">{s.employeeCode}</span>
                          <h4 className="text-base font-bold text-slate-900 mt-0.5">
                            {s.employeeName}
                          </h4>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          {s.hoursElapsed} giờ
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-3 font-medium">
                        Vào ca từ: <b>{formatTimeOnly(s.checkInTime)}</b>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Stock & Implied Sold So Far */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-black text-slate-900">
                  Số lượng hàng & Ước tính đã bán hôm nay
                </h3>
                {liveData?.latestCountTimestamp && (
                  <span className="text-xs text-slate-500 font-medium">
                    Kiểm kê gần nhất: <b>{formatDateTimeVN(liveData.latestCountTimestamp)}</b>
                  </span>
                )}
              </div>

              {liveData?.stockItems?.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">
                  Hôm nay chưa mở bán ngày hàng nào.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-black text-slate-400 uppercase">
                        <th className="py-2.5 px-3">Món</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 text-center">Đầu ngày</th>
                        <th className="py-2.5 px-3 text-center">Thêm</th>
                        <th className="py-2.5 px-3 text-center">Hao hụt</th>
                        <th className="py-2.5 px-3 text-center">Còn lại (đếm)</th>
                        <th className="py-2.5 px-3 text-center font-bold text-emerald-600">
                          Đã bán
                        </th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-900">
                          Tạm tính
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {liveData?.stockItems?.map((it: any) => (
                        <tr key={it.itemId} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">{it.itemName}</td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {formatVND(it.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-700">{it.importQty}</td>
                          <td className="py-3 px-3 text-center text-blue-600 font-bold">
                            +{it.restockQty}
                          </td>
                          <td className="py-3 px-3 text-center text-amber-600 font-bold">
                            -{it.wasteQty}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {it.latestCountedQty !== null ? (
                              <span className="px-2 py-0.5 rounded font-black bg-purple-100 text-purple-800 text-xs">
                                {it.latestCountedQty}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-black text-emerald-600">
                            {it.impliedSoldSoFar}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900">
                            {formatVND(it.impliedRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. DASHBOARD & REPORTS TAB                                     */}
        {/* ============================================================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Filters & CSV Export Bar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800"
                  />
                </div>
                <button
                  onClick={fetchDashboard}
                  className="mt-5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
                >
                  Lọc dữ liệu
                </button>
              </div>

              {/* CSV Export Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <a
                  href="/api/owner/export/revenue"
                  download
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-orange-600/20"
                >
                  <Download className="w-4 h-4" />
                  Xuất CSV Doanh thu
                </a>
                <a
                  href="/api/owner/export/attendance"
                  download
                  className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Xuất CSV Chấm công
                </a>
              </div>
            </div>

            {renderDashboardBody(
              <>
                {/* Visual Revenue Bar Chart */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-6">
                    Biểu đồ Doanh thu các ngày đã chốt
                  </h3>

                  {(() => {
                    const days = dashData?.days ?? EMPTY_OWNER_DASHBOARD.days;
                    const closedDays = days
                      .filter((d) => d.closed_at != null)
                      .slice(0, 14);

                    if (closedDays.length === 0) {
                      return (
                        <p className="text-sm text-slate-400 py-8 text-center">
                          Chưa có dữ liệu chốt ngày.
                        </p>
                      );
                    }

                    const maxRev = Math.max(
                      ...closedDays.map((d) => Number(d.total_revenue) || 0),
                      100000
                    );

                    return (
                      <div className="space-y-3">
                        {closedDays.map((d) => {
                          const revenue = Number(d.total_revenue) || 0;
                          const pct = Math.min(100, Math.round((revenue / maxRev) * 100));
                          const variance = Number(d.variance) || 0;
                          const isAbnormal = Math.abs(variance) > 20000;

                          return (
                            <div key={d.work_date} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                <span>{d.work_date}</span>
                                <div className="flex items-center gap-2">
                                  <span>{formatVND(revenue)}</span>
                                  {isAbnormal && (
                                    <span className="text-rose-600 text-[10px] bg-rose-50 px-1.5 py-0.5 rounded font-black">
                                      Lệch: {formatSignedVND(variance)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-6 w-full bg-slate-100 rounded-lg overflow-hidden flex">
                                <div
                                  style={{ width: `${pct}%` }}
                                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg transition-all duration-500 flex items-center px-2 text-[10px] text-white font-black"
                                >
                                  {pct > 15 ? formatVND(revenue) : ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Top Items & Hours Worked Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Selling Items */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-4">
                      Top món bán chạy nhất
                    </h3>
                    <div className="space-y-3">
                      {(dashData?.topItems ?? []).slice(0, 6).map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                              <span className="text-xs text-slate-500">
                                Đã bán: <b className="text-slate-800">{item.totalSold} phần</b>
                              </span>
                            </div>
                          </div>
                          <span className="font-black text-sm text-slate-900">
                            {formatVND(item.totalRevenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hours Worked per Employee */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-4">
                      Tổng giờ làm việc theo nhân viên
                    </h3>
                    <div className="space-y-3">
                      {(dashData?.employeeHours ?? []).map((emp) => (
                        <div
                          key={emp.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-400">{emp.code}</span>
                            <h4 className="font-bold text-slate-900 text-sm">{emp.name}</h4>
                            <span className="text-xs text-slate-500">
                              Số ca: <b>{emp.shiftCount} ca</b>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-emerald-600 block">
                              {emp.totalHoursFormatted} giờ
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. EMPLOYEES ROSTER TAB                                        */}
        {/* ============================================================== */}
        {activeTab === "employees" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Danh sách nhân viên</h3>
                <p className="text-xs text-slate-500">
                  Nhân viên chỉ bị ngưng hoạt động (is_active = 0), không bao giờ bị xóa để bảo toàn dữ liệu.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingEmp(null);
                  setEmpFormCode(`NV00${employees.length + 1}`);
                  setEmpFormName("");
                  setEmpFormActive(true);
                  setEmpModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm flex items-center gap-1.5 shadow-md shadow-orange-600/20"
              >
                <Plus className="w-4 h-4" />
                Thêm nhân viên
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {emp.code}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">{emp.full_name}</h4>
                    <span
                      className={`text-xs font-semibold ${
                        emp.is_active ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {emp.is_active ? "• Đang hoạt động" : "• Đã ngưng hoạt động"}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setEditingEmp(emp);
                      setEmpFormCode(emp.code);
                      setEmpFormName(emp.full_name);
                      setEmpFormActive(Boolean(emp.is_active));
                      setEmpModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. MENU ITEMS TAB                                              */}
        {/* ============================================================== */}
        {activeTab === "items" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Thực đơn & Kho hàng</h3>
                <p className="text-xs text-slate-500">
                  Thay đổi giá chỉ áp dụng cho ngày mới; các ngày đã mở sẽ giữ nguyên giá snapshot. Mọi thay đổi giá đều được ghi nhận vào nhật ký kiểm toán.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingItem(null);
                  setItemFormName("");
                  setItemFormPrice(5000);
                  setItemFormUrl("");
                  setItemFormActive(false);
                  setItemModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm flex items-center gap-1.5 shadow-md shadow-orange-600/20"
              >
                <Plus className="w-4 h-4" />
                Thêm món mới
              </button>
            </div>

            <ItemInventoryGrid
              items={items}
              stockRows={itemStockRows}
              canAdjustStock={itemStockOpen}
              canEditItems
              onRestock={(itemId) => {
                setStockAdjustItemId(itemId);
                setStockAdjustQty(1);
                setStockAdjustError(null);
                setStockAdjustType("restock");
              }}
              onWaste={(itemId) => {
                setStockAdjustItemId(itemId);
                setStockAdjustQty(1);
                setStockAdjustError(null);
                setStockAdjustType("waste");
              }}
              onEdit={(item) => {
                setEditingItem(item);
                setItemFormName(item.name);
                setItemFormPrice(item.unit_price);
                setItemFormUrl(item.image_url || "");
                setItemFormActive(Boolean(item.is_active));
                setItemModalOpen(true);
              }}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. CLOSED DAYS & REOPEN TAB                                    */}
        {/* ============================================================== */}
        {activeTab === "days" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Lịch sử chốt sổ các ngày bán
              </h3>
              <p className="text-xs text-slate-500">
                Chỉ chủ quán mới có quyền xem chênh lệch các ngày cũ hoặc Mở lại ngày chốt để sửa sai (mọi thao tác đều được ghi nhật ký).
              </p>
            </div>

            {renderDashboardBody(
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-black text-slate-400 uppercase">
                    <th className="py-3 px-3">Ngày bán</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3 text-right">Doanh thu tính từ hàng</th>
                    <th className="py-3 px-3 text-right">Tiền mặt kiểm đếm</th>
                    <th className="py-3 px-3 text-right">Chênh lệch</th>
                    <th className="py-3 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(dashData?.days ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                        Chưa có dữ liệu chốt ngày.
                      </td>
                    </tr>
                  ) : (
                  (dashData?.days ?? []).map((d) => {
                    const isClosed = d.closed_at != null;
                    const variance = d.variance != null ? Number(d.variance) : null;
                    const isAbnormal = isClosed && variance !== null && Math.abs(variance) > 20000;

                    return (
                      <tr key={d.work_date} className="hover:bg-slate-50">
                        <td className="py-3.5 px-3 font-bold text-slate-900">{d.work_date}</td>
                        <td className="py-3.5 px-3">
                          {isClosed ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-700">
                              Đã chốt ({formatTimeOnly(d.closed_at!)})
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              Đang mở
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                          {formatVND(Number(d.total_revenue) || 0)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-700">
                          {d.cash_counted !== null ? formatVND(d.cash_counted) : "-"}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black">
                          {variance !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                isAbnormal
                                  ? "bg-rose-100 text-rose-800"
                                  : variance < 0
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {formatSignedVND(variance)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {isClosed && (
                            <button
                              onClick={() => handleReopenDay(d.work_date)}
                              className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 transition"
                            >
                              Mở lại ngày
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. AUDIT LOGS VIEWER TAB                                       */}
        {/* ============================================================== */}
        {activeTab === "audit" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">Nhật ký kiểm toán hệ thống</h3>
              <p className="text-xs text-slate-500">
                Toàn bộ thao tác can thiệp như đổi mật khẩu, sửa ngày chốt sổ, mở lại ngày, sửa giá món đều được lưu trữ đầy đủ.
              </p>
            </div>

            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-md bg-slate-900 text-white">
                      {log.action}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      {formatDateTimeVN(log.created_at)}
                    </span>
                  </div>

                  <div className="text-slate-700 text-xs">
                    Thực thể: <b>{log.entity}</b> (Ref: {log.entity_ref})
                  </div>

                  {log.detail && (
                    <pre className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-slate-600 overflow-x-auto">
                      {JSON.stringify(log.detail, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* OWNER MODALS                                                   */}
      {/* ============================================================== */}

      {/* Employee Modal */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              {editingEmp ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới"}
            </h3>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Mã nhân viên
                </label>
                <input
                  type="text"
                  required
                  value={empFormCode}
                  onChange={(e) => setEmpFormCode(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={empFormName}
                  onChange={(e) => setEmpFormName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="empActive"
                  checked={empFormActive}
                  onChange={(e) => setEmpFormActive(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="empActive" className="text-sm font-bold text-slate-700">
                  Đang hoạt động (cho phép chấm công)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              {editingItem ? "Sửa món ăn & giá bán" : "Thêm món mới vào thực đơn"}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Tên món
                </label>
                <input
                  type="text"
                  required
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Đơn giá (VNĐ)
                </label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  required
                  value={itemFormPrice}
                  onChange={(e) => setItemFormPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Đường dẫn hình ảnh
                </label>
                <input
                  type="url"
                  value={itemFormUrl}
                  onChange={(e) => setItemFormUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="itemActive"
                  checked={itemFormActive}
                  onChange={(e) => setItemFormActive(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="itemActive" className="text-sm font-bold text-slate-700">
                  Đang mở bán
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  Lưu món
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stockAdjustType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-black text-slate-900">
              {stockAdjustType === "restock" ? "Nhập thêm hàng" : "Ghi nhận hao hụt / trả hàng"}
            </h3>
            {stockAdjustError && (
              <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {stockAdjustError}
              </p>
            )}
            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Số lượng</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockAdjustQty}
                  onChange={(event) =>
                    setStockAdjustQty(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-lg font-black"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStockAdjustType(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-3 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || !itemStockDate}
                  className="flex-1 rounded-xl bg-orange-600 py-3 font-bold text-white disabled:opacity-50"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changePwdOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-4">Đổi mật khẩu tài khoản</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  required
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePwdOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
