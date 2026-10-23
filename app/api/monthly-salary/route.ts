import { getAuthenticatedUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type AuthenticatedUser = {
  id: number | string;
  username: string;
  role: string;
  department?: string | null;
};

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === "ADMIN";
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "Unauthorized. Please log in.",
    },
    { status: 401 }
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    {
      success: false,
      message:
        "You do not have permission to access this department.",
    },
    { status: 403 }
  );
}

function isValidNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function isValidMonth(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
  );
}

// GET: Retrieve monthly salary entries accessible to the user.
export async function GET(request: Request) {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    if (!isAdmin(user) && !user.department) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (month && !isValidMonth(month)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid salary month. Use YYYY-MM.",
        },
        { status: 400 }
      );
    }

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (month) {
      values.push(`${month}-01`);
      conditions.push(
        `ms.salary_month = $${values.length}::date`
      );
    }

    if (!isAdmin(user)) {
      values.push(user.department!);
      conditions.push(
        `e.department = $${values.length}`
      );
    }

    let query = `
      SELECT
        ms.*,
        e.employee_code,
        e.employee_name,
        e.department,
        e.date_of_joining,
        e.basic_salary,
        e.ot_rate,
        e.night_rate
      FROM public.monthly_salary ms
      JOIN public.employees e ON e.id = ms.employee_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += `
      ORDER BY ms.salary_month DESC, e.employee_name ASC
    `;

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      salaries: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving monthly salaries:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve monthly salary entries.",
      },
      { status: 500 }
    );
  }
}

// POST: Insert or update a monthly salary entry.
export async function POST(request: Request) {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    if (!isAdmin(user) && !user.department) {
      return forbiddenResponse();
    }

    const body = await request.json();

    const {
      employee_id,
      salary_month,
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
      remarks,
    } = body;

    if (
      !Number.isInteger(employee_id) ||
      employee_id <= 0 ||
      !isValidMonth(salary_month)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid employee and salary month are required.",
        },
        { status: 400 }
      );
    }

    const numericFields: Record<string, unknown> = {
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
    };

    for (const [field, value] of Object.entries(numericFields)) {
      if (!isValidNumber(value)) {
        return NextResponse.json(
          {
            success: false,
            error: `${field} must be a non-negative number.`,
          },
          { status: 400 }
        );
      }
    }

    if (
      typeof remarks !== "undefined" &&
      remarks !== null &&
      typeof remarks !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Remarks must be text.",
        },
        { status: 400 }
      );
    }

    if (typeof remarks === "string" && remarks.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: "Remarks cannot exceed 2000 characters.",
        },
        { status: 400 }
      );
    }

    const monthStart = `${salary_month}-01`;
    const [year, selectedMonth] = salary_month
      .split("-")
      .map(Number);

    const daysInMonth = new Date(
      year,
      selectedMonth,
      0
    ).getDate();

    if (
      attendance_days > daysInMonth ||
      sunday_no_days > daysInMonth ||
      night_duties > daysInMonth ||
      sunday_no_days > attendance_days
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Check attendance, Sunday, and night duty values. Attendance and Sunday days cannot exceed ${daysInMonth}, and Sunday days cannot exceed attendance days.`,
        },
        { status: 400 }
      );
    }

    if (ot_hours > daysInMonth * 24) {
      return NextResponse.json(
        {
          success: false,
          error: `OT hours cannot exceed ${daysInMonth * 24} for this month.`,
        },
        { status: 400 }
      );
    }

    // Verify the employee exists, is active, and belongs
    // to a department the current user can access.
    const employeeResult = await pool.query(
      `
        SELECT id, department
        FROM public.employees
        WHERE id = $1
          AND is_active = TRUE
        LIMIT 1
      `,
      [employee_id]
    );

    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Active employee not found.",
        },
        { status: 404 }
      );
    }

    const employee = employeeResult.rows[0];

    if (
      !isAdmin(user) &&
      employee.department !== user.department
    ) {
      return forbiddenResponse();
    }

    const totalSalary =
      basic_pay +
      sunday_amount +
      night_amount +
      ot_amount +
      other_amount;

    const netDue =
      totalSalary -
      food_cutting -
      part_payment -
      deduction;

    const result = await pool.query(
      `
        INSERT INTO public.monthly_salary (
          employee_id,
          salary_month,
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
          $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (employee_id, salary_month)
        DO UPDATE SET
          attendance_days = EXCLUDED.attendance_days,
          sunday_no_days = EXCLUDED.sunday_no_days,
          ot_hours = EXCLUDED.ot_hours,
          night_duties = EXCLUDED.night_duties,
          basic_pay = EXCLUDED.basic_pay,
          sunday_amount = EXCLUDED.sunday_amount,
          ot_amount = EXCLUDED.ot_amount,
          night_amount = EXCLUDED.night_amount,
          other_amount = EXCLUDED.other_amount,
          food_cutting = EXCLUDED.food_cutting,
          part_payment = EXCLUDED.part_payment,
          deduction = EXCLUDED.deduction,
          total_salary = EXCLUDED.total_salary,
          net_due = EXCLUDED.net_due,
          remarks = EXCLUDED.remarks,
          updated_at = NOW()
        RETURNING *
      `,
      [
        employee_id,
        monthStart,
        attendance_days,
        sunday_no_days,
        ot_hours,
        night_duties,
        basic_pay.toFixed(2),
        sunday_amount.toFixed(2),
        ot_amount.toFixed(2),
        night_amount.toFixed(2),
        other_amount.toFixed(2),
        food_cutting.toFixed(2),
        part_payment.toFixed(2),
        deduction.toFixed(2),
        totalSalary.toFixed(2),
        netDue.toFixed(2),
        typeof remarks === "string"
          ? remarks.trim() || null
          : null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Monthly salary saved successfully.",
        salary: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving monthly salary:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save monthly salary.",
      },
      { status: 500 }
    );
  }
}