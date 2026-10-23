import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import argon2 from "argon2";
import { pool } from "@/lib/db";

const SESSION_DURATION = 8 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string" ? body.username.trim() : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (
      !username ||
      !password ||
      username.length > 100 ||
      password.length > 1024
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT id, username, password_hash, role
       FROM public.users
       WHERE username = $1 AND is_active = TRUE
       LIMIT 1`,
      [username]
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await argon2.verify(user.password_hash, password))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password." },
        { status: 401 }
      );
    }

    const sessionToken = randomBytes(32).toString("hex");

    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    await pool.query(
      `INSERT INTO public.sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });

    response.cookies.set("payrollx_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to process login." },
      { status: 500 }
    );
  }
}