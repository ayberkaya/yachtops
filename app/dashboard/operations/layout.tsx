import { ModuleNav } from "@/components/ui/module-nav";

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const links = [
    { href: "/dashboard/trips", label: "Voyages" },
    { href: "/dashboard/tasks", label: "Tasks" },
    { href: "/dashboard/maintenance", label: "Maintenance" },
    { href: "/dashboard/trips/voyage-planning", label: "Voyage Planning" },
    { href: "/dashboard/trips/route-fuel", label: "Route & Fuel" },
    { href: "/dashboard/trips/post-voyage-report", label: "Post-Voyage Report" },
  ];

  return (
    <>
      <ModuleNav links={links} />
      {children}
    </>
  );
}

