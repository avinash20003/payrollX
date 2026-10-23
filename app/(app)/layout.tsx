import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { getAuthenticatedUser } from "@/lib/auth";

type AppLayoutProps = {
  children: ReactNode;
};

async function AuthenticatedLayout({
  children,
}: AppLayoutProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}

export default function ProtectedAppLayout({
  children,
}: AppLayoutProps) {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </Suspense>
  );
}