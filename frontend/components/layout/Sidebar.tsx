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

type User = {
  username?: string;
  role: "ADMIN" | "USER";
};

type Nav = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const workspace: Nav[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Employee Master", href: "/employees", icon: Users },
];

const departments: Nav[] = [
  { name: "Voucher & ID Staff", href: "/id-staff", icon: IdCard },
  { name: "Head Office", href: "/head-office", icon: Building2 },
  { name: "Housekeeping", href: "/housekeeping", icon: Users },
  { name: "Laundry & Linen", href: "/laundry", icon: Shirt },
  {
    name: "Patient Movement Services",
    href: "/patient-movement",
    icon: Truck,
  },
];

const admin: Nav[] = [
  { name: "User Management", href: "/admin/users/list", icon: ShieldCheck },
  { name: "Create User", href: "/admin/users", icon: UserPlus },
];

const allNav = [...workspace, ...departments, ...admin];

const matches = (path: string, href: string) =>
  path === href || path.startsWith(`${href}/`);

// Get the most specific active navigation link.
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
  expandable = false,
  expanded = false,
}: Nav & { current?: string; expandable?: boolean; expanded?: boolean }) {
  const on = current === href;

  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-200 ${
        on
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25"
          : expanded
          ? "bg-[var(--shell-hover)] text-[var(--shell-text)]"
          : "text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
      }`}
    >
      {/* Icon tile */}
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          on
            ? "bg-white/20 text-white"
            : "bg-[var(--shell-hover)] text-[var(--shell-icon)] group-hover:bg-blue-500/10 group-hover:text-blue-500"
        }`}
      >
        <Icon size={17} />
      </span>

      <span className="flex-1 truncate">{name}</span>

      {(on || expandable) && (
        <ChevronRight
          size={15}
          className={`shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          } ${on ? "text-white/80" : "text-[var(--shell-muted)]"}`}
        />
      )}
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
      className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors ${
        on
          ? "bg-blue-500/10 font-semibold text-blue-500"
          : "text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
      }`}
    >
      {/* Connector dot on the guide line */}
      <span
        className={`absolute -left-[17px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ring-4 ring-[var(--shell-surface)] ${
          on ? "bg-blue-500" : "bg-[var(--shell-border)]"
        }`}
      />
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-3">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--shell-muted)]">
          {title}
        </p>
        <span className="h-px flex-1 bg-[var(--shell-border)]" />
      </div>

      <div className="space-y-1">{children}</div>
    </section>
  );
}

export default function Sidebar() {
  const path = usePathname();
  const current = activeHref(path);

  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          if (alive) {
            setUser(null);
            setAuthLoaded(true);
          }
          return;
        }

        const data = await response.json();

        // Supports both:
        // { user: { role: "ADMIN" } }
        // { role: "ADMIN" }
        const authenticatedUser = data?.user ?? data?.data?.user ?? data;

        if (
          alive &&
          authenticatedUser &&
          (authenticatedUser.role === "ADMIN" ||
            authenticatedUser.role === "USER")
        ) {
          setUser(authenticatedUser as User);
        }
      } catch (error) {
        console.error("Sidebar authentication error:", error);
        if (alive) setUser(null);
      } finally {
        if (alive) setAuthLoaded(true);
      }
    }

    void loadUser();

    return () => {
      alive = false;
    };
  }, []);

  // Department submenu remains visible on salary pages.
  const activeDepartment = departments.find((item) =>
    matches(path, item.href)
  );

  const initial = (user?.username?.[0] ?? "U").toUpperCase();

  return (
    <aside className="flex min-h-full w-64 shrink-0 flex-col border-r border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--shell-text)]">
      {/* Logo */}
      <div className="flex h-[76px] items-center border-b border-[var(--shell-border)] px-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-600/30">
            <Wallet size={22} />
          </div>

          <div>
            <h1 className="text-xl font-bold leading-none">
              Payroll<span className="text-blue-500">X</span>
            </h1>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--shell-muted)]">
              Salary Management
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="hide-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {/* Workspace - ADMIN and USER */}
        <Section title="Workspace">
          {workspace.map((item) => (
            <NavLink key={item.href} {...item} current={current} />
          ))}
        </Section>

        {/* Departments - ADMIN and USER */}
        <Section title="Departments">
          {departments.map((item) => {
            const isActive = activeDepartment?.href === item.href;

            return (
              <div key={item.href}>
                <NavLink
                  {...item}
                  current={isActive ? item.href : current}
                  expandable
                  expanded={isActive}
                />

                {isActive && (
                  <div className="ml-[22px] mt-1.5 space-y-1 border-l border-[var(--shell-border)] pb-1 pl-4">
                    <SubLink
                      href={`${item.href}/salary`}
                      path={path}
                      icon={<ClipboardList size={14} />}
                    >
                      Saved Salary Records
                    </SubLink>

                    <SubLink
                      href={`${item.href}/salary/new`}
                      path={path}
                      icon={<PlusCircle size={14} />}
                    >
                      Add This Month&apos;s Salary
                    </SubLink>
                  </div>
                )}
              </div>
            );
          })}
        </Section>

        {/* Administration - ADMIN ONLY */}
        {authLoaded && user?.role === "ADMIN" && (
          <Section title="Administration">
            {admin.map((item) => (
              <NavLink key={item.href} {...item} current={current} />
            ))}
          </Section>
        )}
      </nav>

      {/* Footer */}
      <div className="space-y-3 border-t border-[var(--shell-border)] p-3">
        {user && (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-hover)] p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {user.username ?? "User"}
              </p>
              <span
                className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  user.role === "ADMIN"
                    ? "bg-blue-500/15 text-blue-500"
                    : "bg-emerald-500/15 text-emerald-500"
                }`}
              >
                {user.role}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-1.5 text-[10px] text-[var(--shell-muted)]">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            System operational
          </span>
          <span>PayrollX</span>
        </div>
      </div>
    </aside>
  );
}