"use client";

import { InventorySectionView, type InventoryItem } from "@/components/inventory/inventory-section-view";

interface SparePartsViewProps {
  initialStocks: InventoryItem[];
  readOnly?: boolean;
}

export function SparePartsView({ initialStocks }: SparePartsViewProps) {
  return (
    <InventorySectionView
      apiBasePath="/api/inventory/spare-parts"
      initialItems={initialStocks}
      defaultUnit="piece"
      categories={[
        { value: "ENGINE", label: "Engine" },
        { value: "ELECTRICAL", label: "Electrical" },
        { value: "PLUMBING", label: "Plumbing" },
        { value: "DECK", label: "Deck" },
        { value: "RIGGING", label: "Rigging" },
        { value: "SAFETY", label: "Safety" },
        { value: "TOOLS", label: "Tools" },
        { value: "OTHER", label: "Other" },
      ]}
      unitOptions={[
        { value: "piece", label: "piece" },
        { value: "set", label: "set" },
        { value: "box", label: "box" },
      ]}
    />
  );
}


