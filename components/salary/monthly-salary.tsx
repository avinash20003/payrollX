"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

export type SalaryDepartment = {
  name: string;
  route: string;
  aliases: string[];
  api?: string;
};

type Employee = {
  id: number | string;
  employee_code: string;
  employee_name: string;
  department: string;
  basic_salary: number | string;
  ot_rate: number | string;
  night_rate: number | string;
  is_active?: boolean;
};

type SalaryRecord = {
  id?: number | string;
  employee_id: number | string;
  salary_month: string;
  attendance_days: number | string;
  sunday_no_days: number | string;
  night_duties: number | string;
  ot_hours: number | string;
  other_amount: number | string;
  food_cutting: number | string;
  part_payment: number | string;
  deduction: number | string;
  total_salary?: number | string;
  net_due?: number | string;
  remarks?: string | null;
} & Partial<Employee>;

type Row = {
  employee: Employee;
  record?: SalaryRecord;
  attendance: string;
  sunday: string;
  night: string;
  ot: string;
  other: string;
  food: string;
  partPayment: string;
  deduction: string;
  remarks: string;
  saving: boolean;
  error: string;
};

type Field = Exclude<
  keyof Row,
  "employee" | "record" | "saving" | "error"
>;

type ReportValue = string | number;

type ApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  deleted?: number;
  salaries?: SalaryRecord[];
  employees?: Employee[];
};

const normalize = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const numberValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numberValue(value));

const currentMonth = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
};

const isValidMonth = (value: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

const recordMonth = (value: string | null | undefined) => {
  if (!value) return "";

  const match = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);

  if (!match) return "";

  const month = Number(match[2]);

  return month >= 1 && month <= 12
    ? `${match[1]}-${match[2]}`
    : "";
};

const monthLabel = (month: string) => {
  if (!isValidMonth(month)) return month;

  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const daysInMonth = (month: string) => {
  if (!isValidMonth(month)) return 0;

  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(year, monthNumber, 0).getDate();
};

function belongsToDepartment(
  department: SalaryDepartment,
  value: string | null | undefined
) {
  return department.aliases.map(normalize).includes(normalize(value));
}

function rowFrom(employee: Employee, record?: SalaryRecord): Row {
  return {
    employee,
    record,
    attendance: String(record?.attendance_days ?? ""),
    sunday: String(record?.sunday_no_days ?? 0),
    night: String(record?.night_duties ?? 0),
    ot: String(record?.ot_hours ?? 0),
    other: String(record?.other_amount ?? 0),
    food: String(record?.food_cutting ?? 0),
    partPayment: String(record?.part_payment ?? 0),
    deduction: String(record?.deduction ?? 0),
    remarks: record?.remarks ?? "",
    saving: false,
    error: "",
  };
}

function calculate(row: Row, month: string) {
  const basic = numberValue(row.employee.basic_salary);
  const days = daysInMonth(month);
  const daily = days > 0 ? basic / days : 0;

  const basicPay = daily * numberValue(row.attendance);

  // Match the 75% Sunday calculation in the API.
  const sundayAmount = daily * numberValue(row.sunday) * 0.75;

  const nightAmount =
    numberValue(row.night) * numberValue(row.employee.night_rate);

  const otAmount =
    numberValue(row.ot) * numberValue(row.employee.ot_rate);

  const total =
    basicPay +
    sundayAmount +
    nightAmount +
    otAmount +
    numberValue(row.other);

  const net =
    total -
    numberValue(row.food) -
    numberValue(row.partPayment) -
    numberValue(row.deduction);

  return {
    basic,
    daily,
    basicPay,
    sundayAmount,
    nightAmount,
    otAmount,
    total,
    net,
  };
}

async function responseData(response: Response): Promise<ApiResponse> {
  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data
        ? String(data.error)
        : typeof data === "object" &&
            data !== null &&
            "message" in data
          ? String(data.message)
          : `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("The server returned an invalid response.");
  }

  return data as ApiResponse;
}

function recordsFrom(data: unknown): SalaryRecord[] {
  if (Array.isArray(data)) return data as SalaryRecord[];

  if (
    typeof data === "object" &&
    data !== null &&
    "salaries" in data &&
    Array.isArray(data.salaries)
  ) {
    return data.salaries as SalaryRecord[];
  }

  return [];
}

function downloadCsv(
  filename: string,
  headers: string[],
  values: ReportValue[][]
) {
  const csv = [headers, ...values]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\r\n");

  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadExcel(
  filename: string,
  title: string,
  headers: string[],
  values: ReportValue[][]
) {
  const escape = (value: ReportValue) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const table = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Salary History</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2>${escape(title)}</h2>
        <table border="1">
          <thead>
            <tr>${headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${values
              .map(
                (row) =>
                  `<tr>${row.map((value) => `<td>${escape(value)}</td>`).join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const url = URL.createObjectURL(
    new Blob(["\uFEFF", table], {
      type: "application/vnd.ms-excel;charset=utf-8",
    })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printSalaryReport(
  title: string,
  month: string,
  headers: string[],
  values: ReportValue[][]
) {
  const report = window.open("", "_blank");

  if (!report) {
    window.alert("Please allow pop-ups to print the salary report.");
    return;
  }

  const escape = (value: ReportValue) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  report.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escape(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          p { color: #475569; margin: 0 0 18px; }
          table { border-collapse: collapse; width: 100%; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
          th { background: #eff6ff; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${escape(title)}</h1>
        <p>${escape(month)}</p>
        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${values
              .map(
                (row) =>
                  `<tr>${row.map((value) => `<td>${escape(value)}</td>`).join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  report.document.close();
}

export function SalaryHistory({
  department,
}: {
  department: SalaryDepartment;
}) {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) setIsAdmin(false);
          return;
        }

        const data: unknown = await response.json();

        if (
          typeof data === "object" &&
          data !== null &&
          "user" in data &&
          typeof data.user === "object" &&
          data.user !== null &&
          "role" in data.user
        ) {
          if (!cancelled) {
            setIsAdmin(
              String(data.user.role).trim().toUpperCase() === "ADMIN"
            );
          }
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        department.api ?? "/api/monthly-salary",
        { cache: "no-store" }
      );

      const data = await responseData(response);

      setRecords(
        recordsFrom(data).filter(
          (record) =>
            belongsToDepartment(department, record.department) &&
            Boolean(recordMonth(record.salary_month))
        )
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load salary records."
      );
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteMonth = async (
    month: string,
    monthRecords: SalaryRecord[]
  ) => {
    if (!isAdmin) {
      setError("Only administrators can delete salary records.");
      return;
    }

    if (deletingMonth) return;

    if (!isValidMonth(month)) {
      setError("The selected salary month is invalid.");
      return;
    }

    // Use employee_id, never the salary record's own id.
    const employeeIds = [
      ...new Set(
        monthRecords
          .map((record) => Number(record.employee_id))
          .filter(
            (id) => Number.isSafeInteger(id) && id > 0
          )
      ),
    ];

    if (employeeIds.length === 0) {
      setError("No valid employee IDs were found for this month.");
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${monthLabel(month)} salary records for ${department.name}? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingMonth(month);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        department.api ?? "/api/monthly-salary",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            salary_month: month,
            employee_ids: employeeIds,
          }),
        }
      );

      const data = await responseData(response);

      if (data.success !== true) {
        throw new Error(data.error || data.message || "Unable to delete salary records.");
      }

      const deleted = Number(data.deleted ?? 0);

      if (deleted === 0) {
        setNotice(
          "No records were deleted. The selected month and employee IDs did not match any database records."
        );
      } else {
        setNotice(
          `${deleted} salary record(s) deleted for ${monthLabel(month)}.`
        );
      }

      // Refresh the list after deletion.
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete salary records."
      );
    } finally {
      setDeletingMonth(null);
    }
  };

  const summaries = useMemo(() => {
    const groups = new Map<string, SalaryRecord[]>();

    for (const record of records) {
      const month = recordMonth(record.salary_month);

      if (!month) continue;

      groups.set(month, [
        ...(groups.get(month) ?? []),
        record,
      ]);
    }

    return Array.from(groups, ([month, items]) => ({
      month,
      records: items,
      employees: new Set(
        items.map((item) => String(item.employee_id))
      ).size,
      total: items.reduce(
        (sum, item) => sum + numberValue(item.total_salary),
        0
      ),
      net: items.reduce(
        (sum, item) => sum + numberValue(item.net_due),
        0
      ),
    }))
      .filter((summary) =>
        `${summary.month} ${monthLabel(summary.month)}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [records, search]);

  return (
    <div className="min-h-full space-y-6 text-[var(--shell-text)]">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Link
            href={department.route.replace("/salary", "")}
            className="inline-flex items-center gap-2 text-sm text-[var(--shell-accent)] hover:text-[var(--shell-accent)]"
          >
            <ArrowLeft size={16} />
            Back to {department.name}
          </Link>

          <h1 className="mt-2 text-2xl font-bold">
            {department.name} salary
          </h1>

          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            Saved monthly payroll records. A saved month is view-only.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`${department.route}/new?month=${currentMonth()}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
          >
            <Plus size={17} />
            New monthly salary
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<CalendarDays size={20} />}
          label="Saved months"
          value={String(summaries.length)}
        />

        <Stat
          icon={<Users size={20} />}
          label="Salary records"
          value={String(records.length)}
        />

        <Stat
          icon={<Wallet size={20} />}
          label="Net due"
          value={money(
            records.reduce(
              (sum, item) => sum + numberValue(item.net_due),
              0
            )
          )}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <div className="flex flex-col gap-3 border-b border-[var(--shell-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Monthly history</h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              One row per month with saved salary records.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search month"
              aria-label="Search salary month"
              className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2 text-sm outline-none focus:border-blue-400"
            />

            <button
              type="button"
              onClick={() =>
                downloadExcel(
                  `${department.route.split("/").filter(Boolean).join("-")}-salary-history.xls`,
                  `${department.name} salary history`,
                  ["Month", "Employees", "Total Salary", "Net Due"],
                  summaries.map((summary) => [
                    monthLabel(summary.month),
                    summary.employees,
                    summary.total,
                    summary.net,
                  ])
                )
              }
              disabled={loading || summaries.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-[var(--shell-success)] hover:bg-emerald-500/10 disabled:opacity-50"
            >
              <Download size={16} />
              Excel
            </button>

            <button
              type="button"
              onClick={() =>
                printSalaryReport(
                  `${department.name} salary history`,
                  "Monthly salary summary",
                  ["Month", "Employees", "Total Salary", "Net Due"],
                  summaries.map((summary) => [
                    monthLabel(summary.month),
                    summary.employees,
                    money(summary.total),
                    money(summary.net),
                  ])
                )
              }
              disabled={loading || summaries.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-[var(--shell-danger)] hover:bg-rose-500/10 disabled:opacity-50"
            >
              <Printer size={16} />
              Print / PDF
            </button>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || Boolean(deletingMonth)}
              className="rounded-lg border border-[var(--shell-border)] px-3 py-2 hover:bg-[var(--shell-hover)] disabled:opacity-50"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="m-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-[var(--shell-danger)]"
          >
            {error}
          </p>
        )}

        {notice && !error && (
          <p
            role="status"
            className="m-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-[var(--shell-success)]"
          >
            {notice}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--shell-hover)] text-[var(--shell-muted)]">
              <tr>
                <th className="px-5 py-4">Month</th>
                <th className="px-5 py-4 text-right">Employees</th>
                <th className="px-5 py-4 text-right">Total salary</th>
                <th className="px-5 py-4 text-right">Net due</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--shell-border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-[var(--shell-muted)]">
                    <Loader2 className="mx-auto mb-2 animate-spin" />
                    Loading saved months…
                  </td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-[var(--shell-muted)]">
                    No saved salary records found.
                  </td>
                </tr>
              ) : (
                summaries.map((summary) => (
                  <tr key={summary.month} className="hover:bg-[var(--shell-hover)]">
                    <td className="px-5 py-4 font-semibold">
                      {monthLabel(summary.month)}
                      <p className="mt-1 text-xs font-normal text-[var(--shell-muted)]">
                        {summary.records.length} saved record
                        {summary.records.length === 1 ? "" : "s"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right tabular-nums">
                      {summary.employees}
                    </td>

                    <td className="px-5 py-4 text-right tabular-nums">
                      {money(summary.total)}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-[var(--shell-accent)] tabular-nums">
                      {money(summary.net)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`${department.route}/new?month=${encodeURIComponent(summary.month)}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500"
                        >
                          <Eye size={15} />
                          View
                        </Link>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              void deleteMonth(summary.month, summary.records)
                            }
                            disabled={Boolean(deletingMonth)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-500/50 px-3 py-2 text-xs font-semibold text-[var(--shell-danger)] hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Delete ${monthLabel(summary.month)} salary records`}
                            title={`Delete ${monthLabel(summary.month)} records`}
                          >
                            {deletingMonth === summary.month ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                            {deletingMonth === summary.month ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
      <div className="flex items-center gap-2 text-[var(--shell-accent)]">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function SalarySheet({
  department,
}: {
  department: SalaryDepartment;
}) {
  const [month, setMonth] = useState(currentMonth);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMonth = params.get("month");

    if (requestedMonth && isValidMonth(requestedMonth)) {
      setMonth(requestedMonth);
    }
  }, []);

  const readOnly =
    rows.length > 0 && rows.every((row) => Boolean(row.record));

  const load = useCallback(
    async (salaryMonth: string) => {
      if (!salaryMonth || daysInMonth(salaryMonth) === 0) {
        setRows([]);
        setError("Select a valid salary month.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessage("");
      setError("");

      try {
        const api = department.api ?? "/api/monthly-salary";

        const [employeeResponse, salaryResponse] = await Promise.all([
          fetch("/api/employees", { cache: "no-store" }),
          fetch(`${api}?month=${encodeURIComponent(salaryMonth)}`, {
            cache: "no-store",
          }),
        ]);

        const [employeeData, salaryData] = await Promise.all([
          responseData(employeeResponse),
          responseData(salaryResponse),
        ]);

        const employees = Array.isArray(employeeData.employees)
          ? employeeData.employees
          : [];

        const saved = recordsFrom(salaryData).filter(
          (record) =>
            belongsToDepartment(department, record.department) &&
            recordMonth(record.salary_month) === salaryMonth
        );

        if (saved.length > 0) {
          setRows(
            saved.map((record) =>
              rowFrom(
                {
                  id: record.employee_id,
                  employee_code: record.employee_code ?? "—",
                  employee_name: record.employee_name ?? "Unknown employee",
                  department: record.department ?? department.name,
                  basic_salary: record.basic_salary ?? 0,
                  ot_rate: record.ot_rate ?? 0,
                  night_rate: record.night_rate ?? 0,
                },
                record
              )
            )
          );
        } else {
          setRows(
            employees
              .filter(
                (employee) =>
                  Boolean(employee.is_active) &&
                  belongsToDepartment(department, employee.department)
              )
              .map((employee) => rowFrom(employee))
          );
        }
      } catch (loadError) {
        setRows([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the salary sheet."
        );
      } finally {
        setLoading(false);
      }
    },
    [department]
  );

  useEffect(() => {
    void load(month);
  }, [load, month]);

  const patch = (id: string | number, updateValues: Partial<Row>) => {
    setRows((current) =>
      current.map((row) =>
        String(row.employee.id) === String(id)
          ? { ...row, ...updateValues }
          : row
      )
    );
  };

  const update = (row: Row, field: Field, value: string) => {
    if (readOnly) return;

    patch(row.employee.id, {
      [field]: value,
      error: "",
    } as Partial<Row>);
  };

  const validate = (row: Row) => {
    const fields = [
      row.attendance,
      row.sunday,
      row.night,
      row.ot,
      row.other,
      row.food,
      row.partPayment,
      row.deduction,
    ];

    if (
      !row.attendance.trim() ||
      !row.sunday.trim() ||
      fields.some(
        (value) =>
          value.trim() === "" ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0
      )
    ) {
      return "Enter valid non-negative values for every salary input.";
    }

    if (!Number.isInteger(Number(row.sunday))) {
      return "Sunday days must be a whole number.";
    }

    if (!Number.isInteger(Number(row.night))) {
      return "Night duties must be a whole number.";
    }

    if (
      numberValue(row.employee.basic_salary) < 0 ||
      !Number.isFinite(Number(row.employee.basic_salary))
    ) {
      return "The employee's basic salary must be a valid non-negative amount.";
    }

    if (
      numberValue(row.attendance) > daysInMonth(month) ||
      numberValue(row.sunday) > daysInMonth(month) ||
      numberValue(row.night) > daysInMonth(month) ||
      numberValue(row.ot) > daysInMonth(month) * 24
    ) {
      return "Check attendance, Sunday, night, and overtime values.";
    }

    if (numberValue(row.sunday) > numberValue(row.attendance)) {
      return "Sunday days cannot exceed attendance days.";
    }

    if (calculate(row, month).net < 0) {
      return "Deductions cannot exceed total salary.";
    }

    return "";
  };

  const saveAll = async () => {
    if (readOnly || saving || rows.length === 0) return;

    if (!isValidMonth(month)) {
      setError("Select a valid salary month.");
      return;
    }

    const invalid = rows.map(validate);

    if (invalid.some(Boolean)) {
      setRows((current) =>
        current.map((row, index) => ({
          ...row,
          error: invalid[index],
        }))
      );

      setError("Correct the highlighted rows before saving.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const api = department.api ?? "/api/monthly-salary";

      for (const row of rows) {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: Number(row.employee.id),
            salary_month: month,
            attendance_days: numberValue(row.attendance),
            sunday_no_days: Number(row.sunday),
            night_duties: Number(row.night),
            ot_hours: numberValue(row.ot),
            other_amount: numberValue(row.other),
            food_cutting: numberValue(row.food),
            part_payment: numberValue(row.partPayment),
            deduction: numberValue(row.deduction),
            remarks: row.remarks.trim(),
          }),
        });

        await responseData(response);
      }

      setMessage(
        "Salary records saved. This month is now locked for viewing."
      );

      await load(month);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save salary records."
      );
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(
    () =>
      rows.reduce(
        (total, row) => {
          const result = calculate(row, month);

          return {
            total: total.total + result.total,
            net: total.net + result.net,
          };
        },
        { total: 0, net: 0 }
      ),
    [month, rows]
  );

  const input = (row: Row, field: Field, label: string, max?: number) => {
    const isIntegerField = field === "sunday" || field === "night";

    return (
      <input
        aria-label={`${label} for ${row.employee.employee_name}`}
        value={row[field] as string}
        onChange={(event) => {
          const value = event.target.value;

          if (isIntegerField && value.includes(".")) return;

          update(row, field, value);
        }}
        disabled={loading || saving || readOnly}
        type="number"
        min="0"
        max={max}
        step={isIntegerField ? "1" : "any"}
        inputMode="decimal"
        className="w-24 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 py-2 text-right text-sm tabular-nums outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      />
    );
  };

  const headers = [
    "No.",
    "Employee code",
    "Employee name",
    "Basic",
    "Daily salary",
    "Sunday days",
    "Sunday amount",
    "Night duties",
    "Night amount",
    "OT hours",
    "OT amount",
    "Other",
    "Attendance",
    "Basic pay",
    "Total",
    "Food cutting",
    "Part payment",
    "Deduction",
    "Net due",
    "Remarks",
  ];

  const exportValues = rows.map((row, index) => {
    const result = calculate(row, month);

    return [
      index + 1,
      row.employee.employee_code,
      row.employee.employee_name,
      result.basic,
      result.daily,
      Number(row.sunday),
      result.sundayAmount,
      Number(row.night),
      result.nightAmount,
      numberValue(row.ot),
      result.otAmount,
      numberValue(row.other),
      numberValue(row.attendance),
      result.basicPay,
      result.total,
      numberValue(row.food),
      numberValue(row.partPayment),
      numberValue(row.deduction),
      result.net,
      row.remarks,
    ];
  });

  return (
    <div className="min-h-full space-y-6 text-[var(--shell-text)]">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <Link
            href={department.route}
            className="inline-flex items-center gap-2 text-sm text-[var(--shell-accent)] hover:text-[var(--shell-accent)]"
          >
            <ArrowLeft size={16} />
            Saved salary records
          </Link>

          <h1 className="mt-2 text-2xl font-bold">
            {department.name} salary sheet
          </h1>

          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            {monthLabel(month)}
            {readOnly
              ? " · Saved record — view only"
              : " · Enter monthly payroll"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Salary month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            disabled={saving}
            className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-2 text-sm"
          />

          <button
            type="button"
            onClick={() => void load(month)}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--shell-hover)] disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `${department.route.slice(1)}-salary-${month}.csv`,
                headers,
                exportValues
              )
            }
            disabled={loading || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--shell-hover)] disabled:opacity-50"
          >
            <Download size={16} />
            CSV
          </button>

          <button
            type="button"
            onClick={() =>
              printSalaryReport(
                `${department.name} salary report`,
                monthLabel(month),
                headers,
                exportValues
              )
            }
            disabled={loading || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--shell-hover)] disabled:opacity-50"
          >
            <Printer size={16} />
            Print
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={() => void saveAll()}
              disabled={loading || saving || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save month"}
            </button>
          )}
        </div>
      </header>

      {readOnly && (
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--shell-success)]">
          This month has already been saved. Its payroll data is locked and
          can only be viewed.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-[var(--shell-danger)]"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--shell-success)]"
        >
          {message}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--shell-border)] px-5 py-4 sm:flex-row">
          <div>
            <h2 className="font-semibold">Monthly payroll</h2>
            <p className="mt-1 text-xs text-[var(--shell-muted)]">
              Daily salary = Basic salary ÷ {daysInMonth(month)} calendar
              days. Sunday amount = Daily salary × Sunday days × 75%.
              Attendance can contain decimal values; Sunday days must be whole
              numbers.
            </p>
          </div>

          <div className="text-sm sm:text-right">
            <p className="text-[var(--shell-muted)]">
              Total salary
              <b className="ml-1 text-[var(--shell-text)]">{money(totals.total)}</b>
            </p>

            <p className="text-[var(--shell-accent)]">
              Net due
              <b className="ml-1">{money(totals.net)}</b>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[2450px] text-left text-xs">
            <thead className="bg-[var(--shell-hover)] text-[var(--shell-muted)]">
              <tr>
                {headers.map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-3 py-4 font-semibold"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--shell-border)]">
              {loading ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-4 py-16 text-center text-[var(--shell-muted)]"
                  >
                    <Loader2 className="mx-auto mb-2 animate-spin" />
                    Loading salary sheet…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-4 py-16 text-center text-[var(--shell-muted)]"
                  >
                    No active {department.name} employees found.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const result = calculate(row, month);

                  return (
                    <tr
                      key={row.employee.id}
                      className={row.error ? "bg-red-500/10" : "hover:bg-[var(--shell-hover)]"}
                    >
                      <td className="px-3 py-3 text-[var(--shell-muted)]">{index + 1}</td>

                      <td className="px-3 py-3 font-semibold text-[var(--shell-accent)]">
                        {row.employee.employee_code}
                      </td>

                      <td className="px-3 py-3">
                        <p className="font-semibold">{row.employee.employee_name}</p>
                      </td>

                      <td className="px-3 py-3 tabular-nums">
                        {money(result.basic)}
                      </td>

                      <td className="px-3 py-3 tabular-nums">
                        {money(result.daily)}
                      </td>

                      <td className="px-3 py-3">
                        {input(row, "sunday", "Sunday days", daysInMonth(month))}
                      </td>

                      <td className="px-3 py-3 tabular-nums">
                        {money(result.sundayAmount)}
                      </td>

                      <td className="px-3 py-3">
                        {input(row, "night", "Night duties", daysInMonth(month))}
                      </td>

                      <td className="px-3 py-3 tabular-nums">
                        {money(result.nightAmount)}
                      </td>

                      <td className="px-3 py-3">
                        {input(row, "ot", "Overtime hours", daysInMonth(month) * 24)}
                      </td>

                      <td className="px-3 py-3 tabular-nums">
                        {money(result.otAmount)}
                      </td>

                      <td className="px-3 py-3">{input(row, "other", "Other amount")}</td>

                      <td className="px-3 py-3">
                        {input(row, "attendance", "Attendance days", daysInMonth(month))}
                      </td>

                      <td className="px-3 py-3 tabular-nums">
                        {money(result.basicPay)}
                      </td>

                      <td className="px-3 py-3 font-semibold tabular-nums">
                        {money(result.total)}
                      </td>

                      <td className="px-3 py-3">{input(row, "food", "Food cutting")}</td>

                      <td className="px-3 py-3">
                        {input(row, "partPayment", "Part payment")}
                      </td>

                      <td className="px-3 py-3">
                        {input(row, "deduction", "Deduction")}
                      </td>

                      <td className="px-3 py-3 font-bold tabular-nums text-[var(--shell-accent)]">
                        {money(result.net)}

                        {row.error && (
                          <p className="mt-1 max-w-48 text-[10px] text-[var(--shell-danger)]">
                            {row.error}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <input
                          aria-label={`Remarks for ${row.employee.employee_name}`}
                          value={row.remarks}
                          onChange={(event) =>
                            update(row, "remarks", event.target.value)
                          }
                          disabled={loading || saving || readOnly}
                          maxLength={1000}
                          className="w-48 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 py-2 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="Optional remarks"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}