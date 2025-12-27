"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Users } from "lucide-react";
import { PlanEditorSheet } from "./plan-editor-sheet";
import { cn } from "@/lib/utils";

export interface Plan {
  id: string;
  name: string;
  price: number;
  monthly_price?: number | null;
  yearly_price?: number | null;
  currency: string;
  features: string[];
  activeSubscribers: number;
  status?: "active" | "archived";
  description?: string;
  isPopular?: boolean;
  tier?: number;
  limits?: {
    maxUsers?: number;
    maxStorage?: number;
    maxGuests?: number;
    maxCrewMembers?: number;
  } | null;
}

interface PlanCardProps {
  plan: Plan;
  onUpdate?: () => void;
}

export function PlanCard({ plan, onUpdate }: PlanCardProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const displayPrice = plan.monthly_price ?? plan.price;
  const isCustom = displayPrice === 0 || displayPrice === null;

  const formatPrice = (price: number | null | undefined, currency: string) => {
    if (price === 0 || price === null || price === undefined) return "Custom";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Show first 5 features
  const displayedFeatures = plan.features?.slice(0, 5) || [];
  const hasMoreFeatures = (plan.features?.length || 0) > 5;

  return (
    <>
      <Card
        className={cn(
          "relative transition-all hover:shadow-lg",
          plan.isPopular && "ring-2 ring-primary ring-offset-2"
        )}
      >
        {plan.isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground shadow-lg">
              <Sparkles className="mr-1 h-3 w-3" />
              Best Seller
            </Badge>
          </div>
        )}

        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {formatPrice(displayPrice, plan.currency)}
                </span>
                {!isCustom && (
                  <span className="text-muted-foreground">/month</span>
                )}
              </div>
            </div>
            {plan.status === "archived" && (
              <Badge variant="secondary">Archived</Badge>
            )}
          </div>

          {/* User Count Badge */}
          <div className="mt-4">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              Active on: {plan.activeSubscribers} Yacht{plan.activeSubscribers !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Features List */}
          <div className="space-y-2">
            {displayedFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
            {hasMoreFeatures && (
              <p className="text-xs text-muted-foreground pt-1">
                +{plan.features.length - 5} more features
              </p>
            )}
          </div>

          {/* Limits Preview */}
          {plan.limits && (
            <div className="pt-2 border-t space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Limits:</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {plan.limits.maxCrewMembers && (
                  <div>Max Crew: {plan.limits.maxCrewMembers}</div>
                )}
                {plan.limits.maxStorage && (
                  <div>Storage: {plan.limits.maxStorage} GB</div>
                )}
                {plan.limits.maxGuests && (
                  <div>Max Guests: {plan.limits.maxGuests}</div>
                )}
              </div>
            </div>
          )}

          {/* Manage Button */}
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setIsEditorOpen(true)}
          >
            Manage Plan
          </Button>
        </CardContent>
      </Card>

      {/* Plan Editor Sheet */}
      <PlanEditorSheet
        plan={plan}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onSuccess={onUpdate}
      />
    </>
  );
}

