"use client";

import { InventorySectionView, type InventoryItem } from "@/components/inventory/inventory-section-view";

interface CleaningSuppliesViewProps {
  initialStocks: InventoryItem[];
  readOnly?: boolean;
}

export function CleaningSuppliesView({ initialStocks }: CleaningSuppliesViewProps) {
  return (
    <InventorySectionView
      apiBasePath="/api/inventory/cleaning-supplies"
      initialItems={initialStocks}
      defaultUnit="piece"
      categories={[
        { value: "DETERGENTS", label: "Detergents" },
        { value: "DISINFECTANTS", label: "Disinfectants" },
        { value: "TOOLS", label: "Tools" },
        { value: "CLOTHS", label: "Cloths" },
        { value: "PAPER_PRODUCTS", label: "Paper products" },
        { value: "SPECIALTY", label: "Specialty" },
        { value: "OTHER", label: "Other" },
      ]}
      unitOptions={[
        { value: "piece", label: "piece" },
        { value: "bottle", label: "bottle" },
        { value: "liter", label: "liter" },
        { value: "pack", label: "pack" },
        { value: "box", label: "box" },
      ]}
    />
  );
}


