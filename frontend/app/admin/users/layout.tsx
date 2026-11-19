// app/admin/users/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import AuthUnavailable from "@/components/layout/AuthUnavailable";

async function AuthenticatedUsersLayout({
  children,
}: {
  children: ReactNode;
}) {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    return <AuthUnavailable retryPath="/admin/users" />;
  }

  if (!user) redirect("/login");
  if (user.role?.toUpperCase() !== "ADMIN") redirect("/dashboard");

  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-sm">Loading...</div>}>
        {children}
      </Suspense>
    </AppShell>
  );
}

export default function UsersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-slate-100">
          Checking your session…
        </main>
      }
    >
      <AuthenticatedUsersLayout>{children}</AuthenticatedUsersLayout>
    </Suspense>
  );
}
