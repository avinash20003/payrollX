"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Main Application */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Payroll<span className="text-blue-600">X</span>
            </h1>
            <p className="text-[10px] text-slate-500">
              Salary Management System
            </p>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Page Content */}
        <main className="min-w-0 flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-2xl">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}