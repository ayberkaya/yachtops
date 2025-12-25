import { ModuleNav } from "@/components/ui/module-nav";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const links = [
    { href: "/dashboard/expenses", label: "All Expenses" },
    { href: "/dashboard/expenses/pending", label: "Approval Queue" },
    { href: "/dashboard/expenses/reimbursable", label: "Reimbursements" },
    { href: "/dashboard/cash", label: "Cash Ledger" },
  ];

  return (
    <>
      <ModuleNav links={links} />
      {children}
    </>
  );
}

