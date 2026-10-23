"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  ShieldCheck,
  Building2,
  UserRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LoaderCircle,
  ChevronLeft,
  CalendarDays,
  Filter,
  Power,
  ArrowUpRight,
} from "lucide-react";

type ManagedUser = {
  id: number;
  username: string;
  role: string;
  department: string | null;
  is_active: boolean;
  created_at: string | null;
};

const departments = [
  "Voucher & ID Staff",
  "Head Office",
  "Housekeeping",
  "Laundry & Linen",
  "Patient Movement Services",
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setError(false);

    try {
      const response = await fetch("/api/users", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load users.");
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error ? err.message : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.username.toLowerCase().includes(query) ||
        (user.department || "").toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query);

      const matchesDepartment =
        departmentFilter === "ALL" ||
        user.department === departmentFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.is_active) ||
        (statusFilter === "INACTIVE" && !user.is_active);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [users, search, departmentFilter, statusFilter]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = totalUsers - activeUsers;
  const departmentUsers = users.filter((user) => user.role === "USER").length;

  async function toggleUserStatus(user: ManagedUser) {
    const action = user.is_active ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${user.username}"?`
    );

    if (!confirmed) return;

    setUpdatingId(user.id);
    setMessage("");
    setError(false);

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          is_active: !user.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update account status.");
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id ? data.user : currentUser
        )
      );

      setMessage(data.message || "Account status updated successfully.");
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to update account status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080e1a] px-4 py-8 text-slate-100 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/[0.10] blur-[130px]" />
      <div className="pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-sky-500/[0.07] blur-[130px]" />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-9 flex flex-col gap-5 border-b border-slate-800/80 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-950/30">
              <Users size={23} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">
                  Payroll<span className="text-blue-400">X</span>
                </span>

                <span className="rounded-md border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                  Admin
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                Workforce management system
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#0d1524] px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-blue-400/40 hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              href="/admin/users"
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
            >
              <UserPlus size={17} />
              Create user
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>

        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
          <ShieldCheck size={14} />
          User administration
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              User management<span className="text-blue-400">.</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              View department accounts, monitor account status, and manage
              access from one place.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-800 bg-[#0d1524] px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]" />
            <span className="text-xs text-slate-300">
              Administrator workspace
            </span>
          </div>
        </div>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              error
                ? "border-red-400/20 bg-red-400/[0.06] text-red-300"
                : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
            }`}
          >
            {error ? (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            )}
            <span>{message}</span>
          </div>
        )}

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total accounts"
            value={totalUsers}
            description="All registered accounts"
            icon={Users}
            iconClass="border-blue-400/15 bg-blue-500/10 text-blue-300"
          />

          <StatCard
            label="Active accounts"
            value={activeUsers}
            description="Accounts currently active"
            icon={CheckCircle2}
            iconClass="border-emerald-400/15 bg-emerald-500/10 text-emerald-300"
          />

          <StatCard
            label="Inactive accounts"
            value={inactiveUsers}
            description="Accounts currently disabled"
            icon={XCircle}
            iconClass="border-red-400/15 bg-red-500/10 text-red-300"
          />

          <StatCard
            label="Department users"
            value={departmentUsers}
            description="Accounts with the USER role"
            icon={Building2}
            iconClass="border-sky-400/15 bg-sky-500/10 text-sky-300"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0d1422]/95 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 sm:px-7 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
                <Users size={19} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-white">
                  Registered users
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {filteredUsers.length} of {totalUsers} accounts displayed
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search users..."
                  aria-label="Search users"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#0b1220] py-3 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="relative">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <select
                  value={departmentFilter}
                  onChange={(event) =>
                    setDepartmentFilter(event.target.value)
                  }
                  aria-label="Filter by department"
                  className="w-full appearance-none rounded-xl border border-slate-700/80 bg-[#0b1220] py-3 pl-9 pr-8 text-sm text-slate-300 outline-none transition focus:border-blue-500 sm:w-52"
                >
                  <option value="ALL">All departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                  <option value="__UNASSIGNED__">Unassigned</option>
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by account status"
                className="rounded-xl border border-slate-700/80 bg-[#0b1220] px-3 py-3 text-sm text-slate-300 outline-none transition focus:border-blue-500"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12">
              <LoaderCircle size={30} className="animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">Loading user accounts...</p>
            </div>
          ) : error && users.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-red-300">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Unable to load users
              </h3>
              <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">
                {message || "Please check your connection and try again."}
              </p>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500"
              >
                Try again
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-400">
                <Users size={22} />
              </div>
              <h3 className="text-sm font-semibold text-white">
                No users found
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Try changing your search or filter settings.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDepartmentFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="mt-4 text-xs font-medium text-blue-300 transition hover:text-blue-200"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0a111e]/70">
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        User
                      </th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Department
                      </th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Role
                      </th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Created
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="transition hover:bg-blue-500/[0.025]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-gradient-to-br from-blue-500/15 to-sky-500/[0.06] text-sm font-semibold text-blue-200">
                              {user.username.slice(0, 1).toUpperCase()}
                            </div>

                            <div>
                              <p className="text-sm font-medium text-slate-100">
                                {user.username}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                ID: {user.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Building2
                              size={14}
                              className="shrink-0 text-slate-500"
                            />
                            <span>{user.department || "Unassigned"}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${
                              user.role === "ADMIN"
                                ? "border-violet-400/20 bg-violet-500/10 text-violet-300"
                                : "border-blue-400/15 bg-blue-500/10 text-blue-300"
                            }`}
                          >
                            {user.role === "ADMIN" ? (
                              <ShieldCheck size={12} />
                            ) : (
                              <UserRound size={12} />
                            )}
                            {user.role}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-medium ${
                              user.is_active
                                ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                                : "border-red-400/20 bg-red-400/[0.07] text-red-300"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                user.is_active
                                  ? "bg-emerald-400"
                                  : "bg-red-400"
                              }`}
                            />
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <CalendarDays
                              size={14}
                              className="shrink-0 text-slate-500"
                            />
                            {formatDate(user.created_at)}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {user.role === "USER" ? (
                            <button
                              type="button"
                              onClick={() => void toggleUserStatus(user)}
                              disabled={updatingId !== null}
                              aria-label={`${user.is_active ? "Deactivate" : "Activate"} ${user.username}`}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                user.is_active
                                  ? "border-red-400/20 bg-red-500/[0.05] text-red-300 hover:border-red-400/40 hover:bg-red-500/10"
                                  : "border-emerald-400/20 bg-emerald-500/[0.05] text-emerald-300 hover:border-emerald-400/40 hover:bg-emerald-500/10"
                              }`}
                            >
                              {updatingId === user.id ? (
                                <LoaderCircle
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Power size={14} />
                              )}
                              {updatingId === user.id
                                ? "Updating..."
                                : user.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-600">
                              Protected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-800 px-6 py-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {filteredUsers.length} of {totalUsers} accounts
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  Administrator access required
                </span>
              </div>
            </>
          )}
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-800/80 pt-5 text-center text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <Link
            href="/admin/users"
            className="flex items-center justify-center gap-1.5 transition hover:text-blue-300 sm:justify-start"
          >
            <ChevronLeft size={14} />
            Back to user creation
          </Link>

          <span className="flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} />
            PayrollX · Workforce administration
          </span>
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof Users;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1422]/95 p-5 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconClass}`}
        >
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">{description}</p>
    </div>
  );
}