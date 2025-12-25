import { ModuleNav } from "@/components/ui/module-nav";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const links = [
    { href: "/dashboard/inventory", label: "Items" },
    { href: "/dashboard/shopping", label: "Shopping Lists" },
    { href: "/dashboard/inventory/alcohol-stock", label: "Beverage Stock" },
    { href: "/dashboard/inventory/food-provisions", label: "Food & Provisions" },
    { href: "/dashboard/inventory/cleaning-supplies", label: "Cleaning Supplies" },
    { href: "/dashboard/inventory/spare-parts", label: "Spare Parts" },
  ];

  return (
    <>
      <ModuleNav links={links} />
      {children}
    </>
  );
}

