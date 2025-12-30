"use client";

import { InventorySectionView, type InventoryItem } from "@/components/inventory/inventory-section-view";

interface FoodProvisionsViewProps {
  initialStocks: InventoryItem[];
  readOnly?: boolean;
}

export function FoodProvisionsView({ initialStocks }: FoodProvisionsViewProps) {
  return (
    <InventorySectionView
      apiBasePath="/api/inventory/food-provisions"
      initialItems={initialStocks}
      defaultUnit="kg"
      categories={[
        { value: "DAIRY", label: "Dairy" },
        { value: "MEAT", label: "Meat" },
        { value: "SEAFOOD", label: "Seafood" },
        { value: "PRODUCE", label: "Produce" },
        { value: "PANTRY", label: "Pantry" },
        { value: "BEVERAGES", label: "Beverages" },
        { value: "FROZEN", label: "Frozen" },
        { value: "OTHER", label: "Other" },
      ]}
      unitOptions={[
        { value: "kg", label: "kg" },
        { value: "g", label: "g" },
        { value: "liter", label: "liter" },
        { value: "piece", label: "piece" },
        { value: "pack", label: "pack" },
        { value: "box", label: "box" },
      ]}
    />
  );
}


