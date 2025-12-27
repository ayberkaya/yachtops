"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

type NewSubscriptionForm = {
  ownerName: string;
  ownerEmail: string;
  yachtName: string;
  planId: string;
  paymentMode: "manual" | "payment_link";
};

type NewSubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function NewSubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewSubscriptionDialogProps) {
  const [form, setForm] = useState<NewSubscriptionForm>({
    ownerName: "",
    ownerEmail: "",
    yachtName: "",
    planId: "",
    paymentMode: "manual",
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadPlans();
    }
  }, [open]);

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch("/api/admin/plans", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load plans");
      const data = await res.json();
      setPlans(data || []);
    } catch (e) {
      console.error("Error loading plans:", e);
      setError("Failed to load plans. Please refresh and try again.");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.ownerName || !form.ownerEmail || !form.yachtName || !form.planId) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          yachtName: form.yachtName,
          planId: form.planId,
          paymentMode: form.paymentMode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create subscription");
      }

      // Reset form
      setForm({
        ownerName: "",
        ownerEmail: "",
        yachtName: "",
        planId: "",
        paymentMode: "manual",
      });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      console.error("Error creating subscription:", e);
      setError(e.message || "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🚀 Onboard New Yacht</DialogTitle>
          <DialogDescription>
            Create a new owner account, yacht (tenant), and subscription in one step.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Owner Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Owner Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ownerName">Full Name *</Label>
                <Input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ownerName: e.target.value }))
                  }
                  placeholder="Enter owner's full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ownerEmail">Email *</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ownerEmail: e.target.value }))
                  }
                  placeholder="owner@example.com"
                  required
                />
              </div>
            </div>
          </div>

          {/* Vessel Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Vessel Details</h3>
            <div>
              <Label htmlFor="yachtName">Yacht Name *</Label>
              <Input
                id="yachtName"
                value={form.yachtName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, yachtName: e.target.value }))
                }
                placeholder="Enter yacht name"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will create the tenant (yacht) account.
              </p>
            </div>
          </div>

          {/* Plan Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Plan Selection</h3>
            {loadingPlans ? (
              <p className="text-sm text-muted-foreground">Loading plans...</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No plans available. Please contact support.
              </p>
            ) : (
              <Select
                value={form.planId}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, planId: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} -{" "}
                      {plan.price === 0
                        ? "Custom"
                        : new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: plan.currency,
                            minimumFractionDigits: 0,
                          }).format(plan.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Payment Mode */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Payment Mode</h3>
            <RadioGroup
              value={form.paymentMode}
              onValueChange={(value: "manual" | "payment_link") =>
                setForm((f) => ({ ...f, paymentMode: value }))
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="cursor-pointer">
                  Manual / Wire Transfer
                  <span className="text-xs text-muted-foreground block">
                    Sets subscription status to ACTIVE immediately
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="payment_link" id="payment_link" />
                <Label htmlFor="payment_link" className="cursor-pointer">
                  Send Payment Link
                  <span className="text-xs text-muted-foreground block">
                    Sets subscription status to PENDING/INCOMPLETE
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loadingPlans}>
              {submitting ? "Creating..." : "Create Subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

