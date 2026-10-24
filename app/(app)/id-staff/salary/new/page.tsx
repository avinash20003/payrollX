"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, RefreshCw, Save } from "lucide-react";

type Employee = { id: number | string; employee_code: string; employee_name: string; department: string; basic_salary: number | string; ot_rate: number | string; night_rate: number | string; is_active: boolean };
type SalaryRecord = { employee_id: number | string; attendance_days: number | string; sunday_no_days: number | string; night_duties: number | string; ot_hours: number | string; other_amount: number | string; food_cutting: number | string; part_payment: number | string; deduction: number | string; remarks?: string | null };
type Row = { employee: Employee; saved: boolean; attendance: string; sunday: string; night: string; ot: string; other: string; food: string; partPayment: string; deduction: string; remarks: string; saving: boolean; error: string };
type EditableField = Exclude<keyof Row, "employee" | "saved" | "saving" | "error">;

const numberValue = (value: string | number | null | undefined) => { const number = Number(value ?? 0); return Number.isFinite(number) ? number : 0; };
const money = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(numberValue(value));
const isIdStaff = (value: string | null | undefined) => ["voucheridstaff", "voucherandidstaff", "idstaff"].includes((value ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""));
const daysInMonth = (month: string) => { const [year, monthNumber] = month.split("-").map(Number); return new Date(year, monthNumber, 0).getDate(); };
const getCurrentMonth = () => { const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const monthLabel = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

function createRow(employee: Employee, record?: SalaryRecord): Row {
  return { employee, saved: Boolean(record), attendance: String(record?.attendance_days ?? ""), sunday: String(record?.sunday_no_days ?? 0), night: String(record?.night_duties ?? 0), ot: String(record?.ot_hours ?? 0), other: String(record?.other_amount ?? 0), food: String(record?.food_cutting ?? 0), partPayment: String(record?.part_payment ?? 0), deduction: String(record?.deduction ?? 0), remarks: record?.remarks ?? "", saving: false, error: "" };
}

function calculation(row: Row, month: string) {
  const dailyBasic = numberValue(row.employee.basic_salary) / daysInMonth(month);
  const basicPay = dailyBasic * numberValue(row.attendance);
  const basic = numberValue(row.employee.basic_salary);
  const sundayAmount = dailyBasic * numberValue(row.sunday) * 0.75;
  const nightAmount = numberValue(row.night) * numberValue(row.employee.night_rate);
  const otAmount = numberValue(row.ot) * numberValue(row.employee.ot_rate);
  const total = basicPay + sundayAmount + nightAmount + otAmount + numberValue(row.other);
  return { basic, sundayAmount, nightAmount, otAmount, total, net: total - numberValue(row.food) - numberValue(row.partPayment) - numberValue(row.deduction) };
}

export default function MonthlySalarySheet() {
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(() => searchParams.get("month") || getCurrentMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (salaryMonth: string) => {
    setLoading(true); setError(""); setMessage("");
    try {
      const [employeesResponse, salaryResponse] = await Promise.all([fetch("/api/employees", { cache: "no-store" }), fetch(`/api/monthly-salary?month=${encodeURIComponent(salaryMonth)}`, { cache: "no-store" })]);
      if (!employeesResponse.ok || !salaryResponse.ok) throw new Error("Unable to load the salary sheet.");
      const employeeData = await employeesResponse.json(); const salaryData = await salaryResponse.json();
      const employees: Employee[] = Array.isArray(employeeData?.employees) ? employeeData.employees : [];
      const records: SalaryRecord[] = Array.isArray(salaryData?.salaries) ? salaryData.salaries : [];
      const byEmployee = new Map(records.map((record) => [String(record.employee_id), record]));
      setRows(employees.filter((employee) => isIdStaff(employee.department) && Boolean(employee.is_active)).map((employee) => createRow(employee, byEmployee.get(String(employee.id)))));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load the salary sheet."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(month); }, [load, month]);

  function patch(employeeId: string | number, update: Partial<Row>) { setRows((current) => current.map((row) => String(row.employee.id) === String(employeeId) ? { ...row, ...update } : row)); }
  function update(employeeId: string | number, field: EditableField, value: string) { patch(employeeId, { [field]: value, error: "" }); }
  function valid(row: Row) {
    const values = [row.attendance, row.sunday, row.night, row.ot, row.other, row.food, row.partPayment, row.deduction];
    if (row.attendance.trim() === "" || values.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) return "Enter valid non-negative values for all salary inputs.";
    if (numberValue(row.attendance) > daysInMonth(month) || numberValue(row.sunday) > numberValue(row.attendance) || numberValue(row.night) > daysInMonth(month)) return "Check attendance, Sunday/N.O, and night days.";
    if (calculation(row, month).net < 0) return "Deductions cannot exceed total salary.";
    return "";
  }
  async function save(row: Row) {
    const rowError = valid(row); if (rowError) { patch(row.employee.id, { error: rowError }); return false; }
    patch(row.employee.id, { saving: true, error: "" });
    try {
      const response = await fetch("/api/monthly-salary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employee_id: Number(row.employee.id), salary_month: month, attendance_days: numberValue(row.attendance), sunday_no_days: numberValue(row.sunday), night_duties: numberValue(row.night), ot_hours: numberValue(row.ot), other_amount: numberValue(row.other), food_cutting: numberValue(row.food), part_payment: numberValue(row.partPayment), deduction: numberValue(row.deduction), remarks: row.remarks.trim() }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to save salary."); patch(row.employee.id, { saved: true, saving: false }); return true;
    } catch (saveError) { patch(row.employee.id, { saving: false, error: saveError instanceof Error ? saveError.message : "Unable to save salary." }); return false; }
  }
  async function saveAll() { const invalid = rows.filter((row) => valid(row)); if (invalid.length) { setRows((current) => current.map((row) => ({ ...row, error: valid(row) }))); setError("Correct the highlighted rows before saving."); return; } setSavingAll(true); setError(""); let saved = 0; for (const row of rows) if (await save(row)) saved++; setSavingAll(false); setMessage(`Saved ${saved} salary record${saved === 1 ? "" : "s"}.`); }
  function downloadCsv() { const headers = ["No.", "ASK ID No.", "Name", "Basic", "Sunday/N.O (Days)", "Sunday Amount", "Night (Days)", "Night Amount", "Over Time (Hrs)", "OT Amount", "Other(s) Amount", "Attendance (Days)", "Total Salary", "Food Cutting (Amount)", "Part Payment", "Deduction", "Net Due"]; const lines = rows.map((row, index) => { const c = calculation(row, month); return [index + 1, row.employee.employee_code, row.employee.employee_name, c.basic, row.sunday, c.sundayAmount, row.night, c.nightAmount, row.ot, c.otAmount, row.other, row.attendance, c.total, row.food, row.partPayment, row.deduction, c.net]; }); const csv = [headers, ...lines].map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n"); const anchor = document.createElement("a"); const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })); anchor.href = url; anchor.download = `id-staff-salary-${month}.csv`; anchor.click(); URL.revokeObjectURL(url); }
  const totals = useMemo(() => rows.reduce((total, row) => { const c = calculation(row, month); return { total: total.total + c.total, net: total.net + c.net }; }, { total: 0, net: 0 }), [month, rows]);
  const input = (row: Row, field: EditableField, label: string, max?: number) => <input aria-label={`${label} for ${row.employee.employee_name}`} value={row[field] as string} onChange={(event) => update(row.employee.id, field, event.target.value)} disabled={loading || savingAll || row.saving} type="number" min="0" max={max} step="0.01" className="w-24 rounded-lg border border-[#1f2d4a] bg-[#0a1120] px-2 py-2 text-right text-sm tabular-nums text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50" />;
  const headers = ["No.", "ASK ID No.", "Name", "Basic", "Sunday/N.O (Days)", "Sunday Amount", "Night (Days)", "Night Amount", "Over Time (Hrs)", "OT Amount", "Other(s) Amount", "Attendance (Days)", "Total Salary", "Food Cutting (Amount)", "Part Payment", "Deduction", "Net Due", "Save"];

  return <div className="min-h-full space-y-6 text-slate-100"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><Link href="/id-staff/salary" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"><ArrowLeft size={16} />Saved salary records</Link><h1 className="mt-2 text-2xl font-bold">ID Staff Salary Sheet</h1><p className="mt-1 text-sm text-slate-400">Voucher &amp; ID Staff · {monthLabel(month)}</p></div><div className="flex flex-wrap gap-2"><input aria-label="Salary month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-[#1f2d4a] bg-[#0d1526] px-3 py-2 text-sm text-slate-100" /><button onClick={() => void load(month)} className="inline-flex items-center gap-2 rounded-xl border border-[#1f2d4a] bg-[#0d1526] px-4 py-2 text-sm font-semibold hover:bg-[#12203b]"><RefreshCw size={16} />Refresh</button><button onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-xl border border-[#1f2d4a] bg-[#0d1526] px-4 py-2 text-sm font-semibold hover:bg-[#12203b]"><Download size={16} />Export</button><button disabled={loading || savingAll} onClick={() => void saveAll()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"><Save size={16} />{savingAll ? "Saving…" : "Save all"}</button></div></div><section className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.07] p-4 text-sm text-blue-100"><strong>Calculation policy:</strong> Basic = daily basic × attendance; Sunday/N.O = daily basic × days × 75%; Night = duties × employee night rate; OT = hours × employee OT rate. Net Due deducts food cutting, part payment, and deduction. Confirm the meaning of N.O. and the 75% Sunday rule before payroll is finalized.</section>{error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}{message && <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}<section className="overflow-hidden rounded-2xl border border-[#1f2d4a] bg-[#0d1526]"><div className="flex items-center justify-between border-b border-[#1f2d4a] px-5 py-4"><div><h2 className="font-semibold">Monthly payroll</h2><p className="text-xs text-slate-400">Daily basic is automatically derived from base salary ÷ {daysInMonth(month)} days.</p></div><div className="text-right text-sm"><p className="text-slate-400">Total salary <b className="ml-1 text-slate-100">{money(totals.total)}</b></p><p className="text-blue-300">Net due <b className="ml-1">{money(totals.net)}</b></p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[2100px] text-left text-xs"><thead className="bg-[#111c33] text-slate-400"><tr>{headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-4 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-[#1f2d4a]">{loading ? <tr><td colSpan={18} className="px-4 py-16 text-center text-slate-400"><Loader2 className="mx-auto mb-2 animate-spin" />Loading salary sheet…</td></tr> : rows.map((row, index) => { const c = calculation(row, month); return <tr key={row.employee.id} className={row.error ? "bg-red-500/10" : "hover:bg-[#111c33]"}><td className="px-3 py-3 text-slate-500">{index + 1}</td><td className="px-3 py-3 font-semibold text-blue-200">{row.employee.employee_code}</td><td className="px-3 py-3"><p className="font-semibold">{row.employee.employee_name}</p><p className="mt-1 text-slate-500">Monthly basic {money(row.employee.basic_salary)}</p></td><td className="px-3 py-3 font-semibold tabular-nums">{money(c.basic)}</td><td className="px-3 py-3">{input(row, "sunday", "Sunday/N.O days", daysInMonth(month))}</td><td className="px-3 py-3 tabular-nums">{money(c.sundayAmount)}</td><td className="px-3 py-3">{input(row, "night", "Night days", daysInMonth(month))}</td><td className="px-3 py-3 tabular-nums">{money(c.nightAmount)}</td><td className="px-3 py-3">{input(row, "ot", "Overtime hours")}</td><td className="px-3 py-3 tabular-nums">{money(c.otAmount)}</td><td className="px-3 py-3">{input(row, "other", "Other amount")}</td><td className="px-3 py-3">{input(row, "attendance", "Attendance days", daysInMonth(month))}</td><td className="px-3 py-3 font-semibold tabular-nums">{money(c.total)}</td><td className="px-3 py-3">{input(row, "food", "Food cutting")}</td><td className="px-3 py-3">{input(row, "partPayment", "Part payment")}</td><td className="px-3 py-3">{input(row, "deduction", "Deduction")}</td><td className="px-3 py-3 font-bold tabular-nums text-blue-300">{money(c.net)}{row.error && <p className="mt-1 max-w-40 text-[10px] text-red-300">{row.error}</p>}</td><td className="px-3 py-3"><button disabled={row.saving || savingAll} onClick={() => void save(row)} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold hover:bg-blue-500 disabled:opacity-50">{row.saving ? "…" : "Save"}</button></td></tr>; })}</tbody></table></div></section></div>;
}
