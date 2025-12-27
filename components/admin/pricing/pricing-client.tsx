"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlanCard, Plan } from "./plan-card";

interface PricingClientProps {
  initialPlans: Plan[];
}

export function PricingClient({ initialPlans }: PricingClientProps) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>(initialPlans);

  const handlePlanUpdate = () => {
    // Refresh the page to get updated data
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          onUpdate={handlePlanUpdate}
        />
      ))}
    </div>
  );
}

