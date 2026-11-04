import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { pool } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

const ALLOWED_DEPARTMENTS = [
  "Voucher & ID Staff",
  "Head Office",
  "Housekeeping",
  "Laundry & Linen",
  "Patient Movement Services",
] as const;

async function requireAdmin() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Only administrators can manage users.",
        },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 1024 &&
    password.trim().length > 0
  );
}

// GET: List users (administrator only).
export async function GET() {
  try {
    const { response } = await requireAdmin();

    if (response) return response;

    const result = await pool.query(
      `SELECT
         id,
         username,
         role,
         department,
         is_active,
         created_at
       FROM public.users
       ORDER BY created_at DESC NULLS LAST, id DESC`
    );

    return NextResponse.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("Fetch users error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch users." },
      { status: 500 }
    );
  }
}

// POST: Create a department user.
export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();

    if (response) return response;

    const body = await request.json();

    const username =
      typeof body.username === "string" ? body.username.trim() : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    const department =
      typeof body.department === "string" ? body.department.trim() : "";

    if (
      !username ||
      username.length > 100 ||
      !/^[a-zA-Z0-9._-]+$/.test(username)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Username must contain only letters, numbers, dots, underscores, or hyphens, and be at most 100 characters.",
        },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be between 8 and 1024 characters.",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_DEPARTMENTS.includes(
        department as (typeof ALLOWED_DEPARTMENTS)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a valid department.",
        },
        { status: 400 }
      );
    }

    const existingUser = await pool.query(
      `SELECT id
       FROM public.users
       WHERE LOWER(username) = LOWER($1)
       LIMIT 1`,
      [username]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: "This username already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await argon2.hash(password);

    const result = await pool.query(
      `INSERT INTO public.users (
         username,
         password_hash,
         role,
         department,
         is_active
       )
       VALUES ($1, $2, 'USER', $3, TRUE)
       RETURNING id, username, role, department, is_active, created_at`,
      [username, passwordHash, department]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Department user created successfully.",
        user: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { success: false, message: "This username already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Unable to create user." },
      { status: 500 }
    );
  }
}

// PATCH: Activate or deactivate a department user.
export async function PATCH(request: NextRequest) {
  try {
    const { response } = await requireAdmin();

    if (response) return response;

    const body = await request.json();
    const id = Number(body.id);
    const isActive = body.is_active;

    if (!Number.isSafeInteger(id) || id < 1 || typeof isActive !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "A valid user ID and account status are required.",
        },
        { status: 400 }
      );
    }

    // Only department users can be managed through this endpoint.
    const result = await pool.query(
      `UPDATE public.users
       SET is_active = $1
       WHERE id = $2
         AND role = 'USER'
       RETURNING id, username, role, department, is_active, created_at`,
      [isActive, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Department user not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isActive
        ? "User activated successfully."
        : "User deactivated successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Update user status error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update user status." },
      { status: 500 }
    );
  }
}

// PUT: Reset (change) a department user's password.
export async function PUT(request: NextRequest) {
  try {
    const { response } = await requireAdmin();

    if (response) return response;

    const body = await request.json();
    const id = Number(body.id);
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json(
        { success: false, message: "A valid user ID is required." },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be between 8 and 1024 characters.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await argon2.hash(password);

    // Only department users can be managed through this endpoint.
    const result = await pool.query(
      `UPDATE public.users
       SET password_hash = $1
       WHERE id = $2
         AND role = 'USER'
       RETURNING id, username, role, department, is_active, created_at`,
      [passwordHash, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Department user not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password updated for "${result.rows[0].username}".`,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update password." },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete a department user. Usage: DELETE /api/users?id=5
export async function DELETE(request: NextRequest) {
  try {
    const { response } = await requireAdmin();

    if (response) return response;

    const id = Number(request.nextUrl.searchParams.get("id"));

    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json(
        { success: false, message: "A valid user ID is required." },
        { status: 400 }
      );
    }

    // Only department users can be deleted; admins are protected.
    const result = await pool.query(
      `DELETE FROM public.users
       WHERE id = $1
         AND role = 'USER'
       RETURNING id, username`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Department user not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User "${result.rows[0].username}" deleted successfully.`,
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Delete user error:", error);

    // Foreign key violation: the user is referenced by other records.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This user has related records and cannot be deleted. Deactivate the account instead.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Unable to delete user." },
      { status: 500 }
    );
  }
}