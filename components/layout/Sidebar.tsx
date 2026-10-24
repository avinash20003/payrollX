"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  IdCard,
  Building2,
  Shirt,
  Truck,
  Wallet,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  UserPlus,
  ClipboardList,
  PlusCircle,
} from "lucide-react";

type User = {
  id: string;
  username: string;
  role: "ADMIN" | "USER";
  department: string | null;
};

const workspaceNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Employee Master", href: "/employees", icon: Users },
];

const departmentNavigation = [
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

const adminNavigation = [
  {
    name: "User Management",
    href: "/admin/users/list",
    icon: ShieldCheck,
  },
  {
    name: "Create User",
    href: "/admin/users",
    icon: UserPlus,
  },
];

function isNavigationActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  name,
  href,
  icon: Icon,
  pathname,
}: {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  pathname: string;
}) {
  const isActive = isNavigationActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200 ${
        isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
          : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {isActive && (
        <span className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full bg-white" />
      )}

      <Icon
        size={19}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={`shrink-0 transition-colors ${
          isActive
            ? "text-white"
            : "text-slate-500 group-hover:text-blue-300"
        }`}
      />

      <span className="flex-1 truncate">{name}</span>

      {isActive && (
        <ChevronRight size={15} className="shrink-0 text-blue-100" />
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (isMounted) setUser(null);
          return;
        }

        const data = await response.json();

        if (isMounted && data.success && data.user) {
          setUser(data.user as User);
        }
      } catch (error) {
        console.error("Failed to fetch authenticated user:", error);
      }
    }

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAdmin = user?.role === "ADMIN";
  const isIdStaffSection = isNavigationActive(pathname, "/id-staff");

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#0b1220] text-white">
      <div className="border-b border-white/[0.07] px-5 py-6">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-950/40 transition-transform duration-200 group-hover:scale-105">
            <Wallet size={23} strokeWidth={2.1} className="text-white" />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Payroll<span className="text-blue-400">X</span>
            </h1>

            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Salary Management
            </p>
          </div>
        </Link>
      </div>

      <div className="px-4 pt-6">
        <div className="flex items-center gap-2 rounded-xl border border-blue-400/10 bg-blue-500/[0.07] px-3 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
            <Sparkles size={16} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200">
              Payroll Workspace
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {isAdmin ? "Administrator" : "Workforce overview"}
            </p>
          </div>
        </div>
      </div>

      <nav className="hide-scrollbar flex-1 space-y-7 overflow-y-auto px-3.5 py-6">
        <div>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>

          <div className="space-y-1">
            {workspaceNavigation.map(({ name, href, icon }) => (
              <NavigationLink
                key={href}
                name={name}
                href={href}
                icon={icon}
                pathname={pathname}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between px-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Departments
            </p>
            <Building2 size={13} className="text-slate-600" />
          </div>

          <div className="space-y-1">
            {departmentNavigation.map(({ name, href, icon }) => (
              <div key={href}>
                <NavigationLink
                  name={name}
                  href={href}
                  icon={icon}
                  pathname={pathname}
                />

                {href === "/id-staff" && isIdStaffSection && (
                  <div className="ml-8 mt-1 space-y-1 border-l border-slate-700 pl-3">
                    <Link
                      href="/id-staff/salary"
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                        pathname === "/id-staff/salary"
                          ? "bg-blue-500/10 font-semibold text-blue-300"
                          : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <ClipboardList size={15} />
                      Saved Salary Records
                    </Link>

                    <Link
                      href="/id-staff/salary/new"
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                        pathname === "/id-staff/salary/new"
                          ? "bg-blue-500/10 font-semibold text-blue-300"
                          : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <PlusCircle size={15} />
                      Add This Month&apos;s Salary
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div>
            <div className="mb-3 flex items-center justify-between px-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Administration
              </p>
              <ShieldCheck size={13} className="text-slate-600" />
            </div>

            <div className="space-y-1">
              {adminNavigation.map(({ name, href, icon }) => (
                <NavigationLink
                  key={href}
                  name={name}
                  href={href}
                  icon={icon}
                  pathname={pathname}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.07] p-4">
        <div className="rounded-xl bg-white/[0.035] px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            <span className="text-xs font-medium text-slate-300">
              System operational
            </span>
          </div>

          <p className="mt-2 text-[10px] text-slate-500">
            PayrollX · Salary Management
          </p>
        </div>
      </div>
    </aside>
  );
}
