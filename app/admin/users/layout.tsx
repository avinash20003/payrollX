import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-[#080e1a]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        <main className="hide-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
