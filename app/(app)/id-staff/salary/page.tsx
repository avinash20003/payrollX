"use client";

// app/(app)/id-staff/salary/page.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  FileSpreadsheet,
  IndianRupee,
  Loader2,
  Moon,
  Printer,
  RefreshCw,
  Sun,
  Users,
  Wallet,
} from "lucide-react";

type SalaryRecord = {
  id?: number | string;
  employee_id: number | string;
  employee_code?: string;
  employee_name?: string;
  department?: string;
  salary_month: string;
  rate?: number | string;
  days?: number | string;
  days_amount?: number | string;
  ot_hours?: number | string;
  ot_rate?: number | string;
  employee_ot_rate?: number | string;
  ot_amount?: number | string;
  total_amount?: number | string;
  total_salary?: number | string;
  deductions?: number | string;
  deduction?: number | string;
  net_amount?: number | string;
  net_due?: number | string;
  remarks?: string | null;
};

type Employee = {
  id: number | string;
  basic_salary: number | string;
};

type MonthlySummary = {
  month: string;
  employees: number;
  totalSalary: number;
  netDue: number;
  deductions: number;
  records: SalaryRecord[];
};

type Theme = "light" | "dark";

const DEPARTMENT = "Voucher & ID Staff";

/* ------------------------------ helpers ------------------------------ */

function isVoucherIdStaff(value: string | null | undefined) {
  const key = (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ["voucheridstaff", "voucherandidstaff", "idstaff"].includes(key);
}

function numberValue(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getCurrentMonth() {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getRecordMonth(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (c) => entities[c]);
}

const sum = (records: SalaryRecord[], key: keyof SalaryRecord) =>
  records.reduce((total, r) => total + numberValue(r[key] as string | number), 0);

/* ------------------------------ theme classes ------------------------------ */

const card = "rounded-2xl border border-[var(--border)] bg-[var(--card)]";
const fieldCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--field)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--on-accent)] shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_6px_18px_-8px_rgba(37,99,235,0.7)] hover:opacity-90";
const smallBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--hover)]";

/* ------------------------------ page ------------------------------ */

export default function SalaryMonthlyHistoryPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [employeesById, setEmployeesById] = useState<Map<string, Employee>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");

  // Same storage key as the "Add monthly salary" page, so both stay in sync.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("salary-theme");
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {}
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("salary-theme", next);
    } catch {}
  }

  const loadHistory = useCallback(async (refresh = false) => {
    try {
      setError("");
      if (refresh) setRefreshing(true);
      else setLoading(true);

      // No month parameter: fetch saved records for every month.
      const [response, employeesResponse] = await Promise.all([
        fetch("/api/monthly-salary", { method: "GET", cache: "no-store" }),
        fetch("/api/employees", { method: "GET", cache: "no-store" }),
      ]);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to load monthly salary history.");
      }

      const data = await response.json();
      if (employeesResponse.ok) {
        const employeeData = await employeesResponse.json();
        const employees: Employee[] = Array.isArray(employeeData)
          ? employeeData
          : Array.isArray(employeeData?.employees)
            ? employeeData.employees
            : [];
        setEmployeesById(new Map(employees.map((employee) => [String(employee.id), employee])));
      }
      const list: SalaryRecord[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data?.salaries)
            ? data.salaries
            : [];

      setRecords(
        list.filter(
          (r) => isVoucherIdStaff(r.department) && Boolean(getRecordMonth(r.salary_month)),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading salary history.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const monthlyHistory = useMemo(() => {
    const grouped = new Map<string, SalaryRecord[]>();
    records.forEach((r) => {
      const month = getRecordMonth(r.salary_month);
      if (!month) return;
      grouped.set(month, [...(grouped.get(month) ?? []), r]);
    });

    const summaries: MonthlySummary[] = Array.from(grouped.entries()).map(
      ([month, list]) => ({
        month,
        employees: new Set(list.map((r) => String(r.employee_id))).size,
        totalSalary: sum(list, "total_salary"),
        netDue: sum(list, "net_due"),
        deductions: sum(list, "deduction"),
        records: list,
      }),
    );

    return summaries.sort((a, b) => b.month.localeCompare(a.month));
  }, [records]);

  const years = useMemo(
    () =>
      Array.from(new Set(monthlyHistory.map((i) => i.month.slice(0, 4)))).sort(
        (a, b) => b.localeCompare(a),
      ),
    [monthlyHistory],
  );

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthlyHistory.filter((item) => {
      const yearOk = selectedYear === "all" || item.month.startsWith(selectedYear);
      const monthOk =
        !q || formatMonth(item.month).toLowerCase().includes(q) || item.month.includes(q);
      return yearOk && monthOk;
    });
  }, [monthlyHistory, search, selectedYear]);

  const overall = useMemo(
    () =>
      filteredHistory.reduce(
        (t, i) => ({
          employees: t.employees + i.employees,
          totalSalary: t.totalSalary + i.totalSalary,
          netDue: t.netDue + i.netDue,
        }),
        { employees: 0, totalSalary: 0, netDue: 0 },
      ),
    [filteredHistory],
  );

  /* ------------------------------ actions ------------------------------ */

  function exportMonthCsv(summary: MonthlySummary) {
    const headers = [
      "Employee Code", "Employee Name", "Department", "Salary Month",
      "Daily Rate", "Days", "Days Amount", "OT Hours", "OT Rate",
      "OT Amount", "Total Salary", "Deductions", "Net Due", "Remarks",
    ];

    const rows = summary.records.map((r) => [
      r.employee_code,
      r.employee_name,
      r.department || DEPARTMENT,
      summary.month,
      (() => {
        const employee = employeesById.get(String(r.employee_id));
        const recordMonth = getRecordMonth(r.salary_month);
        return employee && recordMonth
          ? numberValue(employee.basic_salary) / daysInMonth(recordMonth)
          : r.rate;
      })(),
      r.days,
      r.days_amount,
      r.ot_hours,
      r.employee_ot_rate ?? r.ot_rate ?? 0,
      r.ot_amount,
      r.total_amount,
      r.deductions,
      r.net_amount,
      r.remarks ?? "",
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `voucher-id-staff-salary-${summary.month}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printMonth(summary: MonthlySummary) {
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) {
      setError("Please allow pop-ups to print the salary report.");
      return;
    }

    const rows = summary.records
      .map(
        (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.employee_code ?? "—")}</td>
            <td>${escapeHtml(r.employee_name ?? "Unknown Employee")}</td>
            <td class="number">${formatCurrency(numberValue(r.total_amount))}</td>
            <td class="number">${formatCurrency(numberValue(r.deductions))}</td>
            <td class="number">${formatCurrency(numberValue(r.net_amount))}</td>
          </tr>`,
      )
      .join("");

    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(formatMonth(summary.month))} Salary Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
      h1 { margin-bottom: 4px; font-size: 24px; }
      p { color: #64748b; }
      .summary { display: flex; gap: 24px; margin: 24px 0; }
      .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; flex: 1; }
      .label { color: #64748b; font-size: 12px; }
      .value { font-weight: bold; font-size: 18px; margin-top: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
      th { background: #f1f5f9; }
      .number { text-align: right; white-space: nowrap; }
      @media print { body { padding: 0; } @page { size: landscape; margin: 12mm; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(DEPARTMENT)} — Monthly Salary Report</h1>
    <p>Salary month: ${escapeHtml(formatMonth(summary.month))}</p>
    <div class="summary">
      <div class="card"><div class="label">Employees</div><div class="value">${summary.employees}</div></div>
      <div class="card"><div class="label">Total Salary</div><div class="value">${formatCurrency(summary.totalSalary)}</div></div>
      <div class="card"><div class="label">Net Due</div><div class="value">${formatCurrency(summary.netDue)}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Employee Code</th><th>Employee Name</th>
          <th class="number">Total Salary</th><th class="number">Deductions</th><th class="number">Net Due</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <th colspan="3">Total</th>
          <th class="number">${formatCurrency(summary.totalSalary)}</th>
          <th class="number">${formatCurrency(summary.deductions)}</th>
          <th class="number">${formatCurrency(summary.netDue)}</th>
        </tr>
      </tfoot>
    </table>
    <script>window.onload = function () { window.print(); };</script>
  </body>
</html>`);
    win.document.close();
  }

  /* ------------------------------ render ------------------------------ */

  const addHref = `/id-staff/salary/new?month=${getCurrentMonth()}`;

  const stats = [
    { label: "Months available", value: String(filteredHistory.length), note: "Months with saved records", icon: CalendarDays },
    { label: "Employee records", value: String(overall.employees), note: "Across the months shown", icon: Users },
    { label: "Total salary", value: formatCurrency(overall.totalSalary), note: "Before deductions", icon: Wallet },
    { label: "Net due", value: formatCurrency(overall.netDue), note: "Payable for the months shown", icon: IndianRupee, accent: true },
  ];

  return (
    <div data-theme={theme} className="salary-theme min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/id-staff"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)]"
            >
              <ArrowLeft size={16} />
              Back to {DEPARTMENT}
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              Monthly salary history
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              View, export and print saved salary records for each month.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={toggleTheme} className={ghostBtn} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button type="button" onClick={() => void loadHistory(true)} disabled={loading || refreshing} className={ghostBtn}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link href={addHref} className={primaryBtn}>
              <IndianRupee size={17} />
              Add this month&apos;s salary
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)] sm:flex-row sm:items-center">
            <span>{error}</span>
            <button type="button" onClick={() => void loadHistory(true)} className="shrink-0 font-semibold underline">
              Try again
            </button>
          </div>
        )}

        {/* Summary */}
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {stats.map(({ label, value, note, icon: Icon, accent }) => (
            <div
              key={label}
              className={`${card} p-5 ${accent ? "!border-[var(--accent)] !bg-[var(--accent-bg)]" : ""}`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${accent ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                  {label}
                </p>
                <Icon size={20} className="text-[var(--accent)]" />
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-[var(--text)] sm:text-2xl">
                {loading ? "—" : value}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">{note}</p>
            </div>
          ))}
        </section>

        {/* Filters */}
        <section className={`${card} p-4 sm:p-5`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="salary-year" className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Year
              </label>
              <select id="salary-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={fieldCls}>
                <option value="all">All years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="salary-search" className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Search month
              </label>
              <input
                id="salary-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="September, August or 2026"
                className={fieldCls}
              />
            </div>
          </div>
        </section>

        {/* Monthly history table */}
        <section className={`${card} overflow-hidden`}>
          <div className="border-b border-[var(--border)] p-4 sm:p-5">
            <h2 className="text-lg font-bold text-[var(--text)]">
              Monthly history — {DEPARTMENT}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Each row is one month of saved salary records.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-[var(--head)] text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Salary month</th>
                  <th className="px-5 py-4 text-right font-semibold">Employees</th>
                  <th className="px-5 py-4 text-right font-semibold">Total salary</th>
                  <th className="px-5 py-4 text-right font-semibold">Net due</th>
                  <th className="px-5 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <div className="flex items-center justify-center gap-3 text-[var(--muted)]">
                        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
                        Loading monthly history…
                      </div>
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center">
                        <div className="mb-4 rounded-2xl bg-[var(--head)] p-4 text-[var(--muted)]">
                          <FileSpreadsheet size={30} />
                        </div>
                        <h3 className="font-semibold text-[var(--text)]">
                          {monthlyHistory.length === 0 ? "No salary history yet" : "No matching months"}
                        </h3>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {monthlyHistory.length === 0
                            ? "Saved salaries will appear here once you add them."
                            : "Change the year or search term."}
                        </p>
                        {monthlyHistory.length === 0 && (
                          <Link href={addHref} className={`${primaryBtn} mt-5`}>
                            <IndianRupee size={17} />
                            Add this month&apos;s salary
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((summary) => (
                    <tr key={summary.month} className="hover:bg-[var(--hover)]">
                      <td className="whitespace-nowrap px-5 py-5">
                        <div className="font-semibold text-[var(--text)]">{formatMonth(summary.month)}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {summary.records.length} saved record{summary.records.length !== 1 ? "s" : ""}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-5 text-right font-medium tabular-nums text-[var(--text)]">
                        {summary.employees}
                      </td>
                      <td className="whitespace-nowrap px-5 py-5 text-right font-semibold tabular-nums text-[var(--text)]">
                        {formatCurrency(summary.totalSalary)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-5 text-right font-bold tabular-nums text-[var(--accent)]">
                        {formatCurrency(summary.netDue)}
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/id-staff/salary/new?month=${encodeURIComponent(summary.month)}`}
                            title="View salary details"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--on-accent)] hover:opacity-90"
                          >
                            <Eye size={15} />
                            View
                          </Link>
                          <button type="button" onClick={() => exportMonthCsv(summary)} title="Export this month to CSV" className={smallBtn}>
                            <Download size={15} />
                            Export
                          </button>
                          <button type="button" onClick={() => printMonth(summary)} title="Print this month's report" className={smallBtn}>
                            <Printer size={15} />
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {!loading && filteredHistory.length > 0 && (
                <tfoot className="border-t-2 border-[var(--border)] bg-[var(--head)]">
                  <tr>
                    <td className="px-5 py-4 font-bold text-[var(--text)]">Total for months shown</td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-[var(--text)]">{overall.employees}</td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-[var(--text)]">{formatCurrency(overall.totalSalary)}</td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-[var(--accent)]">{formatCurrency(overall.netDue)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {!loading && filteredHistory.length > 0 && (
            <div className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)]">
              Showing {filteredHistory.length} of {monthlyHistory.length} months
            </div>
          )}
        </section>
      </div>

      <style jsx global>{`
        .salary-theme {
          font-family: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          background: var(--bg);
          color: var(--text);
          color-scheme: light;
        }
        .salary-theme[data-theme="light"] {
          --bg: #f1f5fb;
          --card: #ffffff;
          --field: #ffffff;
          --head: #e8eef8;
          --hover: #f1f5fc;
          --border: #d5dded;
          --text: #0f1a2e;
          --muted: #5a6a86;
          --accent: #2563eb;
          --accent-bg: #e5eefe;
          --on-accent: #ffffff;
          --ring: #bfd4fd;
          --danger: #b42318;
          --danger-bg: #fdecea;
        }
        .salary-theme[data-theme="dark"] {
          color-scheme: dark;
          --bg: #070d1a;
          --card: #0d1526;
          --field: #0a1120;
          --head: #111c33;
          --hover: #12203b;
          --border: #1f2d4a;
          --text: #e6edf9;
          --muted: #8a9bbd;
          --accent: #3b82f6;
          --accent-bg: #0f2247;
          --on-accent: #ffffff;
          --ring: #1e3a8a;
          --danger: #ff8a80;
          --danger-bg: #2c1618;
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
