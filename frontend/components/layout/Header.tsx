"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, CircleUserRound, LogOut, Moon, Sun } from "lucide-react";

type Props = {
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
};

type User = {
  username: string;
  role: string;
};

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/employees": "Employee Master",
  "/id-staff": "ID Staff",
  "/head-office": "Head Office",
  "/payrollx": "Housekeeping",
  "/laundry": "Laundry & Linen",
  "/patient-movement": "Patient Movement",
};

function getTitle(path: string): string {
  if (path.startsWith("/payrollx/salary")) return "Housekeeping Salary";
  if (path.startsWith("/id-staff/salary")) return "ID Staff Salary";
  if (path.startsWith("/head-office/salary")) return "Head Office Salary";
  if (path.startsWith("/laundry/salary")) return "Laundry & Linen Salary";
  if (path.startsWith("/patient-movement/salary")) return "Patient Movement Salary";
  return TITLES[path] ?? "PayrollX";
}

export default function Header({
  theme = "dark",
  onToggleTheme = () => {},
}: Props) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (typeof d === "object" && d && "user" in d && d.user) {
          setUser(d.user as User);
        }
      })
      .catch(() => {});
  }, []);

  const logout = async () => {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const title = getTitle(path);

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-6">
      {/* Breadcrumb + page title */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--shell-muted)]">
          PayrollX
          <ChevronRight size={13} />
          <span className="text-blue-500">{title}</span>
        </div>
        <h2 className="mt-1 text-xl font-bold">{title}</h2>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="flex h-10 items-center gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-hover)] px-3 transition-colors hover:border-blue-500"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          <span className="hidden sm:inline">
            {theme === "dark" ? "Light" : "Dark"}
          </span>
        </button>

        <div className="flex items-center gap-2 border-l border-[var(--shell-border)] pl-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <CircleUserRound size={22} />
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold">{user?.username ?? "Loading…"}</p>
            <p className="text-xs text-[var(--shell-muted)]">{user?.role ?? ""}</p>
          </div>

          <button
            onClick={() => void logout()}
            disabled={loggingOut}
            aria-label="Log out"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--shell-border)] bg-[var(--shell-hover)] transition-colors hover:border-red-500 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
