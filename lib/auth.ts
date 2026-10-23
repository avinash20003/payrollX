import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { pool } from "@/lib/db";

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("payrollx_session")?.value;

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

    const result = await pool.query(
        `SELECT
            u.id,
            u.username,
            u.role,
            u.department
        FROM public.sessions s
        JOIN public.users u ON u.id = s.user_id
        WHERE s.token_hash = $1
            AND s.expires_at > NOW()
            AND u.is_active = TRUE
        LIMIT 1`,
        [tokenHash]
    );

  return result.rows[0] ?? null;
}