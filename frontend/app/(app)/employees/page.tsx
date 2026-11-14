"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserX,
  Pencil,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserRound,
  CalendarDays,
  IndianRupee,
  Building2,
  Power,
} from "lucide-react";

const DEPARTMENTS = [
  "Voucher & ID Staff",
  "Head Office",
  "Housekeeping",
  "Laundry & Linen",
  "Patient Movement Services",
];

type Employee = {
  id: number;
  employee_code: string;
  employee_name: string;
  department: string;
  date_of_joining: string | null;
  basic_salary: number | string;
  ot_rate: number | string;
  night_rate: number | string;
  is_active: boolean;
  created_at?: string;
};

type EmployeeForm = {
  employee_code: string;
  employee_name: string;
  department: string;
  date_of_joining: string;
  basic_salary: string;
  ot_rate: string;
  night_rate: string;
};

const EMPTY_FORM: EmployeeForm = {
  employee_code: "",
  employee_name: "",
  department: "",
  date_of_joining: "",
  basic_salary: "",
  ot_rate: "0",
  night_rate: "0",
};

function formatCurrency(value: number | string) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = value.slice(0, 10).split("-");

  if (date.length !== 3) return value;

  return `${date[2]}/${date[1]}/${date[0]}`;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadEmployees = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch("/api/employees", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load employees.");
      }

      setEmployees(data.employees || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load employees."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const activeCount = employees.filter((employee) => employee.is_active).length;
  const inactiveCount = employees.length - activeCount;

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.employee_code.toLowerCase().includes(query) ||
        employee.employee_name.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query);

      const matchesDepartment =
        departmentFilter === "ALL" ||
        employee.department === departmentFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && employee.is_active) ||
        (statusFilter === "INACTIVE" && !employee.is_active);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, search, departmentFilter, statusFilter]);

  function openCreateForm() {
    setEditingEmployee(null);
    setForm(EMPTY_FORM);
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function openEditForm(employee: Employee) {
    setEditingEmployee(employee);

    setForm({
      employee_code: employee.employee_code,
      employee_name: employee.employee_name,
      department: employee.department,
      date_of_joining: employee.date_of_joining
        ? employee.date_of_joining.slice(0, 10)
        : "",
      basic_salary: String(employee.basic_salary ?? ""),
      ot_rate: String(employee.ot_rate ?? "0"),
      night_rate: String(employee.night_rate ?? "0"),
    });

    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;

    setFormOpen(false);
    setEditingEmployee(null);
    setForm(EMPTY_FORM);
  }

  function updateForm(
    field: keyof EmployeeForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...(editingEmployee ? { id: editingEmployee.id } : {}),
        employee_code: form.employee_code.trim(),
        employee_name: form.employee_name.trim(),
        department: form.department,
        date_of_joining: form.date_of_joining,
        basic_salary: Number(form.basic_salary),
        ot_rate: Number(form.ot_rate || 0),
        night_rate: Number(form.night_rate || 0),
      };

      const response = await fetch("/api/employees", {
        method: editingEmployee ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save employee.");
      }

      setFormOpen(false);
      setEditingEmployee(null);
      setForm(EMPTY_FORM);

      await loadEmployees(true);

      setMessage(
        editingEmployee
          ? "Employee updated successfully."
          : "Employee added successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save employee."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleEmployeeStatus(employee: Employee) {
    const action = employee.is_active ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${employee.employee_name}?`
      )
    ) {
      return;
    }

    setChangingStatus(employee.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/employees", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: employee.id,
          is_active: !employee.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update employee status.");
      }

      setEmployees((current) =>
        current.map((item) =>
          item.id === employee.id
            ? { ...item, is_active: data.employee.is_active }
            : item
        )
      );

      setMessage(data.message || "Employee status updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update employee status."
      );
    } finally {
      setChangingStatus(null);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--shell-border)] bg-[var(--shell-field)] px-4 py-3 text-sm text-[var(--shell-text)] outline-none transition placeholder:text-[var(--shell-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  const labelClass = "mb-2 block text-sm font-medium text-[var(--shell-text)]";

  return (
    <div className="min-h-full text-[var(--shell-text)]">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-[var(--shell-accent)]">
              <Users size={17} />
              <span>Employee Management</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Employees
            </h1>

            <p className="mt-2 text-sm text-[var(--shell-muted)]">
              Manage employee records, departments, and salary details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadEmployees(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3 text-sm font-medium text-[var(--shell-text)] transition hover:bg-[var(--shell-hover)] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
            >
              <Plus size={18} />
              Add Employee
            </button>
          </div>
        </header>

        {message && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-[var(--shell-success)]">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p>{message}</p>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="ml-auto text-[var(--shell-success)] opacity-70 hover:opacity-100"
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-[var(--shell-danger)]">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto text-[var(--shell-danger)] opacity-70 hover:opacity-100"
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Employees",
              value: employees.length,
              icon: Users,
              color: "text-[var(--shell-accent)]",
              bg: "bg-blue-500/10",
            },
            {
              label: "Active Employees",
              value: activeCount,
              icon: UserCheck,
              color: "text-[var(--shell-success)]",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Inactive Employees",
              value: inactiveCount,
              icon: UserX,
              color: "text-[var(--shell-warn)]",
              bg: "bg-amber-500/10",
            },
            {
              label: "Departments",
              value: new Set(employees.map((employee) => employee.department))
                .size,
              icon: Building2,
              color: "text-[var(--shell-violet)]",
              bg: "bg-violet-500/10",
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--shell-muted)]">{card.label}</p>
                  <div className={`rounded-xl p-2.5 ${card.bg}`}>
                    <Icon size={20} className={card.color} />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold">{card.value}</p>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <div className="border-b border-[var(--shell-border)] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-semibold">Employee Directory</h2>
                <p className="mt-1 text-sm text-[var(--shell-muted)]">
                  {filteredEmployees.length} employee
                  {filteredEmployees.length !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
                <div className="relative sm:col-span-2 lg:w-72">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--shell-muted)]"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name or employee ID..."
                    className={`${inputClass} pl-10`}
                  />
                </div>

                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className={`${inputClass} sm:min-w-48 lg:w-52`}
                  aria-label="Filter by department"
                >
                  <option value="ALL">All Departments</option>
                  {DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={`${inputClass} lg:w-40`}
                  aria-label="Filter by status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-[var(--shell-muted)]">
              <Loader2 size={30} className="animate-spin text-[var(--shell-accent)]" />
              <p className="text-sm">Loading employee records...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="rounded-2xl bg-[var(--shell-hover)] p-4">
                <UserRound size={32} className="text-[var(--shell-muted)]" />
              </div>

              <h3 className="mt-4 text-lg font-semibold">
                {employees.length === 0
                  ? "No employees found"
                  : "No matching employees"}
              </h3>

              <p className="mt-2 max-w-md text-sm text-[var(--shell-muted)]">
                {employees.length === 0
                  ? "Start by adding your first employee record."
                  : "Try changing your search term or filters."}
              </p>

              {employees.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="text-white mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
                >
                  <Plus size={17} />
                  Add First Employee
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-[var(--shell-border)] bg-[var(--shell-hover)] text-xs uppercase tracking-wider text-[var(--shell-muted)]">
                  <tr>
                    <th className="px-5 py-4 font-medium">Employee</th>
                    <th className="px-5 py-4 font-medium">Department</th>
                    <th className="px-5 py-4 font-medium">Joining Date</th>
                    <th className="px-5 py-4 font-medium">Basic Salary</th>
                    <th className="px-5 py-4 font-medium">OT Rate</th>
                    <th className="px-5 py-4 font-medium">Night Rate</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--shell-border)]">
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="transition hover:bg-[var(--shell-hover)]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-bold text-[var(--shell-accent)]">
                            {employee.employee_name
                              .trim()
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-[var(--shell-text)]">
                              {employee.employee_name}
                            </p>
                            <p className="mt-1 text-xs text-[var(--shell-muted)]">
                              ID: {employee.employee_code}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-[var(--shell-text)]">
                        {employee.department}
                      </td>

                      <td className="px-5 py-4 text-[var(--shell-text)]">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays
                            size={15}
                            className="text-[var(--shell-muted)]"
                          />
                          {formatDate(employee.date_of_joining)}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium text-[var(--shell-text)]">
                        <span className="inline-flex items-center gap-1">
                          <IndianRupee size={14} />
                          {Number(employee.basic_salary).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-[var(--shell-text)]">
                        {formatCurrency(employee.ot_rate)}
                      </td>

                      <td className="px-5 py-4 text-[var(--shell-text)]">
                        {formatCurrency(employee.night_rate)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                            employee.is_active
                              ? "bg-emerald-500/10 text-[var(--shell-success)]"
                              : "bg-amber-500/10 text-[var(--shell-warn)]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              employee.is_active
                                ? "bg-emerald-400"
                                : "bg-amber-400"
                            }`}
                          />
                          {employee.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(employee)}
                            title="Edit employee"
                            className="rounded-lg border border-[var(--shell-border)] p-2.5 text-[var(--shell-text)] transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-[var(--shell-accent)]"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleEmployeeStatus(employee)}
                            disabled={changingStatus === employee.id}
                            title={
                              employee.is_active
                                ? "Deactivate employee"
                                : "Activate employee"
                            }
                            className={`rounded-lg border border-[var(--shell-border)] p-2.5 transition disabled:opacity-50 ${
                              employee.is_active
                                ? "text-[var(--shell-warn)] hover:bg-amber-500/10"
                                : "text-[var(--shell-success)] hover:bg-emerald-500/10"
                            }`}
                          >
                            {changingStatus === employee.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Power size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[var(--shell-border)] px-5 py-4 text-xs text-[var(--shell-muted)]">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </section>
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--shell-border)] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingEmployee ? "Edit Employee" : "Add New Employee"}
                </h2>
                <p className="mt-1 text-sm text-[var(--shell-muted)]">
                  {editingEmployee
                    ? "Update the employee's details."
                    : "Enter the employee's details below."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-[var(--shell-muted)] transition hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)] disabled:opacity-50"
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="employee_code">
                    Employee Code *
                  </label>
                  <input
                    id="employee_code"
                    required
                    maxLength={50}
                    value={form.employee_code}
                    onChange={(event) =>
                      updateForm("employee_code", event.target.value)
                    }
                    placeholder="e.g. EMP001"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="employee_name">
                    Employee Name *
                  </label>
                  <input
                    id="employee_name"
                    required
                    maxLength={150}
                    value={form.employee_name}
                    onChange={(event) =>
                      updateForm("employee_name", event.target.value)
                    }
                    placeholder="Enter full name"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="department">
                    Department *
                  </label>
                  <select
                    id="department"
                    required
                    value={form.department}
                    onChange={(event) =>
                      updateForm("department", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select department
                    </option>
                    {DEPARTMENTS.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="date_of_joining">
                    Date of Joining
                  </label>
                  <input
                    id="date_of_joining"
                    type="date"
                    value={form.date_of_joining}
                    onChange={(event) =>
                      updateForm("date_of_joining", event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="basic_salary">
                    Basic Salary (₹) *
                  </label>
                  <input
                    id="basic_salary"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.basic_salary}
                    onChange={(event) =>
                      updateForm("basic_salary", event.target.value)
                    }
                    placeholder="e.g. 18000"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="ot_rate">
                    Overtime Rate (₹)
                  </label>
                  <input
                    id="ot_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.ot_rate}
                    onChange={(event) =>
                      updateForm("ot_rate", event.target.value)
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="night_rate">
                    Night Shift Rate (₹)
                  </label>
                  <input
                    id="night_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.night_rate}
                    onChange={(event) =>
                      updateForm("night_rate", event.target.value)
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>

              {error && (
                <div className="mx-6 mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-[var(--shell-danger)]">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-[var(--shell-border)] bg-[var(--shell-hover)] px-6 py-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-[var(--shell-border)] px-5 py-3 text-sm font-medium text-[var(--shell-text)] transition hover:bg-[var(--shell-hover)] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingEmployee ? "Save Changes" : "Add Employee"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}