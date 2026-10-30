// components/layout/Sidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  IdCard,
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  Shirt,
  Truck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

type User = { role: "ADMIN" | "USER" };
type Nav = { name: string; href: string; icon: typeof LayoutDashboard };

const workspace: Nav[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Employee Master", href: "/employees", icon: Users },
];

const departments: Nav[] = [
  { name: "Voucher & ID Staff", href: "/id-staff", icon: IdCard },
  { name: "Head Office", href: "/head-office", icon: Building2 },
  { name: "Housekeeping", href: "/housekeeping", icon: Users },
  { name: "Laundry & Linen", href: "/laundry", icon: Shirt },
  { name: "Patient Movement Services", href: "/patient-movement", icon: Truck },
];

const admin: Nav[] = [
  { name: "User Management", href: "/admin/users/list", icon: ShieldCheck },
  { name: "Create User", href: "/admin/users", icon: UserPlus },
];

const allNav = [...workspace, ...departments, ...admin];

const matches = (path: string, href: string) =>
  path === href || path.startsWith(`${href}/`);

// Only the most specific link is active. Without this, /admin/users/list
// also matched "Create User" (/admin/users) and both were highlighted.
function activeHref(path: string) {
  return allNav
    .filter((item) => matches(path, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function NavLink({
  name,
  href,
  icon: Icon,
  current,
}: Nav & { current?: string }) {
  const on = current === href;

  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition ${
        on
          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20"
          : "text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
      }`}
    >
      {on && (
        <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-white" />
      )}
      <Icon
        size={19}
        className={
          on ? "text-white" : "text-[var(--shell-icon)] group-hover:text-blue-500"
        }
      />
      <span className="flex-1 truncate">{name}</span>
      {on && <ChevronRight size={15} />}
    </Link>
  );
}

function SubLink({
  href,
  path,
  icon,
  children,
}: {
  href: string;
  path: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const on = path === href;

  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
        on
          ? "bg-blue-500/10 font-semibold text-blue-500"
          : "text-[var(--shell-muted)] hover:bg-[var(--shell-hover)]"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--shell-muted)]">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

export default function Sidebar() {
  const path = usePathname();
  const current = activeHref(path);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;

    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (alive && typeof data === "object" && data && "user" in data && data.user) {
          setUser(data.user as User);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex min-h-full w-64 shrink-0 flex-col border-r border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--shell-text)]">
      <div className="border-b border-[var(--shell-border)] px-5 py-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Wallet size={23} />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              Payroll<span className="text-blue-500">X</span>
            </h1>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--shell-muted)]">
              Salary Management
            </p>
          </div>
        </Link>
      </div>

      <nav className="hide-scrollbar flex-1 space-y-7 overflow-y-auto px-3.5 py-6">
        <Section title="Workspace">
          {workspace.map((item) => (
            <NavLink key={item.href} {...item} current={current} />
          ))}
        </Section>

        <Section title="Departments">
          {departments.map((item) => (
            <div key={item.href}>
              <NavLink {...item} current={current} />

              {current === item.href && (
                <div className="ml-8 mt-1 space-y-1 border-l border-[var(--shell-border)] pl-3">
                  <SubLink
                    href={`${item.href}/salary`}
                    path={path}
                    icon={<ClipboardList size={15} />}
                  >
                    Saved Salary Records
                  </SubLink>
                  <SubLink
                    href={`${item.href}/salary/new`}
                    path={path}
                    icon={<PlusCircle size={15} />}
                  >
                    Add This Month&apos;s Salary
                  </SubLink>
                </div>
              )}
            </div>
          ))}
        </Section>

        {user?.role === "ADMIN" && (
          <Section title="Administration">
            {admin.map((item) => (
              <NavLink key={item.href} {...item} current={current} />
            ))}
          </Section>
        )}
      </nav>

      <div className="border-t border-[var(--shell-border)] p-4">
        <div className="rounded-xl bg-[var(--shell-hover)] p-3">
          <span className="text-xs font-medium">● System operational</span>
          <p className="mt-2 text-[10px] text-[var(--shell-muted)]">
            PayrollX · Salary Management
          </p>
        </div>
      </div>
    </div>
  );
}