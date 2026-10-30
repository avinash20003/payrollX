// app/admin/users/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";

async function AdminGuard() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role?.toUpperCase() !== "ADMIN") {
    redirect("/dashboard");
  }

  return null;
}

export default function UsersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <AdminGuard />
      </Suspense>

      <AppShell>
        <Suspense fallback={<div className="p-6 text-sm">Loading...</div>}>
          {children}
        </Suspense>
      </AppShell>
    </>
  );
}