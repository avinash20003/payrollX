"use client";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { FormEvent, useState } from "react";
import {
  UserPlus,
  Users,
  Building2,
  LockKeyhole,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowUpRight,
  Eye,
  EyeOff,
  Fingerprint,
  ChevronDown,
  CircleCheck,
  UserRound,
  Sparkles,
} from "lucide-react";

const departments = [
  "Voucher & ID Staff",
  "Head Office",
  "Housekeeping",
  "Laundry & Linen",
  "Patient Movement Services",
];

export default function CreateDepartmentUserPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const inputClass =
    "w-full rounded-xl border border-slate-700/80 bg-[#0b1220] py-3.5 pl-11 pr-12 text-sm text-slate-100 outline-none transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setMessage("Passwords do not match. Please check both fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, department }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to create user.");
        return;
      }

      setSuccess(true);
      setMessage(data.message || "User created successfully.");

      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setDepartment("");
    } catch {
      setMessage("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080e1a] px-4 py-8 text-slate-100 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/[0.10] blur-[130px]" />
      <div className="pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-sky-500/[0.07] blur-[130px]" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-slate-800/80 pb-7 sm:flex-row sm:items-center sm:justify-between">
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

          <div className="flex items-center gap-3 self-start rounded-xl border border-slate-800 bg-[#0d1524] px-4 py-2.5 sm:self-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
              <ShieldCheck size={17} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">
                Secure administration
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Protected workspace
              </p>
            </div>
            <span className="ml-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]" />
          </div>
        </header>

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            <Sparkles size={14} />
            User administration
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Create a new user<span className="text-blue-400">.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Create department accounts, assign organizational access, and
            manage credentials from one place.
          </p>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0d1422]/95 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
                  <UserPlus size={19} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Account details
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Enter the required information below
                  </p>
                </div>
              </div>

              <span className="rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[10px] font-medium tracking-wide text-slate-300">
                NEW ACCOUNT
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2.5 block text-xs font-semibold tracking-wide text-slate-300"
                >
                  Username <span className="text-blue-400">*</span>
                </label>

                <div className="relative">
                  <UserRound
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="e.g. housekeeping_user"
                    autoComplete="off"
                    maxLength={100}
                    pattern="[a-zA-Z0-9._-]+"
                    title="Use letters, numbers, dots, underscores, or hyphens."
                    required
                    className={inputClass}
                  />
                </div>

                <p className="mt-2 text-[11px] text-slate-400">
                  Letters, numbers, periods, underscores, and hyphens.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2.5 block text-xs font-semibold tracking-wide text-slate-300"
                >
                  Password <span className="text-blue-400">*</span>
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={1024}
                    required
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-300"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                <p className="mt-2 text-[11px] text-slate-400">
                  Use at least 8 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2.5 block text-xs font-semibold tracking-wide text-slate-300"
                >
                  Confirm password <span className="text-blue-400">*</span>
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={1024}
                    required
                    aria-invalid={
                      confirmPassword.length > 0 && !passwordsMatch
                    }
                    className={`${inputClass} ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? "border-emerald-500/50 focus:border-emerald-500"
                          : "border-red-500/50 focus:border-red-500"
                        : ""
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                {confirmPassword.length > 0 && (
                  <p
                    className={`mt-2 flex items-center gap-1.5 text-[11px] ${
                      passwordsMatch ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {passwordsMatch ? (
                      <CircleCheck size={13} />
                    ) : (
                      <AlertCircle size={13} />
                    )}
                    {passwordsMatch
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="department"
                  className="mb-2.5 block text-xs font-semibold tracking-wide text-slate-300"
                >
                  Department <span className="text-blue-400">*</span>
                </label>

                <div className="relative">
                  <Building2
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    id="department"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    required
                    className={`${inputClass} cursor-pointer appearance-none ${
                      department ? "text-slate-100" : "text-slate-400"
                    }`}
                  >
                    <option value="" disabled className="bg-[#0d1422]">
                      Select a department
                    </option>

                    {departments.map((item) => (
                      <option
                        key={item}
                        value={item}
                        className="bg-[#0d1422] text-slate-100"
                      >
                        {item}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {department && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-400/15 bg-blue-500/[0.06] px-3 py-2.5">
                    <Building2 size={14} className="text-blue-300" />
                    <span className="text-xs text-slate-300">
                      Selected:{" "}
                      <span className="font-medium text-blue-200">
                        {department}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {message && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                    success
                      ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
                      : "border-red-400/20 bg-red-400/[0.06] text-red-300"
                  }`}
                >
                  {success ? (
                    <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  )}
                  <p className="leading-6">{message}</p>
                </div>
              )}

              <div className="flex flex-col gap-4 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Fingerprint size={15} className="shrink-0" />
                  Credentials are processed securely.
                </p>

                <button
                  type="submit"
                  disabled={loading || !passwordsMatch}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition duration-200 hover:bg-blue-500 hover:shadow-blue-900/30 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus size={17} />
                      Create user
                      <ArrowUpRight
                        size={16}
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-[#0d1422]/95 p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
                <ShieldCheck size={19} />
              </div>

              <h3 className="text-sm font-semibold text-white">
                Access & permissions
              </h3>

              <p className="mt-2 text-xs leading-6 text-slate-400">
                This account is created with the USER role and an assigned
                department. Actual data access must be enforced by your
                backend APIs.
              </p>

              <div className="mt-5 space-y-3 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">Account role</span>
                  <span className="rounded-md border border-blue-400/15 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-300">
                    USER
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">Department</span>
                  <span className="max-w-[145px] truncate text-right text-xs text-slate-300">
                    {department || "Not selected"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">Status</span>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Active on creation
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-400/15 bg-gradient-to-br from-blue-500/[0.09] to-sky-500/[0.03] p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
                <Sparkles size={17} />
              </div>

              <h3 className="text-sm font-semibold text-slate-200">
                Before you create
              </h3>

              <ul className="mt-3 space-y-3 text-xs leading-5 text-slate-400">
                <li className="flex gap-2.5">
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-blue-300"
                  />
                  Choose the correct department.
                </li>
                <li className="flex gap-2.5">
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-blue-300"
                  />
                  Use a unique username.
                </li>
                <li className="flex gap-2.5">
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-blue-300"
                  />
                  Make sure both passwords match.
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-800/80 pt-5 text-center text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>PayrollX · Workforce administration</span>
          <span className="flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} />
            Restricted to authenticated administrators
          </span>
        </footer>
      </div>
    </main>
  );
}