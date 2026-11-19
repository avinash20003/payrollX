// app/(app)/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import AuthUnavailable from "@/components/layout/AuthUnavailable";
import { getAuthenticatedUser } from "@/lib/auth";

async function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    return <AuthUnavailable retryPath="/dashboard" />;
  }

  if (!user) redirect("/login");

  return (
    <AppShell>
      {/* Also covers pages that use useSearchParams() */}
      <Suspense fallback={<div className="p-6 text-sm">Loading...</div>}>
        {children}
      </Suspense>
    </AppShell>
  );
}

export default function ProtectedAppLayout({
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
      <AuthenticatedAppLayout>{children}</AuthenticatedAppLayout>
    </Suspense>
  );
}
