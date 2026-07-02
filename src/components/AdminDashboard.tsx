import React, { useState, useEffect } from "react";
import { 
  Users, Search, Download, Trash2, Shield, Lock, ChevronDown, CheckCircle,
  TrendingUp, MapPin, Award, RefreshCw, X, LogOut, Database, FileCode, Check, AlertTriangle, 
  Plus, Radio, Circle, Play
} from "lucide-react";
import { Student, Group, EGYPT_GOVERNORATES } from "../types";
import { apiUrl } from "../api";
import { motion, AnimatePresence } from "motion/react";

interface AdminDashboardProps {
  onClose: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [passcode, setPasscode] = useState("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem("admin_token"));
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    averageScore: 0,
    occupancyPercent: 0,
    uniqueGovs: 0
  });

  // Group creation form state
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [newGroupCapacity, setNewGroupCapacity] = useState("100");
  const [groupActionLoading, setGroupActionLoading] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("");
  const [selectedGovFilter, setSelectedGovFilter] = useState("");

  // Submitting delete / reset states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [systemConfig, setSystemConfig] = useState<{ supabaseActive: boolean; defaultPasscodeUsed: boolean } | null>(null);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);

  // Load config & registrations
  useEffect(() => {
    fetch(apiUrl("/api/config"))
      .then(res => res.json())
      .then(data => setSystemConfig(data))
      .catch(err => console.error("Error loading config", err));

    if (isAuthenticated && token) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load groups
      const groupsRes = await fetch(apiUrl("/api/groups"));
      const groupsData = await groupsRes.json();
      setGroups(groupsData);

      // Load registrations
      const registrationsRes = await fetch(apiUrl("/api/admin/registrations"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!registrationsRes.ok) {
        throw new Error("رمز الجلسة غير صالح، يرجى إعادة تسجيل الدخول");
      }
      const registrationsData = await registrationsRes.json();
      setStudents(registrationsData);

      // Calculate Stats
      calculateStats(registrationsData, groupsData);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "حدث خطأ أثناء تحميل البيانات");
      setIsAuthenticated(false);
      localStorage.removeItem("admin_token");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (studentList: Student[], groupList: Group[]) => {
    const total = studentList.length;
    
    // Average Grade
    const sumScore = studentList.reduce((acc, curr) => acc + Number(curr.score), 0);
    const averageScore = total > 0 ? parseFloat((sumScore / total).toFixed(1)) : 0;

    // Occupancy Rate
    const totalCapacity = groupList.reduce((acc, curr) => acc + curr.capacity, 0);
    const occupancyPercent = totalCapacity > 0 ? parseFloat(((total / totalCapacity) * 100).toFixed(1)) : 0;

    // Unique Governorates
    const govs = new Set(studentList.map(s => s.governorate));
    const uniqueGovs = govs.size;

    setStats({ total, averageScore, occupancyPercent, uniqueGovs });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخول");

      localStorage.setItem("admin_token", data.token);
      setToken(data.token);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || "رمز مرور غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setToken(null);
    setIsAuthenticated(false);
    setPasscode("");
    setStudents([]);
    setGroups([]);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف حجز الطالب "${name}"؟`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(apiUrl(`/api/admin/registrations/${id}`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر حذف الطالب");

      // Reload
      await loadData();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء محاولة الحذف");
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetData = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(apiUrl("/api/admin/reset"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تصفير البيانات");

      alert("تم تصفير جميع بيانات التسجيل وإعادة تهيئة السعة للمجموعات بنجاح.");
      setResetConfirm(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء تصفير البيانات");
    } finally {
      setResetting(false);
    }
  };

  // Group management methods
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupLabel.trim()) return;

    setGroupActionLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/groups"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          label: newGroupLabel,
          capacity: newGroupCapacity
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل إضافة المجموعة");
      }

      setNewGroupLabel("");
      setNewGroupCapacity("100");
      await loadData();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء إضافة المجموعة");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleActivateGroup = async (id: string) => {
    setGroupActionLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/groups/${id}/activate`), {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تفعيل المجموعة");
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء تفعيل المجموعة");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleDeleteGroup = async (id: string, label: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المجموعة "${label}"؟`)) return;

    setGroupActionLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/groups/${id}`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر حذف المجموعة");
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء حذف المجموعة");
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Export registrations to UTF-8 CSV with Excel compatibility
  const handleExportCSV = () => {
    if (students.length === 0) {
      alert("لا توجد حجوزات لتصديرها حالياً");
      return;
    }

    const headers = [
      "رقم التعريف",
      "الاسم رباعياً",
      "المحافظة",
      "المدينة/المركز",
      "المدرسة",
      "رقم تليفون الطالب",
      "وظيفة الأب",
      "رقم تليفون الأب",
      "رقم تليفون الأم",
      "مجموع الشهادة الإعدادية",
      "المجموعة المحجوزة",
      "تاريخ وتوقيت التسجيل"
    ];

    const rows = filteredStudents.map((s) => [
      s.id,
      s.name,
      s.governorate,
      s.city,
      s.school,
      s.phone,
      s.father_job,
      s.father_phone,
      s.mother_phone || "غير مسجل",
      s.score,
      s.group_label || "غير حدد",
      s.created_at ? new Date(s.created_at).toLocaleString("ar-EG") : "غير مسجل"
    ]);

    // Build CSV Content
    let csvContent = "";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      const escapedRow = row.map(val => {
        const textVal = String(val).replace(/"/g, '""');
        return `"${textVal}"`;
      });
      csvContent += escapedRow.join(",") + "\n";
    });

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `حجوزات_الأستاذ_محمود_الديب_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter students logically
  const filteredStudents = students.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm) ||
      s.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.father_phone.includes(searchTerm) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGroup = selectedGroupFilter === "" || s.group_id === selectedGroupFilter;
    const matchesGov = selectedGovFilter === "" || s.governorate === selectedGovFilter;

    return matchesSearch && matchesGroup && matchesGov;
  });

  return (
    <div dir="rtl" className="bg-slate-50 min-h-screen text-slate-800 flex flex-col pt-4 pb-12 px-4 select-none relative" id="admin-dashboard-container">
      
      {/* Top Admin Bar Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 font-bold rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          العودة للمنصة
        </button>

        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600 animate-pulse" />
          <h2 className="text-sm md:text-base font-black text-slate-900">لوحة تحكم الأستاذ محمود الديب</h2>
        </div>
      </div>

      {/* --- STEP 1: AUTHENTICATION PANEL --- */}
      {!isAuthenticated ? (
        <div className="max-w-md w-full mx-auto my-auto py-12 flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 text-center shadow-xl relative"
          >
            <div className="w-14 h-14 bg-amber-50 border border-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">تسجيل دخول المشرفين</h3>
              <p className="text-xs text-slate-500">يرجى إدخال رمز المرور الإداري المعتمد للأستاذ محمود الديب لعرض وإدارة بيانات حجز المجموعات والطلاب.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-600 block">رمز المرور الإداري</label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••"
                  className="w-full text-center tracking-widest font-mono bg-white border border-slate-200 focus:border-amber-400 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-300 focus:outline-none transition-colors"
                  required
                />
              </div>

              {authError && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[11px] leading-relaxed">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "تحقق وتسجيل الدخول"}
              </button>
            </form>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
              * للتجريب المبدئي في بيئة التطوير، استخدم الكود الافتراضي: <code className="text-amber-600 font-mono font-bold">123456</code>
            </div>
          </motion.div>
        </div>
      ) : (
        /* --- STEP 2: FULL DASHBOARD SCREEN --- */
        <div className="max-w-6xl w-full mx-auto space-y-6">

          {/* Database Info Widget */}
          {systemConfig && (
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
              systemConfig.supabaseActive 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-amber-50 border-amber-100 text-amber-800"
            }`}>
              <div className="flex items-center gap-2 text-center sm:text-right">
                <Database className="w-4.5 h-4.5 shrink-0 text-amber-600" />
                <span className="font-medium">
                  {systemConfig.supabaseActive 
                    ? "قاعدة بيانات Supabase (PostgreSQL) متصلة ونشطة بالكامل وتحفظ البيانات سحابياً."
                    : "تعمل المنصة بوضع حفظ البيانات المحلي (fallback) في خادم التطوير لعدم توفر مفاتيح Supabase."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSqlModalOpen(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1 font-bold shrink-0 text-[11px] cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-500" />
                  أوامر Supabase SQL
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg flex items-center gap-1 font-bold shrink-0 text-[11px] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  خروج
                </button>
              </div>
            </div>
          )}

          {/* Group Creation & Management Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-md space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                إدارة مجموعات الحجز المتاحة
              </h3>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-bold">
                المجموعة النشطة (المفعّلة) هي التي يتلقى الطلاب الحجز عليها حالياً
              </span>
            </div>

            {/* Live Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((g) => {
                const isFull = g.registered >= g.capacity;
                return (
                  <div 
                    key={g.id} 
                    className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between h-36 ${
                      g.is_active 
                        ? "border-amber-400 bg-amber-50/30 ring-2 ring-amber-400/20" 
                        : "border-slate-150 bg-slate-50/50"
                    }`}
                  >
                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-between">
                        {g.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md">
                            <Check className="w-3 h-3 text-amber-700" />
                            مفعّلة ونشطة الآن
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivateGroup(g.id)}
                            disabled={groupActionLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-500 hover:text-slate-950 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                          >
                            <Play className="w-2.5 h-2.5" />
                            تفعيل هذه المجموعة
                          </button>
                        )}

                        {/* Delete group (only if empty and not active) */}
                        {g.registered === 0 && !g.is_active && (
                          <button
                            onClick={() => handleDeleteGroup(g.id, g.label)}
                            disabled={groupActionLoading}
                            className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-colors"
                            title="حذف هذه المجموعة الفارغة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h4 className="text-xs md:text-sm font-black text-slate-800 mt-2 line-clamp-1">
                        {g.label}
                      </h4>
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs mt-2">
                      <span className="text-slate-500">
                        سعة المجموعة: <strong className="text-slate-800 font-bold font-mono">{g.capacity}</strong> طالب
                      </span>
                      <span className="font-bold">
                        المسجلين: <strong className={`font-mono text-sm ${isFull ? "text-red-500" : "text-amber-600"}`}>{g.registered}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add New Group Form */}
            <form onSubmit={handleCreateGroup} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex flex-col md:flex-row items-end gap-3 text-right">
              <div className="flex-1 space-y-1 w-full">
                <label className="text-[10px] font-bold text-slate-500 block">اسم / عنوان المجموعة وتوقيتها</label>
                <input
                  type="text"
                  value={newGroupLabel}
                  onChange={(e) => setNewGroupLabel(e.target.value)}
                  placeholder="مثال: الصف الأول الثانوي - مجموعة الأحد والثلاثاء (الساعة 6:00 مساءً)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="w-full md:w-32 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">السعة الاستيعابية</label>
                <input
                  type="number"
                  value={newGroupCapacity}
                  onChange={(e) => setNewGroupCapacity(e.target.value)}
                  placeholder="100"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-400 text-center font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={groupActionLoading || !newGroupLabel.trim()}
                className="w-full md:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 h-[38px]"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                إضافة المجموعة
              </button>
            </form>
          </div>

          {/* Statistics Bento Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stat Box 1: Registrations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 text-right">
                <span className="text-[10px] md:text-xs text-slate-400 block">إجمالي الطلاب المسجلين</span>
                <span className="text-base md:text-lg font-black font-mono text-slate-800">{stats.total}</span>
              </div>
            </div>

            {/* Stat Box 2: Occupancy */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 text-right">
                <span className="text-[10px] md:text-xs text-slate-400 block">نسبة إشغال المجموعات</span>
                <span className="text-base md:text-lg font-black font-mono text-slate-800">{stats.occupancyPercent}%</span>
              </div>
            </div>

            {/* Stat Box 3: Governorates */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 text-right">
                <span className="text-[10px] md:text-xs text-slate-400 block">المحافظات المشاركة</span>
                <span className="text-base md:text-lg font-black font-mono text-slate-800">{stats.uniqueGovs}</span>
              </div>
            </div>

            {/* Stat Box 4: Avg Score */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 text-right">
                <span className="text-[10px] md:text-xs text-slate-400 block">متوسط مجموع الإعدادية</span>
                <span className="text-base md:text-lg font-black font-mono text-slate-800">{stats.averageScore} / 280</span>
              </div>
            </div>

          </div>

          {/* Interactive Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 shadow-sm">
            
            {/* Search Input */}
            <div className="relative w-full md:flex-1 text-right">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث باسم الطالب، رقم التليفون، المدرسة، أو المدينة..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>

            {/* Group Filter Dropdown */}
            <div className="w-full md:w-48 text-right">
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='%2364748b' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`, backgroundPosition: 'left 10px center', backgroundRepeat: 'no-repeat' }}
              >
                <option value="">جميع المجموعات</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Governorate Filter Dropdown */}
            <div className="w-full md:w-44 text-right">
              <select
                value={selectedGovFilter}
                onChange={(e) => setSelectedGovFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='%2364748b' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`, backgroundPosition: 'left 10px center', backgroundRepeat: 'no-repeat' }}
              >
                <option value="">جميع المحافظات</option>
                {EGYPT_GOVERNORATES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shrink-0 shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              تصدير إكسل CSV
            </button>
          </div>

          {/* Registrations List Section */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md" id="registrations-table-container">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 justify-end w-full sm:w-auto">
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md font-mono">
                  {filteredStudents.length} طلاب
                </span>
                <h3 className="text-xs md:text-sm font-bold text-slate-950">كشف الحجوزات المستعلم عنها</h3>
              </div>

              {/* Reset Data Link Button */}
              <button
                onClick={handleResetData}
                disabled={resetting}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
                  resetConfirm 
                    ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-500/10" 
                    : "bg-red-50 hover:bg-red-100 text-red-600 border-red-100"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                {resetConfirm ? "اضغط للتأكيد النهائي والتصفير!" : "تهيئة البيانات وتصفير السجلات"}
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
                <span className="text-xs">جاري تحميل كشف الحجوزات وتحديث السجلات...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-20 text-center text-slate-400 space-y-2 text-xs">
                <Users className="w-10 h-10 text-slate-200 mx-auto" />
                <p>لا توجد أي حجوزات تطابق معايير البحث والفلترة حالياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 select-none">
                    <tr>
                      <th className="py-3 px-4 font-bold">الاسم رباعياً</th>
                      <th className="py-3 px-4 font-bold">تليفون الطالب</th>
                      <th className="py-3 px-4 font-bold">المحافظة والمدينة</th>
                      <th className="py-3 px-4 font-bold">المدرسة</th>
                      <th className="py-3 px-4 font-bold">المجموع الكلي</th>
                      <th className="py-3 px-4 font-bold">المجموعة والموعد المحجوز</th>
                      <th className="py-3 px-4 font-bold">رقم تليفون الأب والأم</th>
                      <th className="py-3 px-4 font-bold text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-black text-slate-900 max-w-[180px] truncate">
                          {student.name}
                        </td>
                        <td className="py-3 px-4 font-mono select-all font-semibold">
                          {student.phone}
                        </td>
                        <td className="py-3 px-4">
                          {student.governorate}، {student.city}
                        </td>
                        <td className="py-3 px-4 max-w-[150px] truncate font-medium">
                          {student.school}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-700 bg-amber-500/[0.03]">
                          {student.score}
                        </td>
                        <td className="py-3 px-4 font-semibold text-blue-700">
                          {student.group_label}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500 leading-relaxed font-mono select-all">
                          أب: {student.father_phone} <br /> أم: {student.mother_phone || "غير مسجل"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDelete(student.id, student.name)}
                            disabled={deletingId === student.id}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors inline-flex cursor-pointer"
                          >
                            {deletingId === student.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
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

      {/* SQL Script View Modal */}
      <AnimatePresence>
        {sqlModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl"
              style={{ direction: "rtl" }}
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-950">مخطط وجداول قاعدة بيانات Supabase SQL</h3>
                </div>
                <button 
                  onClick={() => setSqlModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto font-mono text-[11px] text-slate-600 space-y-4 bg-slate-50/50 text-right" dir="ltr">
                <p className="text-xs text-amber-800 font-sans leading-relaxed text-right font-semibold" dir="rtl">
                  يمكنك نسخ الأوامر التالية بالكامل وتشغيلها في محرّر SQL في لوحة تحكم Supabase الخاصة بك لإنشاء الجداول والسياسات والمحفزات (Triggers) المطلوبة لتوليد الحجز ومتابعة أرقام المجموعات تلقائياً:
                </p>
                <pre className="p-4 bg-slate-900 text-amber-200 rounded-xl overflow-x-auto select-all leading-relaxed whitespace-pre font-mono">
{`-- 1. Create groups table with is_active
CREATE TABLE groups (
    id VARCHAR(50) PRIMARY KEY,
    label TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 50,
    registered INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    governorate TEXT NOT NULL,
    city TEXT NOT NULL,
    school TEXT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    father_job TEXT NOT NULL,
    father_phone VARCHAR(15) NOT NULL,
    mother_phone VARCHAR(15) NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Automatic triggers to manage group seats counts
CREATE OR REPLACE FUNCTION increment_group_registered()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups SET registered = registered + 1 WHERE id = NEW.group_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_group_registered
AFTER INSERT ON students FOR EACH ROW EXECUTE FUNCTION increment_group_registered();

-- 4. Automatic triggers for student deletions
CREATE OR REPLACE FUNCTION decrement_group_registered()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups SET registered = GREATEST(0, registered - 1) WHERE id = OLD.group_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_group_registered
AFTER DELETE ON students FOR EACH ROW EXECUTE FUNCTION decrement_group_registered();

-- 5. Seed default groups
INSERT INTO groups (id, label, capacity, registered, is_active) VALUES
('group_first', 'الصف الأول الثانوي - مجموعة السبت والأربعاء (الساعة 4:00 مساءً)', 150, 0, TRUE),
('group_second', 'الصف الأول الثانوي - مجموعة الأحد والثلاثاء (الساعة 6:00 مساءً)', 150, 0, FALSE);`}
                </pre>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 text-center select-none">
                <button
                  onClick={() => setSqlModalOpen(false)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  حسناً، فهمت ذلك
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
