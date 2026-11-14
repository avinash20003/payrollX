import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAYROLLX | Amrita Institute of Science and Technology",
  description:
    "PAYROLLX - Departmental Payroll Management System for Amrita Institute of Science and Technology.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={
        {
          "--font-geist-sans": "Arial, Helvetica, sans-serif",
          "--font-geist-mono": "Consolas, monospace",
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}