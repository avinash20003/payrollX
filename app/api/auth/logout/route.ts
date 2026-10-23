import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { pool } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("payrollx_session")?.value;

    if (sessionToken && /^[a-f0-9]{64}$/.test(sessionToken)) {
      const tokenHash = createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      await pool.query(
        `DELETE FROM public.sessions
         WHERE token_hash = $1`,
        [tokenHash]
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Logout successful.",
    });

    response.cookies.set("payrollx_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process logout.",
      },
      { status: 500 }
    );
  }
}