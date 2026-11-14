import { cookies } from "next/headers";

type AuthenticatedUser = {
  id: number | string;
  username: string;
  role: string;
  department?: string | null;
};

/** Ask the backend to validate the session without exposing database access to the UI service. */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const apiOrigin = process.env.API_INTERNAL_URL;
  if (!apiOrigin) return null;

  const cookieHeader = (await cookies())
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  try {
    const response = await fetch(`${apiOrigin}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      success?: boolean;
      user?: AuthenticatedUser;
    };
    return body.success ? body.user ?? null : null;
  } catch {
    return null;
  }
}
