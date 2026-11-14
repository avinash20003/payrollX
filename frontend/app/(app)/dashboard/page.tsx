"use client";

// app/(app)/dashboard/page.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileText,
  IndianRupee,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

/* ------------------------------ types ------------------------------ */

type Employee = {
  id: number | string;
  employee_code?: string;
  full_name?: string;
  employee_name?: string;
  department?: string;
  status?: string;
  employment_status?: string;
  is_active?: boolean | string;
};

// One normalised salary row, whichever API it came from.
type Row = {
  deptIdx: number;
  department: string;
  employeeId: string;
  code: string;
  name: string;
  month: string;
  attendance: number;
  basic: number;
  sunday: number;
  ot: number;
  night: number;
  other: number;
  gross: number;
  deduction: number;
  foodCut: number;
  partPay: number;
  net: number;
  remarks: string;
};

/* ------------------------------ config ------------------------------ */

const DEPARTMENTS = [
  { name: "Voucher & ID Staff", route: "/id-staff", icon: Users, desc: "Voucher and identity staff", keys: ["idstaff", "voucheridstaff", "voucherandidstaff", "voucherid"], color: "#3b82f6" },
  { name: "Head Office", route: "/head-office", icon: Building2, desc: "Administrative operations", keys: ["headoffice", "ho"], color: "#22d3ee" },
  { name: "Housekeeping", route: "/housekeeping", icon: Sparkles, desc: "Housekeeping operations", keys: ["housekeeping", "hk"], color: "#8b5cf6" },
  { name: "Laundry & Linen", route: "/laundry", icon: Activity, desc: "Laundry and linen services", keys: ["laundrylinen", "laundryandlinen", "laundry"], color: "#f59e0b" },
  { name: "Patient Movement Services", route: "/patient-movement", icon: Users, desc: "Patient movement operations", keys: ["patientmovementservices", "patientmovement", "pms"], color: "#10b981" },
];

const UNASSIGNED_COLOR = "#64748b";
const TABLE_PAGE = 10;
const PENDING_PAGE = 60;

/* ------------------------------ helpers ------------------------------ */

const normalize = (v?: string | null) => (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Exact key match first, then a forgiving partial match
// (e.g. "Laundry", "Patient Movement", "Housekeeping Dept").
function deptIndex(value?: string | null) {
  const key = normalize(value);
  if (!key) return -1;

  const exact = DEPARTMENTS.findIndex((d) => d.keys.includes(key));
  if (exact >= 0) return exact;

  return DEPARTMENTS.findIndex((d) =>
    d.keys.some((k) => k.length >= 4 && (key.includes(k) || (key.length >= 4 && k.includes(key)))),
  );
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function currentMonth() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return currentMonth();
  }

  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function recordMonth(value: unknown) {
  const s = String(value ?? "");
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string, short = false) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
  });
}

const inr = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

function compact(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return inr(v);
}

function isActive(e: Employee) {
  if (e.is_active !== undefined) return e.is_active === true || String(e.is_active).toLowerCase() === "true";
  const s = String(e.status || e.employment_status || "active").toLowerCase();
  return !["inactive", "terminated", "resigned", "disabled"].includes(s);
}

const empName = (e?: Employee) => e?.full_name || e?.employee_name || "";

const entryRoute = (idx: number) => (idx < 0 ? "/dashboard" : `${DEPARTMENTS[idx].route}/salary/new`);
const historyRoute = (idx: number) => (idx < 0 ? "/dashboard" : `${DEPARTMENTS[idx].route}/salary`);
const deptColor = (idx: number) => (idx < 0 ? UNASSIGNED_COLOR : DEPARTMENTS[idx].color);
const deptName = (idx: number) => (idx < 0 ? "Unassigned" : DEPARTMENTS[idx].name);

const sum = (rows: Row[], key: keyof Row) => rows.reduce((t, r) => t + (r[key] as number), 0);

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// monthly-salary API shape (also accepts the alternate id-staff field names)
function fromMonthly(r: any, emp?: Employee): Row {
  const department = r.department || emp?.department || "";
  return {
    deptIdx: deptIndex(department),
    department,
    employeeId: String(r.employee_id),
    code: r.employee_code || emp?.employee_code || "",
    name: r.employee_name || empName(emp) || `Employee #${r.employee_id}`,
    month: recordMonth(r.salary_month),
    attendance: num(r.attendance_days ?? r.days),
    basic: num(r.basic_pay ?? r.days_amount),
    sunday: num(r.sunday_amount),
    ot: num(r.ot_amount),
    night: num(r.night_amount),
    other: num(r.other_amount),
    gross: num(r.total_salary ?? r.total_amount),
    deduction: num(r.deduction ?? r.deductions),
    foodCut: num(r.food_cutting),
    partPay: num(r.part_payment),
    net: num(r.net_due ?? r.net_amount),
    remarks: r.remarks || "",
  };
}

const errorMessage = (data: any, fallback: string) => data?.message || data?.error || fallback;

// Loads every page of a list endpoint. Works whether the API paginates
// (page / limit / per_page) or ignores those params and returns everything.
async function fetchAll(url: string, keys: string[], failMsg: string) {
  const seen = new Map<string, any>();
  const PAGE = 500;

  for (let page = 1; page <= 40; page++) {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}page=${page}&limit=${PAGE}&per_page=${PAGE}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorMessage(data, failMsg));

    const list: any[] = Array.isArray(data)
      ? data
      : (keys.map((k) => data?.[k]).find(Array.isArray) as any[]) || [];

    const before = seen.size;
    list.forEach((r, i) => {
      seen.set(String(r.id ?? `${r.employee_id}|${r.salary_month}|${r.department}|${page}-${i}`), r);
    });

    // stop when the page is empty or nothing new arrived (API ignores `page`)
    if (list.length === 0 || seen.size === before) break;
  }

  return [...seen.values()];
}

/* ------------------------------ theme classes ------------------------------ */

const card = "rounded-2xl border border-[var(--border)] bg-[var(--card)]";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_6px_18px_-8px_rgba(37,99,235,0.7)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const fieldCls =
  "rounded-xl border border-[var(--border)] bg-[var(--field)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]";

/* ------------------------------ page ------------------------------ */

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthlyRaw, setMonthlyRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [limit, setLimit] = useState(TABLE_PAGE);
  const [pSearch, setPSearch] = useState("");
  const [pDept, setPDept] = useState("all");
  const [pLimit, setPLimit] = useState(PENDING_PAGE);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [emps, salaries] = await Promise.all([
        fetchAll("/api/employees", ["employees", "data"], "Unable to load employees."),
        fetchAll("/api/monthly-salary", ["salaries", "records", "data"], "Unable to load salary records."),
      ]);

      setEmployees(emps);
      setMonthlyRaw(salaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while loading the dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setMonth(currentMonth());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setLimit(TABLE_PAGE), [month, search, deptFilter]);
  useEffect(() => setPLimit(PENDING_PAGE), [month, pSearch, pDept]);

  /* ------------------------------ derived data ------------------------------ */

  const employeeMap = useMemo(() => new Map(employees.map((e) => [String(e.id), e])), [employees]);
  const activeEmployees = useMemo(() => employees.filter(isActive), [employees]);

  const allRows = useMemo(
    () =>
      monthlyRaw
        .map((r) => fromMonthly(r, employeeMap.get(String(r.employee_id))))
        .filter((r) => r.month),
    [monthlyRaw, employeeMap],
  );

  const monthRows = useMemo(() => allRows.filter((r) => r.month === month), [allRows, month]);
  const prevRows = useMemo(() => allRows.filter((r) => r.month === shiftMonth(month, -1)), [allRows, month]);

  // Every employee id that already has a saved salary for the selected month.
  const paidIds = useMemo(() => new Set(monthRows.map((r) => r.employeeId)), [monthRows]);

  // Every active employee without a saved salary, including ones whose department matches no card.
  const pendingAll = useMemo(
    () =>
      activeEmployees
        .filter((e) => !paidIds.has(String(e.id)))
        .map((e) => ({ e, idx: deptIndex(e.department) })),
    [activeEmployees, paidIds],
  );

  const deptStats = useMemo(
    () =>
      DEPARTMENTS.map((d, i) => {
        const rows = monthRows.filter((r) => r.deptIdx === i);
        const staff = activeEmployees.filter((e) => deptIndex(e.department) === i);
        const pendingCount = pendingAll.filter((p) => p.idx === i).length;
        const done = Math.max(0, staff.length - pendingCount);
        const gross = sum(rows, "gross");

        return {
          ...d,
          index: i,
          rows,
          staff: staff.length,
          done,
          pendingCount,
          gross,
          net: sum(rows, "net"),
          adjustments: sum(rows, "deduction") + sum(rows, "foodCut") + sum(rows, "partPay"),
          average: rows.length ? gross / rows.length : 0,
          coverage: staff.length ? Math.min(100, (done / staff.length) * 100) : 0,
        };
      }),
    [monthRows, activeEmployees, pendingAll],
  );

  // Active employees whose department matches none of the cards.
  const unassigned = useMemo(() => {
    const staff = activeEmployees.filter((e) => deptIndex(e.department) < 0).length;
    const pendingCount = pendingAll.filter((p) => p.idx < 0).length;
    return { staff, pendingCount, done: Math.max(0, staff - pendingCount) };
  }, [activeEmployees, pendingAll]);

  const totals = useMemo(() => {
    const gross = sum(monthRows, "gross");
    const prevGross = sum(prevRows, "gross");
    const adjustments = sum(monthRows, "deduction") + sum(monthRows, "foodCut") + sum(monthRows, "partPay");
    const pendingCount = pendingAll.length;
    const submittedCount = Math.max(0, activeEmployees.length - pendingCount);

    return {
      gross,
      net: sum(monthRows, "net"),
      adjustments,
      submittedCount,
      pendingCount,
      submittedPct: activeEmployees.length ? (submittedCount / activeEmployees.length) * 100 : 0,
      change: prevGross > 0 ? ((gross - prevGross) / prevGross) * 100 : null,
      average: monthRows.length ? gross / monthRows.length : 0,
    };
  }, [monthRows, prevRows, pendingAll, activeEmployees]);

  const breakdown = useMemo(
    () => ({
      earnings: [
        { label: "Basic / day wages", value: sum(monthRows, "basic") },
        { label: "Sunday amount", value: sum(monthRows, "sunday") },
        { label: "Overtime", value: sum(monthRows, "ot") },
        { label: "Night duty", value: sum(monthRows, "night") },
        { label: "Other", value: sum(monthRows, "other") },
      ],
      cuts: [
        { label: "Deductions", value: sum(monthRows, "deduction") },
        { label: "Food cutting", value: sum(monthRows, "foodCut") },
        { label: "Part payment", value: sum(monthRows, "partPay") },
      ],
    }),
    [monthRows],
  );

  const trend = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { items: [], max: 1 };
    }

    const items = Array.from({ length: 6 }, (_, i) => {
      const m = shiftMonth(month, i - 5);
      const rows = allRows.filter((r) => r.month === m);

      return {
        month: m,
        gross: sum(rows, "gross"),
        net: sum(rows, "net"),
        count: rows.length,
      };
    });

    return {
      items,
      max: Math.max(1, ...items.map((i) => i.gross)),
    };
  }, [allRows, month]);

  const donut = useMemo(() => {
    const R = 60;
    const C = 2 * Math.PI * R;
    let offset = 0;
    const segments = deptStats.map((d) => {
      const frac = totals.gross > 0 ? d.gross / totals.gross : 0;
      const seg = { dash: frac * C, offset, color: d.color, name: d.name, share: frac * 100, gross: d.gross };
      offset += frac * C;
      return seg;
    });
    return { R, C, segments };
  }, [deptStats, totals.gross]);

  // Overall submission ring.
  const ring = useMemo(() => {
    const R = 52;
    const C = 2 * Math.PI * R;
    return { R, C, dash: (Math.min(100, totals.submittedPct) / 100) * C };
  }, [totals.submittedPct]);

  // Net salary distribution: how many employees fall in each pay band.
  const distribution = useMemo(() => {
    const values = monthRows.map((r) => r.net).filter((v) => v > 0);
    if (values.length === 0) return { buckets: [] as { from: number; to: number; count: number }[], max: 1, avg: 0, median: 0 };

    const BUCKETS = 6;
    const top = values.reduce((m, v) => Math.max(m, v), 0);
    const step = Math.max(1000, Math.ceil(top / BUCKETS / 1000) * 1000);
    const buckets = Array.from({ length: BUCKETS }, (_, i) => ({ from: i * step, to: (i + 1) * step, count: 0 }));
    values.forEach((v) => {
      buckets[Math.min(BUCKETS - 1, Math.floor(v / step))].count += 1;
    });

    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

    return {
      buckets,
      max: Math.max(1, ...buckets.map((b) => b.count)),
      avg: values.reduce((t, v) => t + v, 0) / values.length,
      median,
    };
  }, [monthRows]);

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthRows
      .filter((r) => {
        if (deptFilter !== "all" && String(r.deptIdx) !== deptFilter) return false;
        if (!q) return true;
        return [r.name, r.code, r.department, r.remarks].some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => a.deptIdx - b.deptIdx || a.name.localeCompare(b.name));
  }, [monthRows, search, deptFilter]);

  // Pending list: searchable, filterable, scrolls inside its own card.
  const pendingCounts = useMemo(() => {
    const counts = new Map<number, number>();
    pendingAll.forEach((p) => counts.set(p.idx, (counts.get(p.idx) || 0) + 1));
    return counts;
  }, [pendingAll]);

  const pendingRows = useMemo(() => {
    const q = pSearch.trim().toLowerCase();
    return pendingAll
      .filter(({ e, idx }) => {
        if (pDept !== "all" && String(idx) !== pDept) return false;
        if (!q) return true;
        return [empName(e), e.employee_code, e.department].some((v) => String(v ?? "").toLowerCase().includes(q));
      })
      .sort((a, b) => (a.idx < 0 ? 99 : a.idx) - (b.idx < 0 ? 99 : b.idx) || empName(a.e).localeCompare(empName(b.e)));
  }, [pendingAll, pSearch, pDept]);

  const topDept = [...deptStats].sort((a, b) => b.gross - a.gross)[0];

  // Scroll state for the saved-records list (drives the fade, hint pill and back-to-top button).
  const tableRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ top: true, end: false });

  const updateScroll = useCallback(() => {
    const el = tableRef.current;
    if (!el) return;
    setScrollState({
      top: el.scrollTop < 8,
      end: el.scrollTop + el.clientHeight >= el.scrollHeight - 8,
    });
  }, []);

  useEffect(() => {
    updateScroll();
  }, [tableRows, limit, loading, updateScroll]);

  function exportCsv() {
    const headers = [
      "Month", "Department", "Employee Code", "Employee Name", "Attendance Days",
      "Basic", "Sunday", "OT", "Night", "Other", "Gross Salary",
      "Deduction", "Food Cutting", "Part Payment", "Net Due", "Remarks",
    ];
    const lines = tableRows.map((r) => [
      r.month, r.department, r.code, r.name, r.attendance, r.basic, r.sunday, r.ot, r.night,
      r.other, r.gross, r.deduction, r.foodCut, r.partPay, r.net, r.remarks,
    ]);
    const csv = [headers, ...lines].map((l) => l.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-dashboard-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ------------------------------ render ------------------------------ */

  const kpis = [
    {
      label: "Total payroll",
      value: compact(totals.gross),
      exact: inr(totals.gross),
      note:
        totals.change === null
          ? "No previous month to compare"
          : `${totals.change >= 0 ? "+" : ""}${totals.change.toFixed(1)}% vs ${formatMonth(shiftMonth(month, -1), true)}`,
      trend: totals.change === null ? 0 : Math.sign(totals.change),
      icon: IndianRupee,
    },
    { label: "Net payable", value: compact(totals.net), exact: inr(totals.net), note: `${monthRows.length} saved salary records`, trend: 0, icon: Wallet, accent: true },
    {
      label: "Salaries submitted",
      value: `${totals.submittedCount} / ${activeEmployees.length}`,
      note: `${totals.pendingCount} still pending · ${totals.submittedPct.toFixed(0)}% complete`,
      trend: 0,
      icon: Users,
    },
    {
      label: "Deductions & adjustments",
      value: compact(totals.adjustments),
      exact: inr(totals.adjustments),
      note: totals.gross > 0 ? `${((totals.adjustments / totals.gross) * 100).toFixed(1)}% of gross payroll` : "Nothing recorded",
      trend: 0,
      icon: Activity,
    },
  ];

  // Rows for the "submission by department" chart.
  const statusRows = [
    ...deptStats.map((d) => ({ key: d.name, name: d.name, color: d.color, staff: d.staff, done: d.done, pending: d.pendingCount })),
    ...(unassigned.staff > 0
      ? [{ key: "unassigned", name: "Unassigned", color: UNASSIGNED_COLOR, staff: unassigned.staff, done: unassigned.done, pending: unassigned.pendingCount }]
      : []),
  ];

  const pendingChips: { value: string; label: string; count: number; color?: string }[] = [
    { value: "all", label: "All", count: pendingAll.length },
    ...DEPARTMENTS.map((d, i) => ({ value: String(i), label: d.name, count: pendingCounts.get(i) || 0, color: d.color })),
    ...((pendingCounts.get(-1) || 0) > 0 ? [{ value: "-1", label: "Unassigned", count: pendingCounts.get(-1) || 0, color: UNASSIGNED_COLOR }] : []),
  ];

  return (
    <div className="salary-theme">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-[var(--muted)]">Payroll management</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Payroll totals, salary calculation and pending entries for {formatMonth(month)}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="p-2.5 text-[var(--muted)] hover:text-[var(--text)]" aria-label="Previous month">
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2 px-1">
                <CalendarDays size={16} className="text-[var(--accent)]" />
                <input
                  type="month"
                  value={month}
                  onChange={(e) => e.target.value && setMonth(e.target.value)}
                  aria-label="Dashboard salary month"
                  className="w-[140px] bg-transparent py-2.5 text-sm font-semibold text-[var(--text)] outline-none"
                />
              </div>
              <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="p-2.5 text-[var(--muted)] hover:text-[var(--text)]" aria-label="Next month">
                <ChevronRight size={18} />
              </button>
            </div>

            <button type="button" onClick={() => void load(true)} disabled={loading || refreshing} className={ghostBtn} title="Refresh">
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button type="button" onClick={exportCsv} disabled={tableRows.length === 0} className={primaryBtn}>
              <Download size={16} />
              Export
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-[var(--danger)] bg-[var(--danger-bg)] p-4 text-sm text-[var(--danger)] sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <CircleAlert size={18} />
              {error}
            </span>
            <button type="button" onClick={() => void load()} className="font-semibold underline">
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center gap-3 text-[var(--muted)]">
            <LoaderCircle className="animate-spin text-[var(--accent)]" size={28} />
            Preparing your payroll dashboard…
          </div>
        ) : (
          <>
            {/* KPIs */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map(({ label, value, exact, note, trend: t, icon: Icon, accent }) => (
                <div
                  key={label}
                  title={exact}
                  className={`${card} p-5 ${accent ? "!border-[var(--accent)] !bg-[var(--accent-bg)]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-medium ${accent ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{label}</p>
                      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[var(--text)] sm:text-[28px]">{value}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--head)] p-3 text-[var(--accent)]">
                      <Icon size={21} />
                    </div>
                  </div>
                  <p
                    className={`mt-4 flex items-center gap-1.5 border-t border-[var(--border)] pt-3 text-xs ${
                      t > 0 ? "font-semibold text-[var(--good)]" : t < 0 ? "font-semibold text-[var(--danger)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {t > 0 && <ArrowUpRight size={14} />}
                    {t < 0 && <ArrowDownRight size={14} />}
                    {note}
                  </p>
                </div>
              ))}
            </section>

            {/* Trend + calculation breakdown */}
            <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
              <div className={`${card} p-5 sm:p-6`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text)]">Payroll trend</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Gross and net for the last six months. Select a bar to switch month.</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--accent)]" />Gross</span>
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--accent2)]" />Net</span>
                  </div>
                </div>

                <div className="mt-6 flex h-[250px] items-end gap-3 sm:gap-5">
                  {trend.items.map((item) => {
                    const selected = item.month === month;
                    return (
                      <button
                        key={item.month}
                        type="button"
                        onClick={() => setMonth(item.month)}
                        title={`${formatMonth(item.month)} · Gross ${inr(item.gross)} · Net ${inr(item.net)} · ${item.count} records`}
                        className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                      >
                        <span className={`text-[11px] font-semibold tabular-nums ${selected ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                          {compact(item.gross)}
                        </span>
                        <div className={`flex h-[180px] w-full items-end justify-center gap-1 transition ${selected ? "" : "opacity-45 group-hover:opacity-80"}`}>
                          <div className="w-full max-w-[28px] rounded-t-md bg-[var(--accent)]" style={{ height: `${Math.max(2, (item.gross / trend.max) * 100)}%` }} />
                          <div className="w-full max-w-[28px] rounded-t-md bg-[var(--accent2)]" style={{ height: `${Math.max(2, (item.net / trend.max) * 100)}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${selected ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                          {formatMonth(item.month, true)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`${card} p-5 sm:p-6`}>
                <h2 className="text-lg font-bold text-[var(--text)]">How the net is calculated</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Earnings add up to gross; cuts come off to give net payable.</p>

                <div className="mt-5 space-y-3">
                  {breakdown.earnings.map((item) => (
                    <BarLine key={item.label} label={item.label} value={item.value} base={totals.gross} sign="+" />
                  ))}
                  <div className="flex items-center justify-between border-y border-[var(--border)] py-3 text-sm font-bold text-[var(--text)]">
                    <span>Gross payroll</span>
                    <span className="tabular-nums">{inr(totals.gross)}</span>
                  </div>
                  {breakdown.cuts.map((item) => (
                    <BarLine key={item.label} label={item.label} value={item.value} base={totals.gross} sign="−" negative />
                  ))}
                  <div className="flex items-center justify-between rounded-xl bg-[var(--accent-bg)] px-4 py-3 text-sm font-bold text-[var(--accent)]">
                    <span>Net payable</span>
                    <span className="tabular-nums">{inr(totals.net)}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Departments */}
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)]">Department overview</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {topDept && topDept.gross > 0
                      ? `${topDept.name} has the highest payroll this month at ${compact(topDept.gross)}.`
                      : "No salary has been saved for this month yet."}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)]">Average gross per record: {inr(totals.average)}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {deptStats.map((d) => {
                  const Icon = d.icon;
                  return (
                    <div key={d.name} className={`${card} relative overflow-hidden p-5`}>
                      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: d.color }} />
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded-xl p-3" style={{ backgroundColor: `${d.color}22`, color: d.color }}>
                            <Icon size={21} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-[var(--text)]">{d.name}</h3>
                            <p className="mt-0.5 text-xs text-[var(--muted)]">{d.desc}</p>
                          </div>
                        </div>
                        <Link href={historyRoute(d.index)} title="Open salary history" className="shrink-0 text-[var(--muted)] hover:text-[var(--accent)]">
                          <ArrowUpRight size={19} />
                        </Link>
                      </div>

                      <p className="mt-5 text-xs text-[var(--muted)]">Gross salary</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-[var(--text)]">{inr(d.gross)}</p>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        {[
                          ["Net due", compact(d.net)],
                          ["Avg / record", compact(d.average)],
                          ["Adjustments", compact(d.adjustments)],
                        ].map(([l, v]) => (
                          <div key={l} className="rounded-xl bg-[var(--head)] p-2.5">
                            <p className="text-[11px] text-[var(--muted)]">{l}</p>
                            <p className="mt-1 text-sm font-bold tabular-nums text-[var(--text)]">{v}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-[var(--muted)]">Entered {d.done} of {d.staff} employees</span>
                          <span className={`font-semibold ${d.pendingCount ? "text-[var(--warn)]" : "text-[var(--good)]"}`}>
                            {d.pendingCount ? `${d.pendingCount} pending` : "Complete"}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--head)]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${d.coverage}%`, backgroundColor: d.color }} />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
                        <Link href={historyRoute(d.index)} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                          History
                        </Link>
                        <Link href={`${entryRoute(d.index)}?month=${month}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--on-accent)] hover:opacity-90">
                          <Plus size={14} />
                          Add salary
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Submission status + share + distribution (fixed-size cards, never grow with headcount) */}
            <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {/* Submission status */}
              <div className={`${card} p-5 sm:p-6`}>
                <h2 className="text-lg font-bold text-[var(--text)]">Submission status</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">How many salaries are saved for {formatMonth(month)}.</p>

                <div className="mt-5 flex items-center gap-5">
                  <div className="relative h-[130px] w-[130px] shrink-0">
                    <svg viewBox="0 0 130 130" className="h-full w-full" role="img" aria-label="Salary submission progress">
                      <circle cx="65" cy="65" r={ring.R} fill="none" stroke="var(--head)" strokeWidth="14" />
                      <circle
                        cx="65"
                        cy="65"
                        r={ring.R}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={`${ring.dash} ${ring.C - ring.dash}`}
                        transform="rotate(-90 65 65)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold tabular-nums text-[var(--text)]">{totals.submittedPct.toFixed(0)}%</span>
                      <span className="text-[11px] text-[var(--muted)]">submitted</span>
                    </div>
                  </div>

                  <div className="grid flex-1 grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-[var(--head)] p-3">
                      <p className="text-[11px] text-[var(--muted)]">Submitted</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-[var(--good)]">{totals.submittedCount}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--head)] p-3">
                      <p className="text-[11px] text-[var(--muted)]">Pending</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-[var(--warn)]">{totals.pendingCount}</p>
                    </div>
                    <div className="col-span-2 rounded-xl bg-[var(--head)] p-3">
                      <p className="text-[11px] text-[var(--muted)]">Active employees</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text)]">{activeEmployees.length}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3.5">
                  {statusRows.map((s) => {
                    const donePct = s.staff ? (s.done / s.staff) * 100 : 0;
                    return (
                      <div key={s.key}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                          <span className="flex min-w-0 items-center gap-2 text-[var(--text)]">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                            <span className="truncate font-medium">{s.name}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-[var(--muted)]">
                            <span className="font-semibold text-[var(--text)]">{s.done}</span> / {s.staff}
                            {s.pending > 0 && <span className="ml-2 font-semibold text-[var(--warn)]">{s.pending} pending</span>}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--head)]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${donePct}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department share */}
              <div className={`${card} p-5 sm:p-6`}>
                <h2 className="text-lg font-bold text-[var(--text)]">Department share</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Share of this month&apos;s gross payroll.</p>

                <div className="mt-5 flex flex-col items-center gap-6">
                  <div className="relative h-[170px] w-[170px] shrink-0">
                    <svg viewBox="0 0 160 160" className="h-full w-full" role="img" aria-label="Department share of payroll">
                      <circle cx="80" cy="80" r={donut.R} fill="none" stroke="var(--head)" strokeWidth="18" />
                      {donut.segments.map(
                        (s) =>
                          s.dash > 0 && (
                            <circle
                              key={s.name}
                              cx="80"
                              cy="80"
                              r={donut.R}
                              fill="none"
                              stroke={s.color}
                              strokeWidth="18"
                              strokeDasharray={`${s.dash} ${donut.C - s.dash}`}
                              strokeDashoffset={-s.offset}
                              transform="rotate(-90 80 80)"
                            />
                          ),
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-[var(--muted)]">Gross</span>
                      <span className="text-lg font-bold tabular-nums text-[var(--text)]">{compact(totals.gross)}</span>
                    </div>
                  </div>

                  <div className="w-full space-y-2.5">
                    {donut.segments.map((s) => (
                      <div key={s.name} className="flex items-center gap-3 text-sm">
                        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                        <span className="min-w-0 flex-1 truncate text-[var(--text)]">{s.name}</span>
                        <span className="text-xs tabular-nums text-[var(--muted)]">{s.share.toFixed(1)}%</span>
                        <span className="min-w-[72px] text-right font-semibold tabular-nums text-[var(--text)]">{compact(s.gross)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Net salary distribution */}
              <div className={`${card} p-5 sm:p-6 lg:col-span-2 xl:col-span-1`}>
                <h2 className="text-lg font-bold text-[var(--text)]">Net salary distribution</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Number of employees in each net pay band.</p>

                {distribution.buckets.length === 0 ? (
                  <p className="mt-8 rounded-xl bg-[var(--head)] p-6 text-center text-sm text-[var(--muted)]">
                    Distribution appears once salaries are saved for this month.
                  </p>
                ) : (
                  <>
                    <div className="mt-6 flex h-[200px] items-end gap-2">
                      {distribution.buckets.map((b) => (
                        <div
                          key={b.from}
                          title={`${inr(b.from)} – ${inr(b.to)} · ${b.count} employees`}
                          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                        >
                          <span className="text-[11px] font-semibold tabular-nums text-[var(--text)]">{b.count}</span>
                          <div
                            className="w-full rounded-t-md bg-[var(--accent)]"
                            style={{ height: `${b.count === 0 ? 1 : Math.max(4, (b.count / distribution.max) * 78)}%`, opacity: b.count === 0 ? 0.25 : 1 }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      {distribution.buckets.map((b) => (
                        <span key={b.from} className="min-w-0 flex-1 truncate text-center text-[10px] tabular-nums text-[var(--muted)]">
                          {compact(b.from)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl bg-[var(--head)] p-3">
                        <p className="text-[11px] text-[var(--muted)]">Average net</p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-[var(--text)]">{inr(distribution.avg)}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--head)] p-3">
                        <p className="text-[11px] text-[var(--muted)]">Median net</p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-[var(--text)]">{inr(distribution.median)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Pending salary entries: fixed height, scrolls inside the card, so 10 or 500 people never stretch the page */}
            <section className={`${card} overflow-hidden`}>
              <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[var(--text)]">Pending salary entries</h2>
                      <span className="rounded-full bg-[var(--head)] px-3 py-1 text-sm font-bold text-[var(--warn)]">{totals.pendingCount}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {totals.submittedCount} of {activeEmployees.length} active employees submitted for {formatMonth(month)}. Scroll or search to see everyone still pending.
                    </p>
                  </div>

                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      value={pSearch}
                      onChange={(e) => setPSearch(e.target.value)}
                      placeholder="Search pending…"
                      className={`${fieldCls} w-full pl-9 sm:w-64`}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pendingChips.map((c) => {
                    const active = pDept === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setPDept(c.value)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                        }`}
                      >
                        {c.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />}
                        {c.label}
                        <span className="tabular-nums">{c.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {pendingRows.length === 0 ? (
                <p className="m-5 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-bg)] p-6 text-center text-sm font-medium text-[var(--accent)] sm:m-6">
                  <CheckCircle2 size={18} />
                  {pendingAll.length === 0
                    ? "Every active employee has a salary entry for this month."
                    : "No pending employees match this search."}
                </p>
              ) : (
                <div className="modern-scroll max-h-[440px] overflow-y-auto p-3 sm:p-4">
                  <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {pendingRows.slice(0, pLimit).map(({ e, idx }) => (
                      <li
                        key={`${idx}-${e.id}`}
                        className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 hover:bg-[var(--hover)]"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                          style={{ backgroundColor: `${deptColor(idx)}22`, color: deptColor(idx) }}
                        >
                          {(empName(e) || "E").slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--text)]">{empName(e) || `Employee #${e.id}`}</span>
                          <span className="block truncate text-xs text-[var(--muted)]">
                            {e.employee_code ? `${e.employee_code} · ` : ""}
                            {idx < 0 ? e.department || "Unassigned" : deptName(idx)}
                          </span>
                        </span>
                        <Link
                          href={`${entryRoute(idx)}?month=${month}&employee_id=${encodeURIComponent(String(e.id))}`}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
                        >
                          Enter
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {pLimit < pendingRows.length && (
                    <div className="mt-3 text-center">
                      <button type="button" onClick={() => setPLimit((l) => l + PENDING_PAGE)} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                        Show {Math.min(PENDING_PAGE, pendingRows.length - pLimit)} more
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)]">
                Showing {Math.min(pLimit, pendingRows.length)} of {pendingRows.length} pending employees
              </div>
            </section>

            {/* Records */}
            <section className={`${card} overflow-hidden`}>
              <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[var(--text)]">Saved salary records</h2>
                    <span className="rounded-full bg-[var(--accent-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{tableRows.length}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{formatMonth(month)} · open a record to view or edit its salary sheet.</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…" className={`${fieldCls} w-full pl-9 sm:w-56`} />
                  </div>
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={fieldCls} aria-label="Filter by department">
                    <option value="all">All departments</option>
                    {DEPARTMENTS.map((d, i) => (
                      <option key={d.name} value={String(i)}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {tableRows.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--head)] text-[var(--muted)]">
                    <FileText size={25} />
                  </div>
                  <h3 className="font-semibold text-[var(--text)]">No salary records found</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
                    Nothing is saved for this month with these filters. Try another month or department.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                  <div ref={tableRef} onScroll={updateScroll} className="modern-scroll max-h-[400px] overflow-auto">
                    <table className="w-full min-w-[920px] text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-[var(--head)] text-xs text-[var(--muted)]">
                        <tr>
                          <th className="px-5 py-3.5 font-semibold">Employee</th>
                          <th className="px-5 py-3.5 font-semibold">Department</th>
                          <th className="px-5 py-3.5 text-right font-semibold">Days</th>
                          <th className="px-5 py-3.5 text-right font-semibold">Gross</th>
                          <th className="px-5 py-3.5 text-right font-semibold">Cuts</th>
                          <th className="px-5 py-3.5 text-right font-semibold">Net due</th>
                          <th className="px-5 py-3.5 text-center font-semibold">Record</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {tableRows.slice(0, limit).map((r) => {
                          const color = deptColor(r.deptIdx);
                          return (
                            <tr key={`${r.deptIdx}-${r.employeeId}-${r.month}`} className="hover:bg-[var(--hover)]">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold" style={{ backgroundColor: `${color}22`, color }}>
                                    {r.name.slice(0, 1).toUpperCase()}
                                  </span>
                                  <div>
                                    <p className="font-semibold text-[var(--text)]">{r.name}</p>
                                    <p className="mt-0.5 text-xs text-[var(--muted)]">{r.code || `ID: ${r.employeeId}`}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--head)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)]">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                  {r.department || "Unassigned"}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right tabular-nums text-[var(--text)]">{r.attendance}</td>
                              <td className="px-5 py-4 text-right font-semibold tabular-nums text-[var(--text)]">{inr(r.gross)}</td>
                              <td className="px-5 py-4 text-right tabular-nums text-[var(--danger)]">{inr(r.deduction + r.foodCut + r.partPay)}</td>
                              <td className="px-5 py-4 text-right font-bold tabular-nums text-[var(--accent)]">{inr(r.net)}</td>
                              <td className="px-5 py-4 text-center">
                                <Link
                                  href={`${entryRoute(r.deptIdx)}?month=${encodeURIComponent(r.month)}&employee_id=${encodeURIComponent(r.employeeId)}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
                                >
                                  Open
                                  <ArrowRight size={13} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="sticky bottom-0 border-t-2 border-[var(--border)] bg-[var(--head)] text-sm font-bold text-[var(--text)]">
                        <tr>
                          <td className="px-5 py-4" colSpan={3}>Total for filtered records</td>
                          <td className="px-5 py-4 text-right tabular-nums">{inr(sum(tableRows, "gross"))}</td>
                          <td className="px-5 py-4 text-right tabular-nums text-[var(--danger)]">
                            {inr(sum(tableRows, "deduction") + sum(tableRows, "foodCut") + sum(tableRows, "partPay"))}
                          </td>
                          <td className="px-5 py-4 text-right tabular-nums text-[var(--accent)]">{inr(sum(tableRows, "net"))}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* fade + hint: more rows below */}
                  {!scrollState.end && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-[52px] flex h-16 items-end justify-center bg-gradient-to-t from-[var(--card)] to-transparent pb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] font-semibold text-[var(--muted)] shadow-lg">
                        <ArrowDown size={12} className="animate-bounce" />
                        Scroll for more
                      </span>
                    </div>
                  )}

                  {/* back to top */}
                  {!scrollState.top && (
                    <button
                      type="button"
                      onClick={() => tableRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                      className="absolute bottom-[68px] right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] shadow-lg hover:opacity-90"
                      aria-label="Back to top"
                      title="Back to top"
                    >
                      <ArrowUp size={16} />
                    </button>
                  )}
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)]">
                    <span>Showing {Math.min(limit, tableRows.length)} of {tableRows.length} records</span>
                    {limit < tableRows.length && (
                      <button type="button" onClick={() => setLimit((l) => l + 25)} className="font-semibold text-[var(--accent)] hover:underline">
                        Show more
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>

            <footer className="flex flex-col gap-2 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
              <span>Payroll management dashboard · {formatMonth(month)}</span>
              <span className="flex items-center gap-2">
                <Activity size={14} />
                {activeEmployees.length} active employees · {monthRows.length} salary records
              </span>
            </footer>
          </>
        )}
      </div>

      <style jsx global>{`
        .salary-theme {
          font-family: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          color: var(--text);
        }
        [data-shell-theme="light"] .salary-theme {
          --bg: #f1f5fb;
          --card: #ffffff;
          --field: #ffffff;
          --head: #e8eef8;
          --hover: #f1f5fc;
          --border: #d5dded;
          --text: #0f1a2e;
          --muted: #5a6a86;
          --accent: #2563eb;
          --accent2: #0891b2;
          --accent-bg: #e5eefe;
          --on-accent: #ffffff;
          --ring: #bfd4fd;
          --good: #047857;
          --warn: #b45309;
          --danger: #b42318;
          --danger-bg: #fdecea;
        }
        [data-shell-theme="dark"] .salary-theme {
          --bg: #070d1a;
          --card: #0d1526;
          --field: #0a1120;
          --head: #111c33;
          --hover: #12203b;
          --border: #1f2d4a;
          --text: #e6edf9;
          --muted: #8a9bbd;
          --accent: #3b82f6;
          --accent2: #22d3ee;
          --accent-bg: #0f2247;
          --on-accent: #ffffff;
          --ring: #1e3a8a;
          --good: #34d399;
          --warn: #fbbf24;
          --danger: #ff8a80;
          --danger-bg: #2c1618;
        }
        .modern-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--accent) transparent;
          scroll-behavior: smooth;
          overscroll-behavior: contain;
        }
        .modern-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .modern-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .modern-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .modern-scroll:hover::-webkit-scrollbar-thumb {
          background: var(--accent);
          background-clip: padding-box;
          border: 2px solid transparent;
        }
        .salary-theme a:focus-visible,
        .salary-theme input:focus-visible,
        .salary-theme select:focus-visible,
        .salary-theme button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------ small components ------------------------------ */

function BarLine({
  label,
  value,
  base,
  sign,
  negative,
}: {
  label: string;
  value: number;
  base: number;
  sign: string;
  negative?: boolean;
}) {
  const pct = base > 0 ? Math.min(100, (value / base) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">{label}</span>
        <span className={`font-semibold tabular-nums ${negative ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>
          {value === 0 ? "—" : `${sign} ${inr(value)}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--head)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: negative ? "var(--danger)" : "var(--accent)" }}
        />
      </div>
    </div>
  );
}