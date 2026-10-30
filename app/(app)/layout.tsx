// app/(app)/layout.tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { getAuthenticatedUser } from "@/lib/auth";

// The login check runs on its own, inside Suspense, and renders nothing.
// It no longer wraps {children}, so the page is always part of the layout.
async function AuthGuard() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return null;
}

export default function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <AuthGuard />
      </Suspense>

      <AppShell>
        {/* Also covers pages that use useSearchParams() */}
        <Suspense fallback={<div className="p-6 text-sm">Loading...</div>}>
          {children}
        </Suspense>
      </AppShell>
    </>
  );
}