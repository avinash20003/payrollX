import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function isValidMonth(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
  );
}

function isNonNegativeNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// GET: Retrieve saved ID Staff salary records.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    let query = `
      SELECT
        s.*,
        e.employee_code,
        e.employee_name,
        e.department,
        e.date_of_joining,
        e.ot_rate AS employee_ot_rate
      FROM id_staff_salary s
      JOIN employees e ON e.id = s.employee_id
    `;

    const values: string[] = [];

    if (month) {
      if (!isValidMonth(month)) {
        return NextResponse.json(
          { error: "Invalid month. Use YYYY-MM." },
          { status: 400 }
        );
      }

      query += ` WHERE s.salary_month = $1::date`;
      values.push(`${month}-01`);
    }

    query += `
      ORDER BY s.salary_month DESC, e.employee_name ASC
    `;

    const result = await pool.query(query, values);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error loading ID Staff salaries:", error);

    return NextResponse.json(
      { error: "Failed to retrieve ID Staff salary records." },
      { status: 500 }
    );
  }
}

// POST: Save or update one employee's ID Staff salary.
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      employee_id,
      salary_month,
      rate,
      days,
      ot_hours,
      deductions = 0,
      remarks,
    } = body;

    if (
      !Number.isInteger(employee_id) ||
      employee_id <= 0 ||
      !isValidMonth(salary_month)
    ) {
      return NextResponse.json(
        {
          error: "A valid employee ID and salary month are required.",
        },
        { status: 400 }
      );
    }

    const numericFields: Record<string, unknown> = {
      rate,
      days,
      ot_hours,
      deductions,
    };

    for (const [field, value] of Object.entries(numericFields)) {
      if (!isNonNegativeNumber(value)) {
        return NextResponse.json(
          {
            error: `${field} must be a non-negative number.`,
          },
          { status: 400 }
        );
      }
    }

    if (
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return NextResponse.json(
        { error: "Rate must be greater than zero." },
        { status: 400 }
      );
    }

    if (
      remarks !== undefined &&
      remarks !== null &&
      typeof remarks !== "string"
    ) {
      return NextResponse.json(
        { error: "Remarks must be text." },
        { status: 400 }
      );
    }

    if (typeof remarks === "string" && remarks.length > 2000) {
      return NextResponse.json(
        { error: "Remarks cannot exceed 2000 characters." },
        { status: 400 }
      );
    }

    const [year, selectedMonth] = salary_month
      .split("-")
      .map(Number);

    const daysInMonth = new Date(
      Date.UTC(year, selectedMonth, 0)
    ).getUTCDate();

    if (days > daysInMonth) {
      return NextResponse.json(
        {
          error: `Days cannot exceed ${daysInMonth} for this month.`,
        },
        { status: 400 }
      );
    }

    // Only active employees belonging to the ID Staff department
    // can be saved through this API.
    const employeeResult = await pool.query(
      `SELECT id, ot_rate
       FROM employees
       WHERE id = $1
         AND is_active = TRUE
         AND LOWER(
           REGEXP_REPLACE(
             TRIM(department),
             '[^a-zA-Z0-9]',
             '',
             'g'
           )
         ) IN (
           'voucheridstaff',
           'voucherandidstaff',
           'idstaff'
         )`,
      [employee_id]
    );

    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Active ID Staff employee not found. Check the employee's department in Employee Master.",
        },
        { status: 404 }
      );
    }

    // Always obtain the overtime rate from Employee Master.
    const employeeOtRate = Number(employeeResult.rows[0].ot_rate);

    const daysAmount = roundMoney(rate * days);
    const otAmount = roundMoney(ot_hours * employeeOtRate);
    const totalAmount = roundMoney(daysAmount + otAmount);
    const netAmount = roundMoney(totalAmount - deductions);

    const result = await pool.query(
      `INSERT INTO id_staff_salary (
        employee_id,
        salary_month,
        rate,
        days,
        days_amount,
        ot_hours,
        ot_rate,
        ot_amount,
        total_amount,
        deductions,
        net_amount,
        remarks
      )
      VALUES (
        $1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      ON CONFLICT (employee_id, salary_month)
      DO UPDATE SET
        rate = EXCLUDED.rate,
        days = EXCLUDED.days,
        days_amount = EXCLUDED.days_amount,
        ot_hours = EXCLUDED.ot_hours,
        ot_rate = EXCLUDED.ot_rate,
        ot_amount = EXCLUDED.ot_amount,
        total_amount = EXCLUDED.total_amount,
        deductions = EXCLUDED.deductions,
        net_amount = EXCLUDED.net_amount,
        remarks = EXCLUDED.remarks,
        updated_at = NOW()
      RETURNING *`,
      [
        employee_id,
        `${salary_month}-01`,
        rate,
        days,
        daysAmount,
        ot_hours,
        employeeOtRate,
        otAmount,
        totalAmount,
        deductions,
        netAmount,
        typeof remarks === "string"
          ? remarks.trim() || null
          : null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "ID Staff salary saved successfully.",
        salary: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving ID Staff salary:", error);

    return NextResponse.json(
      { error: "Failed to save ID Staff salary." },
      { status: 500 }
    );
  }
}