import { getAuthenticatedUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type AuthenticatedUser = {
  id: number | string;
  username: string;
  role: string;
  department?: string | null;
};

type SalaryRequestBody = {
  employee_id?: unknown;
  salary_month?: unknown;
  attendance_days?: unknown;
  sunday_no_days?: unknown;
  ot_hours?: unknown;
  night_duties?: unknown;
  other_amount?: unknown;
  food_cutting?: unknown;
  part_payment?: unknown;
  deduction?: unknown;
  remarks?: unknown;
};

type DeleteRequestBody = {
  salary_month?: unknown;
  employee_ids?: unknown;
  delete_all?: unknown;
};

type Prepared =
  | { error: NextResponse }
  | { values: (string | number | null)[] };

function isAdmin(user: AuthenticatedUser): boolean {
  return String(user.role ?? "").trim().toUpperCase() === "ADMIN";
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Please log in." },
    { status: 401 }
  );
}

function forbiddenResponse(
  message = "You do not have permission to perform this action."
) {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

function invalidRequestBody() {
  return NextResponse.json(
    { success: false, error: "Invalid request body." },
    { status: 400 }
  );
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getMonthStart(month: string): string {
  return `${month}-01`;
}

// Shared validation + calculation used by both POST (create) and PUT (edit).
// Returns either an error response or the ordered SQL values ($1..$18).
async function prepareSalary(body: SalaryRequestBody): Promise<Prepared> {
  const {
    employee_id,
    salary_month,
    attendance_days,
    sunday_no_days,
    ot_hours,
    night_duties,
    other_amount,
    food_cutting,
    part_payment,
    deduction,
    remarks,
  } = body;

  const fail = (error: string, status = 400): Prepared => ({
    error: NextResponse.json({ success: false, error }, { status }),
  });

  if (
    typeof employee_id !== "number" ||
    !Number.isSafeInteger(employee_id) ||
    employee_id <= 0 ||
    !isValidMonth(salary_month)
  ) {
    return fail("A valid employee and salary month are required.");
  }

  const numericFields: Record<string, unknown> = {
    attendance_days,
    sunday_no_days,
    ot_hours,
    night_duties,
    other_amount,
    food_cutting,
    part_payment,
    deduction,
  };

  for (const [field, value] of Object.entries(numericFields)) {
    if (!isValidNumber(value)) {
      return fail(`${field} must be a non-negative number.`);
    }
  }

  if (
    remarks !== undefined &&
    remarks !== null &&
    typeof remarks !== "string"
  ) {
    return fail("Remarks must be text.");
  }

  if (typeof remarks === "string" && remarks.length > 2000) {
    return fail("Remarks cannot exceed 2000 characters.");
  }

  const attendanceDays = attendance_days as number;
  const sundayNoDays = sunday_no_days as number;
  const otHours = ot_hours as number;
  const nightDuties = night_duties as number;
  const otherAmount = other_amount as number;
  const foodCutting = food_cutting as number;
  const partPayment = part_payment as number;
  const deductionAmount = deduction as number;

  if (!Number.isInteger(sundayNoDays)) {
    return fail("Sunday days must be a whole number.");
  }

  if (!Number.isInteger(nightDuties)) {
    return fail("Night duties must be a whole number.");
  }

  const monthStart = getMonthStart(salary_month);
  const [year, selectedMonth] = salary_month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, selectedMonth, 0)).getUTCDate();

  if (
    attendanceDays > daysInMonth ||
    sundayNoDays > daysInMonth ||
    nightDuties > daysInMonth ||
    sundayNoDays > attendanceDays
  ) {
    return fail(
      `Check attendance, Sunday, and night duty values. Attendance, Sunday, and night duty days cannot exceed ${daysInMonth}, and Sunday days cannot exceed attendance days.`
    );
  }

  if (otHours > daysInMonth * 24) {
    return fail(`OT hours cannot exceed ${daysInMonth * 24} for this month.`);
  }

  const employeeResult = await pool.query(
    `
      SELECT id, department, basic_salary, ot_rate, night_rate
      FROM public.employees
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [employee_id]
  );

  if (employeeResult.rows.length === 0) {
    return fail("Active employee not found.", 404);
  }

  const employee = employeeResult.rows[0];

  const employeeDepartment =
    typeof employee.department === "string" ? employee.department.trim() : "";

  if (!employeeDepartment) {
    return fail("The selected employee does not have a department assigned.");
  }

  const basicSalary = Number(employee.basic_salary);
  const otRate = Number(employee.ot_rate);
  const nightRate = Number(employee.night_rate);

  if (
    !Number.isFinite(basicSalary) ||
    !Number.isFinite(otRate) ||
    !Number.isFinite(nightRate) ||
    basicSalary < 0 ||
    otRate < 0 ||
    nightRate < 0
  ) {
    return fail("Employee salary rates are invalid.", 500);
  }

  const dailyBasic = basicSalary / daysInMonth;

  const basicPay = roundMoney(dailyBasic * attendanceDays);
  const sundayAmount = roundMoney(dailyBasic * sundayNoDays * 0.75);
  const nightAmount = roundMoney(nightDuties * nightRate);
  const otAmount = roundMoney(otHours * otRate);

  const totalSalary = roundMoney(
    basicPay + sundayAmount + nightAmount + otAmount + otherAmount
  );

  const netDue = roundMoney(
    totalSalary - foodCutting - partPayment - deductionAmount
  );

  if (netDue < 0) {
    return fail("Deductions cannot exceed total salary.");
  }

  return {
    values: [
      employee_id, // $1
      monthStart, // $2
      employeeDepartment, // $3
      attendanceDays, // $4
      sundayNoDays, // $5
      otHours, // $6
      nightDuties, // $7
      basicPay.toFixed(2), // $8
      sundayAmount.toFixed(2), // $9
      otAmount.toFixed(2), // $10
      nightAmount.toFixed(2), // $11
      otherAmount.toFixed(2), // $12
      foodCutting.toFixed(2), // $13
      partPayment.toFixed(2), // $14
      deductionAmount.toFixed(2), // $15
      totalSalary.toFixed(2), // $16
      netDue.toFixed(2), // $17
      typeof remarks === "string" ? remarks.trim() || null : null, // $18
    ],
  };
}

// GET: Retrieve monthly salary records, including their stored department.
export async function GET(request: Request) {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (month && !isValidMonth(month)) {
      return NextResponse.json(
        { success: false, error: "Invalid salary month. Use YYYY-MM." },
        { status: 400 }
      );
    }

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (month) {
      values.push(getMonthStart(month));
      conditions.push(`ms.salary_month = $${values.length}::date`);
    }

    const query = `
      SELECT
        ms.id,
        ms.employee_id,
        TO_CHAR(ms.salary_month, 'YYYY-MM-DD') AS salary_month,
        COALESCE(ms.department, e.department) AS department,
        ms.attendance_days,
        ms.sunday_no_days,
        ms.ot_hours,
        ms.night_duties,
        ms.other_amount,
        ms.food_cutting,
        ms.part_payment,
        ms.deduction,
        ms.basic_pay,
        ms.sunday_amount,
        ms.ot_amount,
        ms.night_amount,
        ms.total_salary,
        ms.net_due,
        ms.created_at,
        ms.updated_at,
        ms.remarks,
        e.employee_code,
        e.employee_name,
        e.date_of_joining,
        e.basic_salary,
        e.ot_rate,
        e.night_rate
      FROM public.monthly_salary ms
      INNER JOIN public.employees e
        ON e.id = ms.employee_id
      ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY ms.salary_month DESC, e.employee_name ASC
    `;

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      salaries: result.rows,
    });
  } catch (error) {
    console.error("GET monthly salary error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to retrieve monthly salary entries." },
      { status: 500 }
    );
  }
}

// DELETE: Administrators only. Delete selected employees' records
// or all salary records for a selected month.
export async function DELETE(request: Request) {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    if (!isAdmin(user)) {
      return forbiddenResponse("Only administrators can delete salary records.");
    }

    let body: DeleteRequestBody;

    try {
      body = await request.json();
    } catch {
      return invalidRequestBody();
    }

    const { salary_month, employee_ids, delete_all } = body;

    if (!isValidMonth(salary_month)) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid salary month is required. Use YYYY-MM.",
        },
        { status: 400 }
      );
    }

    const monthStart = getMonthStart(salary_month);

    if (delete_all === true) {
      const result = await pool.query(
        `
          DELETE FROM public.monthly_salary
          WHERE salary_month = $1::date
          RETURNING id
        `,
        [monthStart]
      );

      const deleted = result.rowCount ?? 0;

      return NextResponse.json({
        success: true,
        message: `${deleted} salary record(s) deleted successfully.`,
        deleted,
        salary_month,
      });
    }

    if (
      !Array.isArray(employee_ids) ||
      employee_ids.length === 0 ||
      !employee_ids.every(
        (employeeId: unknown) =>
          (typeof employeeId === "number" ||
            (typeof employeeId === "string" && /^\d+$/.test(employeeId))) &&
          Number.isSafeInteger(Number(employeeId)) &&
          Number(employeeId) > 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Provide at least one valid employee ID, or set delete_all to true.",
        },
        { status: 400 }
      );
    }

    const uniqueEmployeeIds = [
      ...new Set((employee_ids as (number | string)[]).map(Number)),
    ];

    const result = await pool.query(
      `
        DELETE FROM public.monthly_salary
        WHERE salary_month = $1::date
          AND employee_id = ANY($2::int[])
        RETURNING id
      `,
      [monthStart, uniqueEmployeeIds]
    );

    const deleted = result.rowCount ?? 0;

    return NextResponse.json({
      success: true,
      message:
        deleted > 0
          ? `${deleted} salary record(s) deleted successfully.`
          : "No salary records were found for the selected month and employee(s).",
      deleted,
      salary_month,
    });
  } catch (error) {
    console.error("DELETE monthly salary error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to delete monthly salary records." },
      { status: 500 }
    );
  }
}

// POST: Create a monthly salary record (refuses duplicates).
export async function POST(request: Request) {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    let body: SalaryRequestBody;

    try {
      body = await request.json();
    } catch {
      return invalidRequestBody();
    }

    const prepared = await prepareSalary(body);
    if ("error" in prepared) return prepared.error;
    const { values } = prepared;

    const existing = await pool.query(
      `
        SELECT id
        FROM public.monthly_salary
        WHERE employee_id = $1
          AND salary_month = $2::date
        LIMIT 1
      `,
      [values[0], values[1]]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A salary record for this employee and month is already saved. Use Edit to change it.",
        },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `
        INSERT INTO public.monthly_salary (
          employee_id,
          salary_month,
          department,
          attendance_days,
          sunday_no_days,
          ot_hours,
          night_duties,
          basic_pay,
          sunday_amount,
          ot_amount,
          night_amount,
          other_amount,
          food_cutting,
          part_payment,
          deduction,
          total_salary,
          net_due,
          remarks
        )
        VALUES (
          $1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18
        )
        RETURNING
          id,
          employee_id,
          TO_CHAR(salary_month, 'YYYY-MM-DD') AS salary_month,
          department,
          attendance_days,
          sunday_no_days,
          ot_hours,
          night_duties,
          basic_pay,
          sunday_amount,
          ot_amount,
          night_amount,
          other_amount,
          food_cutting,
          part_payment,
          deduction,
          total_salary,
          net_due,
          created_at,
          updated_at,
          remarks
      `,
      values
    );

    return NextResponse.json(
      {
        success: true,
        message: "Monthly salary saved successfully.",
        salary: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST monthly salary error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to save monthly salary." },
      { status: 500 }
    );
  }
}

// PUT: Update an already-saved monthly salary record.
export async function PUT(request: Request) {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    // To restrict editing to administrators only, uncomment:
    // if (!isAdmin(user)) {
    //   return forbiddenResponse("Only administrators can edit salary records.");
    // }

    let body: SalaryRequestBody;

    try {
      body = await request.json();
    } catch {
      return invalidRequestBody();
    }

    const prepared = await prepareSalary(body);
    if ("error" in prepared) return prepared.error;

    const result = await pool.query(
      `
        UPDATE public.monthly_salary
        SET
          department = $3,
          attendance_days = $4,
          sunday_no_days = $5,
          ot_hours = $6,
          night_duties = $7,
          basic_pay = $8,
          sunday_amount = $9,
          ot_amount = $10,
          night_amount = $11,
          other_amount = $12,
          food_cutting = $13,
          part_payment = $14,
          deduction = $15,
          total_salary = $16,
          net_due = $17,
          remarks = $18,
          updated_at = NOW()
        WHERE employee_id = $1
          AND salary_month = $2::date
        RETURNING
          id,
          employee_id,
          TO_CHAR(salary_month, 'YYYY-MM-DD') AS salary_month,
          department,
          attendance_days,
          sunday_no_days,
          ot_hours,
          night_duties,
          basic_pay,
          sunday_amount,
          ot_amount,
          night_amount,
          other_amount,
          food_cutting,
          part_payment,
          deduction,
          total_salary,
          net_due,
          created_at,
          updated_at,
          remarks
      `,
      prepared.values
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "No saved salary record found to update." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Monthly salary updated successfully.",
      salary: result.rows[0],
    });
  } catch (error) {
    console.error("PUT monthly salary error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update monthly salary." },
      { status: 500 }
    );
  }
}