export type Department = {
  slug: string;
  name: string;
  menuLabel: string;
  employeeDepartment: string;
  kind: "regular" | "id-staff";
};

export const departments: Department[] = [
  {
    slug: "id-staff",
    name: "ID Staff",
    menuLabel: "ID Staff",
    employeeDepartment: "Voucher & ID Staff",
    kind: "id-staff",
  },
  {
    slug: "head-office",
    name: "Head Office",
    menuLabel: "Head Office",
    employeeDepartment: "Head Office",
    kind: "regular",
  },
  {
    slug: "housekeeping",
    name: "Housekeeping",
    menuLabel: "Housekeeping",
    employeeDepartment: "Housekeeping",
    kind: "regular",
  },
  {
    slug: "laundry-linen",
    name: "Laundry & Linen",
    menuLabel: "Laundry & Linen",
    employeeDepartment: "Laundry & Linen",
    kind: "regular",
  },
  {
    slug: "patient-movement",
    name: "Patient Movement",
    menuLabel: "Patient Movement",
    employeeDepartment: "Patient Movement Services",
    kind: "regular",
  },
];

export function getDepartment(slug: string): Department | undefined {
  return departments.find((d) => d.slug === slug);
}