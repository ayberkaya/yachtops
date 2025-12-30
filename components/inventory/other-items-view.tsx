"use client";

import { InventorySectionView, type InventoryItem } from "@/components/inventory/inventory-section-view";

interface OtherItemsViewProps {
  initialItems: InventoryItem[];
  readOnly?: boolean;
}

export function OtherItemsView({ initialItems }: OtherItemsViewProps) {
  return (
    <InventorySectionView
      apiBasePath="/api/inventory/other-items"
      initialItems={initialItems}
      defaultUnit="piece"
      categories={[
        { value: "SAFETY_EQUIPMENT", label: "Safety equipment" },
        { value: "WATER_SPORTS", label: "Water sports" },
        { value: "DECK_EQUIPMENT", label: "Deck equipment" },
        { value: "OTHER", label: "Other" },
      ]}
      unitOptions={[
        { value: "piece", label: "piece" },
        { value: "set", label: "set" },
        { value: "pair", label: "pair" },
        { value: "box", label: "box" },
        { value: "other", label: "other" },
      ]}
    />
  );
}


