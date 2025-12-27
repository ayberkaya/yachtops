"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { updatePlanAction } from "@/actions/update-plan";
import { Plan } from "./plan-card";

// Form input type (all strings for form inputs)
type PlanFormInput = {
  name: string;
  description?: string;
  monthly_price: string;
  yearly_price: string;
  currency: "EUR" | "USD" | "GBP" | "TRY";
  isPopular: boolean;
  isPubliclyVisible: boolean;
  tier: string;
  maxCrewMembers: string;
  maxStorage: string;
  maxGuests: string;
  features: string[];
};

// Transformed type (after validation)
type PlanFormData = {
  name: string;
  description?: string;
  monthly_price: number | null;
  yearly_price: number | null;
  currency: "EUR" | "USD" | "GBP" | "TRY";
  isPopular: boolean;
  isPubliclyVisible: boolean;
  tier: number;
  maxCrewMembers: number | null;
  maxStorage: number | null;
  maxGuests: number | null;
  features: string[];
};

interface PlanEditorSheetProps {
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PlanEditorSheet({
  plan,
  open,
  onOpenChange,
  onSuccess,
}: PlanEditorSheetProps) {
  const [features, setFeatures] = useState<string[]>(plan.features || []);
  const [newFeature, setNewFeature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PlanFormInput>({
    defaultValues: {
      name: plan.name,
      description: plan.description || "",
      monthly_price: plan.monthly_price?.toString() || plan.price?.toString() || "",
      yearly_price: plan.yearly_price?.toString() || "",
      currency: (plan.currency as "EUR" | "USD" | "GBP" | "TRY") || "EUR",
      isPopular: plan.isPopular || false,
      isPubliclyVisible: true, // Default to true
      tier: plan.tier?.toString() || "0",
      maxCrewMembers: plan.limits?.maxCrewMembers?.toString() || "",
      maxStorage: plan.limits?.maxStorage?.toString() || "",
      maxGuests: plan.limits?.maxGuests?.toString() || "",
      features: plan.features || [],
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: plan.name,
        description: plan.description || "",
        monthly_price: plan.monthly_price?.toString() || plan.price?.toString() || "",
        yearly_price: plan.yearly_price?.toString() || "",
        currency: (plan.currency as "EUR" | "USD" | "GBP" | "TRY") || "EUR",
        isPopular: plan.isPopular || false,
        isPubliclyVisible: true,
        tier: plan.tier?.toString() || "0",
        maxCrewMembers: plan.limits?.maxCrewMembers?.toString() || "",
        maxStorage: plan.limits?.maxStorage?.toString() || "",
        maxGuests: plan.limits?.maxGuests?.toString() || "",
        features: plan.features || [],
      });
      setFeatures(plan.features || []);
    }
  }, [open, plan, reset]);

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PlanFormInput) => {
    setError(null);
    setSubmitting(true);

    try {
      // Transform string inputs to numbers
      const monthlyPrice = data.monthly_price ? parseFloat(data.monthly_price) : null;
      const yearlyPrice = data.yearly_price ? parseFloat(data.yearly_price) : null;
      const tier = parseInt(data.tier, 10) || 0;
      const maxCrewMembers = data.maxCrewMembers ? parseInt(data.maxCrewMembers, 10) : null;
      const maxStorage = data.maxStorage ? parseInt(data.maxStorage, 10) : null;
      const maxGuests = data.maxGuests ? parseInt(data.maxGuests, 10) : null;

      const formData = new FormData();
      formData.append("planId", plan.id);
      formData.append("name", data.name);
      formData.append("description", data.description || "");
      formData.append("monthly_price", monthlyPrice?.toString() || "");
      formData.append("yearly_price", yearlyPrice?.toString() || "");
      formData.append("currency", data.currency);
      formData.append("isPopular", data.isPopular ? "true" : "false");
      formData.append("isPubliclyVisible", data.isPubliclyVisible ? "true" : "false");
      formData.append("tier", tier.toString());
      formData.append("maxCrewMembers", maxCrewMembers?.toString() || "");
      formData.append("maxStorage", maxStorage?.toString() || "");
      formData.append("maxGuests", maxGuests?.toString() || "");
      
      // Append features as JSON
      formData.append("features", JSON.stringify(features));

      const result = await updatePlanAction(formData);

      if (result.success) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        setError(result.message || "Failed to update plan");
      }
    } catch (e: any) {
      console.error("Error updating plan:", e);
      setError(e.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Plan: {plan.name}</SheetTitle>
          <SheetDescription>
            Configure plan details, features, and limits
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              <div>
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  className="mt-2"
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  className="mt-2"
                  rows={3}
                  placeholder="Brief description of the plan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthly_price">Monthly Price</Label>
                  <Input
                    id="monthly_price"
                    type="number"
                    step="0.01"
                    {...register("monthly_price")}
                    className="mt-2"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="yearly_price">Yearly Price</Label>
                  <Input
                    id="yearly_price"
                    type="number"
                    step="0.01"
                    {...register("yearly_price")}
                    className="mt-2"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  {...register("currency")}
                  className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="TRY">TRY (Turkish Lira)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="tier">Tier (Sort Order)</Label>
                <Input
                  id="tier"
                  type="number"
                  {...register("tier")}
                  className="mt-2"
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower numbers appear first. Use 1, 2, 3 for visual ordering.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPopular">Is Popular (Best Seller)</Label>
                    <p className="text-xs text-muted-foreground">
                      Highlight this plan with a "Best Seller" badge
                    </p>
                  </div>
                  <Switch
                    id="isPopular"
                    checked={watch("isPopular")}
                    onCheckedChange={(checked) => setValue("isPopular", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPubliclyVisible">Is Publicly Visible</Label>
                    <p className="text-xs text-muted-foreground">
                      Show this plan on the public pricing page
                    </p>
                  </div>
                  <Switch
                    id="isPubliclyVisible"
                    checked={watch("isPubliclyVisible")}
                    onCheckedChange={(checked) => setValue("isPubliclyVisible", checked)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-4">
              <div>
                <Label>Features List</Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Add feature bullet points that customers will see
                </p>

                <div className="space-y-2 mb-4">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded-lg"
                    >
                      <span className="flex-1 text-sm">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeature(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                    placeholder="Add a feature..."
                  />
                  <Button type="button" onClick={addFeature}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Limits Tab */}
            <TabsContent value="limits" className="space-y-4">
              <div>
                <Label>Plan Limits</Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Set maximum values for this plan
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxCrewMembers">Max Crew Members</Label>
                    <Input
                      id="maxCrewMembers"
                      type="number"
                      {...register("maxCrewMembers")}
                      className="mt-2"
                      placeholder="e.g. 10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxStorage">Storage Limit (GB)</Label>
                    <Input
                      id="maxStorage"
                      type="number"
                      {...register("maxStorage")}
                      className="mt-2"
                      placeholder="e.g. 100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxGuests">Max Guests</Label>
                    <Input
                      id="maxGuests"
                      type="number"
                      {...register("maxGuests")}
                      className="mt-2"
                      placeholder="e.g. 20"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

