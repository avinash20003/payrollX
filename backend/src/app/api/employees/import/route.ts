import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { pool } from "@/lib/db";

const DEPARTMENTS = [
  "Voucher & ID Staff",
  "Head Office",
  "Housekeeping",
  "Laundry & Linen",
  "Patient Movement Services",
];

type ImportRecord = Record<string, unknown>;

function dateValue(value: unknown): string | null | undefined {
  if (value === "" || value == null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  if (user.role.toUpperCase() !== "ADMIN" && !user.department) {
    return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { employees?: unknown } | null;
  if (!body || !Array.isArray(body.employees) || body.employees.length === 0 || body.employees.length > 1000) {
    return NextResponse.json({ success: false, message: "Provide between 1 and 1,000 employee records." }, { status: 400 });
  }

  const seenCodes = new Set<string>();
  const results: { row: number; employee_code: string; success: boolean; message?: string }[] = [];
  const client = await pool.connect();
  await client.query("BEGIN");
  for (const [index, raw] of body.employees.entries()) {
    await client.query(`SAVEPOINT employee_import_${index}`);
    const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as ImportRecord : {};
    const code = typeof record.employee_code === "string" ? record.employee_code.trim() : "";
    const name = typeof record.employee_name === "string" ? record.employee_name.trim() : "";
    const department = typeof record.department === "string" ? record.department.trim() : "";
    const salary = Number(record.basic_salary);
    const otRate = record.ot_rate === "" || record.ot_rate == null ? 0 : Number(record.ot_rate);
    const nightRate = record.night_rate === "" || record.night_rate == null ? 0 : Number(record.night_rate);
    const joiningDate = dateValue(record.date_of_joining);
    let message = "";

    if (!code || code.length > 50 || !name || name.length > 150) message = "Employee code (max 50) and name (max 150) are required.";
    else if (!DEPARTMENTS.includes(department)) message = "Department is not recognized.";
    else if (!Number.isFinite(salary) || salary <= 0 || !Number.isFinite(otRate) || otRate < 0 || !Number.isFinite(nightRate) || nightRate < 0) message = "Basic salary must be positive; OT and night rates must be non-negative numbers.";
    else if (joiningDate === undefined) message = "Joining date must be a valid YYYY-MM-DD date.";

    const normalizedCode = code.toLocaleLowerCase("en-US");
    if (!message && seenCodes.has(normalizedCode)) message = "Employee code is duplicated in this workbook.";
    if (!message) seenCodes.add(normalizedCode);

    if (!message) {
      try {
        const duplicate = await client.query(
          "SELECT employee_code FROM public.employees WHERE lower(employee_code) = lower($1) LIMIT 1",
          [code],
        );
        if (duplicate.rowCount) message = "Employee code already exists.";
      } catch (error) {
        console.error("Employee import duplicate check failed:", error);
        message = "Could not validate this record against the employee database.";
        await client.query(`ROLLBACK TO SAVEPOINT employee_import_${index}`);
      }
    }

    if (!message) {
      try {
        await client.query(
          `INSERT INTO public.employees (employee_code, employee_name, department, date_of_joining, basic_salary, ot_rate, night_rate)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [code, name, department, joiningDate, salary, otRate, nightRate],
        );
      } catch (error) {
        const dbError = error as { code?: string };
        message = dbError.code === "23505" ? "Employee code already exists." : "Could not save this record.";
        if (dbError.code !== "23505") console.error("Employee import record failed:", error);
        await client.query(`ROLLBACK TO SAVEPOINT employee_import_${index}`);
      }
    }

    await client.query(`RELEASE SAVEPOINT employee_import_${index}`);

    results.push({ row: index + 2, employee_code: code, success: !message, ...(message ? { message } : {}) });
  }

  const imported = results.filter((result) => result.success).length;
  const failed = results.length - imported;
  await client.query("COMMIT");
  client.release();
  return NextResponse.json({ success: true, imported, failed, results });
}
