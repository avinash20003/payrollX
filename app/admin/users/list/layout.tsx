// app/admin/users/list/layout.tsx

import type { ReactNode } from "react";

export default function UsersListLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <section className="min-w-0 w-full flex-1">{children}</section>;
}