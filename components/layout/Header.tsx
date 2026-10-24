"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CircleUserRound,
  ChevronRight,
  LogOut,
} from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/employees": "Employee Master",
  "/departments": "Departments",
  "/departments/id-staff": "ID Staff",
  "/departments/head-office": "Head Office",
  "/departments/housekeeping": "Housekeeping",
  "/departments/laundry-linen": "Laundry & Linen",
  "/departments/patient-movement": "Patient Movement",
  "/id-staff": "ID Staff",
  "/head-office": "Head Office",
  "/housekeeping": "Housekeeping",
  "/laundry": "Laundry & Linen",
  "/patient-movement": "Patient Movement",
};

type AuthUser = {
  id: number;
  username: string;
  role: string;
  department: string | null;
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith("/employees/") ? "Employee Details" : "PayrollX");

  useEffect(() => {
    let active = true;

    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          if (active) {
            setUser(null);
          }
          return;
        }

        const data = await response.json();

        if (active && data.success && data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Unable to fetch current user:", error);
      }
    }

    fetchUser();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      setUser(null);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
      window.alert("Unable to log out. Please try again.");
    }
  }

  const roleLabel = user?.role
    ? user.role
        .toLowerCase()
        .split(/[_\s]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "Loading...";

  return (
    <header className="sticky top-0 z-30 flex h-[76px] shrink-0 items-center justify-between border-b border-slate-800 bg-[#0d1526]/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>PayrollX</span>
          <ChevronRight size={13} />
          <span className="truncate text-blue-400">{title}</span>
        </div>

        <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-100 sm:text-xl">
          {title}
        </h2>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-3 sm:gap-5">
        <div className="hidden text-right md:block">
          <p className="text-xs font-medium text-slate-400">
            Payroll and employee management
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Manage your workforce
          </p>
        </div>

        <div className="hidden h-9 w-px bg-slate-800 md:block" />

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-[#111c33] text-slate-400 transition hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-blue-300"
        >
          <Bell size={19} />
        </button>

        <div className="flex items-center gap-2 border-l border-slate-800 pl-3 sm:gap-3 sm:pl-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-900/10">
            <CircleUserRound size={23} />
          </div>

          <div className="hidden min-w-0 sm:block">
            <p className="max-w-36 truncate text-sm font-semibold text-slate-100">
              {user?.username ?? "Loading..."}
            </p>
            <p className="mt-0.5 max-w-36 truncate text-xs text-slate-400">
              {roleLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Logout"
            aria-label="Logout"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#111c33] text-slate-400 transition hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
