import { getAuthenticatedUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

const ALLOWED_DEPARTMENTS = [
  "Voucher & ID Staff",
  "Head Office",
  "Housekeeping",
  "Laundry & Linen",
  "Patient Movement Services",
] as const;

type AuthenticatedUser = {
  id: number | string;
  username: string;
  role: string;
  department?: string | null;
};

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role.toUpperCase() === "ADMIN";
}

// Admins and users with an assigned department can manage employees
// across all five departments.
function canManageEmployees(user: AuthenticatedUser): boolean {
  return isAdmin(user) || Boolean(user.department);
}

function isAllowedDepartment(department: string): boolean {
  return ALLOWED_DEPARTMENTS.includes(
    department as (typeof ALLOWED_DEPARTMENTS)[number]
  );
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
      message: "You do not have permission to manage employees.",
    },
    { status: 403 }
  );
}

function isValidJoiningDate(value: unknown): boolean {
  if (value === null || value === "") {
    return true;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isDuplicateError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function normalizeOptionalDate(value: unknown): string | null {
  return value === "" || value == null ? null : (value as string);
}

function validateEmployeeDetails(body: Record<string, unknown>) {
  const {
    employee_code,
    employee_name,
    department,
    date_of_joining,
    basic_salary,
    ot_rate,
    night_rate,
  } = body;

  if (
    typeof employee_code !== "string" ||
    !employee_code.trim() ||
    typeof employee_name !== "string" ||
    !employee_name.trim() ||
    typeof department !== "string" ||
    !department.trim()
  ) {
    return {
      error: "Please enter employee code, name, and department.",
    };
  }

  const normalizedDepartment = department.trim();

  if (!isAllowedDepartment(normalizedDepartment)) {
    return { error: "Invalid department." };
  }

  if (!isValidJoiningDate(date_of_joining)) {
    return { error: "Please enter a valid joining date." };
  }

  const salary = Number(basic_salary);
  const overtimeRate = Number(ot_rate ?? 0);
  const nightRate = Number(night_rate ?? 0);

  if (
    basic_salary === null ||
    basic_salary === "" ||
    !Number.isFinite(salary) ||
    salary <= 0 ||
    !Number.isFinite(overtimeRate) ||
    overtimeRate < 0 ||
    !Number.isFinite(nightRate) ||
    nightRate < 0
  ) {
    return {
      error:
        "Enter a valid basic salary and non-negative OT/night rates.",
    };
  }

  return {
    data: {
      employee_code: employee_code.trim(),
      employee_name: employee_name.trim(),
      department: normalizedDepartment,
      date_of_joining: normalizeOptionalDate(date_of_joining),
      basic_salary: salary,
      ot_rate: overtimeRate,
      night_rate: nightRate,
    },
  };
}

// GET: Retrieve employees from all five departments.
export async function GET() {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    if (!canManageEmployees(user)) {
      return forbiddenResponse();
    }

    const result = await pool.query(
      `SELECT
         id,
         employee_code,
         employee_name,
         department,
         date_of_joining,
         basic_salary,
         ot_rate,
         night_rate,
         is_active,
         created_at
       FROM public.employees
       ORDER BY id DESC`
    );

    return NextResponse.json({
      success: true,
      employees: result.rows,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employees.",
      },
      { status: 500 }
    );
  }
}

// POST: Create an employee in any of the five departments.
export async function POST(request: Request) {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    if (!canManageEmployees(user)) {
      return forbiddenResponse();
    }

    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const validation = validateEmployeeDetails(
      body as Record<string, unknown>
    );

    if (validation.error || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const employee = validation.data;

    const result = await pool.query(
      `INSERT INTO public.employees (
         employee_code,
         employee_name,
         department,
         date_of_joining,
         basic_salary,
         ot_rate,
         night_rate
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        employee.employee_code,
        employee.employee_name,
        employee.department,
        employee.date_of_joining,
        employee.basic_salary,
        employee.ot_rate,
        employee.night_rate,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Employee saved successfully.",
        employee: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving employee:", error);

    const duplicate = isDuplicateError(error);

    return NextResponse.json(
      {
        success: false,
        message: duplicate
          ? "That employee code already exists. Please use a unique code."
          : "Failed to save employee.",
      },
      { status: duplicate ? 409 : 500 }
    );
  }
}

// PUT: Update an employee in any of the five departments.
export async function PUT(request: Request) {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    if (!canManageEmployees(user)) {
      return forbiddenResponse();
    }

    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const {
      id,
    } = body as Record<string, unknown>;

    const employeeId = Number(id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid employee ID.",
        },
        { status: 400 }
      );
    }

    const validation = validateEmployeeDetails(
      body as Record<string, unknown>
    );

    if (validation.error || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const employee = validation.data;

    const result = await pool.query(
      `UPDATE public.employees
       SET employee_code = $1,
           employee_name = $2,
           department = $3,
           date_of_joining = $4,
           basic_salary = $5,
           ot_rate = $6,
           night_rate = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        employee.employee_code,
        employee.employee_name,
        employee.department,
        employee.date_of_joining,
        employee.basic_salary,
        employee.ot_rate,
        employee.night_rate,
        employeeId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully.",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating employee:", error);

    const duplicate = isDuplicateError(error);

    return NextResponse.json(
      {
        success: false,
        message: duplicate
          ? "That employee code is already in use."
          : "Failed to update employee.",
      },
      { status: duplicate ? 409 : 500 }
    );
  }
}

// PATCH: Activate or deactivate an employee in any department.
export async function PATCH(request: Request) {
  try {
    const user = (await getAuthenticatedUser()) as AuthenticatedUser | null;

    if (!user) {
      return unauthorizedResponse();
    }

    if (!canManageEmployees(user)) {
      return forbiddenResponse();
    }

    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const employeeId = Number(body.id);
    const isActive = body.is_active;

    if (
      !Number.isInteger(employeeId) ||
      employeeId <= 0 ||
      typeof isActive !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid employee status request.",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE public.employees
       SET is_active = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [isActive, employeeId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isActive
        ? "Employee activated successfully."
        : "Employee deactivated successfully.",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating employee status:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update employee status.",
      },
      { status: 500 }
    );
  }
}