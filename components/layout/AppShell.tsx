
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

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const [mobile, setMobile] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Load authentication and theme.
  useEffect(() => {
    let active = true;

    try {
      const savedTheme = localStorage.getItem("salary-theme");

      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    } catch {}

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          if (active) router.replace("/login");
          return;
        }

        const data = await response.json();

        const currentUser =
          data?.user ?? data?.data?.user ?? data;

        if (!currentUser || !currentUser.role) {
          if (active) router.replace("/login");
          return;
        }
      } catch {
        if (active) router.replace("/login");
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  // Theme switching.
  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";

      try {
        localStorage.setItem("salary-theme", next);
      } catch {}

      return next;
    });
  };

  // Theme variables.
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
      style={{
        ...themeVariables,
        colorScheme: theme,
      }}
      className="flex h-dvh min-w-0 overflow-hidden bg-[var(--shell-bg)] text-[var(--shell-text)]"
    >
      {/* DESKTOP SIDEBAR - ALL AUTHENTICATED USERS */}
      <aside className="hidden h-full shrink-0 lg:block">
        <Sidebar />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

        {/* MOBILE NAVIGATION HEADER - ALL USERS */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--shell-border)] px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobile((value) => !value)}
            aria-label={
              mobile ? "Close navigation" : "Open navigation"
            }
            aria-expanded={mobile}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--shell-hover)]"
          >
            {mobile ? <X size={20} /> : <Menu size={20} />}
          </button>

          <b>
            Payroll<span className="text-blue-500">X</span>
          </b>
        </div>

        {/* DESKTOP HEADER - ALL AUTHENTICATED USERS */}
        <div className="hidden shrink-0 lg:block">
          <Header
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </div>

        {/* MAIN PAGE CONTENT - ALL AUTHENTICATED USERS */}
        <main className="hide-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto bg-[var(--shell-bg)] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* MOBILE SIDEBAR - ALL AUTHENTICATED USERS */}
      {mobile && (
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
