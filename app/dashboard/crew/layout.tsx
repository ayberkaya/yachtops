import { ModuleNav } from "@/components/ui/module-nav";

export default function CrewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const links = [
    { href: "/dashboard/users", label: "Crew Management" },
    { href: "/dashboard/users/roles-permissions", label: "Roles & Permissions" },
    { href: "/dashboard/users/shifts", label: "Shift Management" },
  ];

  return (
    <>
      <ModuleNav links={links} />
      {children}
    </>
  );
}

