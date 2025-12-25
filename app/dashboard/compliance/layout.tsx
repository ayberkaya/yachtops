import { ModuleNav } from "@/components/ui/module-nav";

export default function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const links = [
    { href: "/dashboard/documents/receipts", label: "Financial Documents" },
    { href: "/dashboard/documents/marina-permissions", label: "Port & Authority Permits" },
    { href: "/dashboard/documents/vessel", label: "Vessel Certificates" },
    { href: "/dashboard/documents/crew", label: "Crew Certifications" },
  ];

  return (
    <>
      <ModuleNav links={links} />
      {children}
    </>
  );
}

