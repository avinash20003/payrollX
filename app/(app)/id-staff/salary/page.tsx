"use client";

import { SalaryHistory } from "@/components/salary/monthly-salary";

export default function Page() {
  return (
    <SalaryHistory
      department={{
        name: "Voucher & ID Staff",
        route: "/id-staff/salary",
        aliases: [
          "Voucher & ID Staff",
          "Voucher and ID Staff",
          "ID Staff",
        ],
        api: "/api/monthly-salary",
      }}
    />
  );
}