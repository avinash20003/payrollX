// components/layout/AppShell.tsx

"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type User = {
  username: string;
  role: string;
};

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [mobile, setMobile] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Sidebar and header appear for admins once the user is known.
  // {children} is always rendered in the same place, so the page is never
  // dropped while the user loads and never remounts when the role arrives.
  const isAdmin = user?.role?.trim().toUpperCase() === "ADMIN";

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("salary-theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    } catch {}

    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const data = await response.json();
        const currentUser = data?.user as User | undefined;

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        if (active) setUser(currentUser);
      } catch {
        router.replace("/login");
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("salary-theme", next);
      } catch {}
      return next;
    });
  };

  const themeVariables: CSSProperties =
    theme === "dark"
      ? ({
          "--shell-bg": "#070d1a",
          "--shell-surface": "#0d1526",
          "--shell-hover": "#111c33",
          "--shell-border": "#1e293b",
          "--shell-text": "#f1f5f9",
          "--shell-muted": "#94a3b8",
          "--shell-icon": "#64748b",
          "--shell-accent": "#93c5fd",
          "--shell-danger": "#fca5a5",
          "--shell-success": "#6ee7b7",
          "--shell-warn": "#fcd34d",
          "--shell-violet": "#c4b5fd",
          "--shell-field": "#0a1120",
        } as CSSProperties)
      : ({
          "--shell-bg": "#f1f5f9",
          "--shell-surface": "#ffffff",
          "--shell-hover": "#f8fafc",
          "--shell-border": "#cbd5e1",
          "--shell-text": "#0f172a",
          "--shell-muted": "#64748b",
          "--shell-icon": "#64748b",
          "--shell-accent": "#1d4ed8",
          "--shell-danger": "#b42318",
          "--shell-success": "#047857",
          "--shell-warn": "#b45309",
          "--shell-violet": "#6d28d9",
          "--shell-field": "#ffffff",
        } as CSSProperties);

  return (
    <div
      data-shell-theme={theme}
      style={{ ...themeVariables, colorScheme: theme }}
      className="flex h-dvh min-w-0 overflow-hidden bg-[var(--shell-bg)] text-[var(--shell-text)]"
    >
      {isAdmin && (
        <aside className="hidden h-full shrink-0 lg:block">
          <Sidebar />
        </aside>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {isAdmin && (
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--shell-border)] px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMobile((value) => !value)}
              aria-label={mobile ? "Close navigation" : "Open navigation"}
              aria-expanded={mobile}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--shell-hover)]"
            >
              {mobile ? <X size={20} /> : <Menu size={20} />}
            </button>

            <b>
              Payroll<span className="text-blue-500">X</span>
            </b>
          </div>
        )}

        {isAdmin && (
          <div className="hidden shrink-0 lg:block">
            <Header theme={theme} onToggleTheme={toggleTheme} />
          </div>
        )}

        <main className="hide-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto bg-[var(--shell-bg)] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {isAdmin && mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/60"
          />

          <div className="absolute inset-y-0 left-0 w-64 max-w-[85vw] overflow-y-auto">
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}