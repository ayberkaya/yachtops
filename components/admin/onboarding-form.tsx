"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { CountrySelect } from "@/components/ui/country-select";
import { Loader2 } from "lucide-react";
import { onboardNewCustomer } from "@/actions/onboard-customer";

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

type OnboardingFormData = {
  // Section 1: Owner Details
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  role: "Owner" | "Captain" | "Yacht Manager" | "Chief Stew" | "Purser";
  languagePreference: "tr" | "en";
  
  // Section 2: Vessel Details
  yachtName: string;
  yachtType: "Motor Yacht" | "Sailing Yacht" | "Catamaran" | "Gulet" | "Other";
  yachtLength: string;
  yachtFlag: string;
  
  // Section 3: Subscription & Billing
  planId: string;
  billingCycle: "monthly" | "yearly";
  activateImmediately: boolean;
  trialDays: string;
};

export function OnboardingForm() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingFormData>({
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    role: "Owner",
    languagePreference: "en",
    yachtName: "",
    yachtType: "Motor Yacht",
    yachtLength: "",
    yachtFlag: "",
    planId: "",
    billingCycle: "monthly",
    activateImmediately: true,
    trialDays: "0",
  });

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch("/api/admin/plans", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load plans");
      const data = await res.json();
      setPlans(data || []);
      // Auto-select first plan if available
      if (data && data.length > 0 && !form.planId) {
        setForm((f) => ({ ...f, planId: data[0].id }));
      }
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

    // Validation
    if (!form.ownerName || !form.ownerEmail || !form.yachtName || !form.planId) {
      setError("Please fill in all required fields (Name, Email, Yacht Name, Plan).");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.ownerEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("ownerName", form.ownerName.trim());
      formData.append("ownerEmail", form.ownerEmail.trim());
      formData.append("ownerPhone", form.ownerPhone.trim());
      formData.append("role", form.role);
      formData.append("languagePreference", form.languagePreference);
      formData.append("yachtName", form.yachtName.trim());
      formData.append("yachtType", form.yachtType);
      formData.append("yachtLength", form.yachtLength.trim());
      formData.append("yachtFlag", form.yachtFlag.trim());
      formData.append("planId", form.planId);
      formData.append("billingCycle", form.billingCycle);
      formData.append("activateImmediately", form.activateImmediately ? "true" : "false");
      formData.append("trialDays", form.trialDays);

      const result = await onboardNewCustomer(formData);

      if (result.success) {
        // Redirect to owners page with success
        router.push("/admin/owners?onboarded=true");
      } else {
        setError(result.message || "Failed to onboard customer. Please try again.");
      }
    } catch (e: any) {
      console.error("Error onboarding customer:", e);
      setError(e.message || "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Owner Details */}
      <Card>
        <CardHeader>
          <CardTitle>1. Owner Details (Identity)</CardTitle>
          <CardDescription>Primary contact information for the yacht owner</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ownerName">Full Name *</Label>
              <Input
                id="ownerName"
                value={form.ownerName}
                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                placeholder="owner@example.com"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ownerPhone">Phone Number</Label>
              <Input
                id="ownerPhone"
                type="tel"
                value={form.ownerPhone}
                onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value }))}
                placeholder="+90 555 123 4567"
              />
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={form.role}
                onValueChange={(value: OnboardingFormData["role"]) =>
                  setForm((f) => ({ ...f, role: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Captain">Captain</SelectItem>
                  <SelectItem value="Yacht Manager">Yacht Manager</SelectItem>
                  <SelectItem value="Chief Stew">Chief Stew</SelectItem>
                  <SelectItem value="Purser">Purser</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="languagePreference">Language Preference</Label>
              <Select
                value={form.languagePreference}
                onValueChange={(value: "tr" | "en") =>
                  setForm((f) => ({ ...f, languagePreference: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Vessel Details */}
      <Card>
        <CardHeader>
          <CardTitle>2. Vessel Details (The Tenant)</CardTitle>
          <CardDescription>Information about the yacht being onboarded</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="yachtName">Yacht Name *</Label>
              <Input
                id="yachtName"
                value={form.yachtName}
                onChange={(e) => setForm((f) => ({ ...f, yachtName: e.target.value }))}
                placeholder="Enter yacht name"
                required
              />
            </div>
            <div>
              <Label htmlFor="yachtType">Yacht Type</Label>
              <Select
                value={form.yachtType}
                onValueChange={(value: OnboardingFormData["yachtType"]) =>
                  setForm((f) => ({ ...f, yachtType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Motor Yacht">Motor Yacht</SelectItem>
                  <SelectItem value="Sailing Yacht">Sailing Yacht</SelectItem>
                  <SelectItem value="Catamaran">Catamaran</SelectItem>
                  <SelectItem value="Gulet">Gulet</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="yachtLength">Length (Meters)</Label>
              <Input
                id="yachtLength"
                type="number"
                step="0.1"
                value={form.yachtLength}
                onChange={(e) => setForm((f) => ({ ...f, yachtLength: e.target.value }))}
                placeholder="e.g. 45.5"
              />
            </div>
            <div>
              <Label htmlFor="yachtFlag">Flag</Label>
              <CountrySelect
                value={form.yachtFlag}
                onChange={(value) => setForm((f) => ({ ...f, yachtFlag: value }))}
                placeholder="Select country flag"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Subscription & Billing */}
      <Card>
        <CardHeader>
          <CardTitle>3. Subscription & Billing (The Contract)</CardTitle>
          <CardDescription>Configure the subscription plan and billing settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="planId">Plan Selection *</Label>
              {loadingPlans ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading plans...
                </div>
              ) : plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans available</p>
              ) : (
                <Select
                  value={form.planId}
                  onValueChange={(value) => setForm((f) => ({ ...f, planId: value }))}
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
            <div>
              <Label htmlFor="billingCycle">Billing Cycle</Label>
              <Select
                value={form.billingCycle}
                onValueChange={(value: "monthly" | "yearly") =>
                  setForm((f) => ({ ...f, billingCycle: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="activateImmediately">Activate Immediately</Label>
                <p className="text-sm text-muted-foreground">
                  Mark subscription as paid and activate immediately
                </p>
              </div>
              <Switch
                id="activateImmediately"
                checked={form.activateImmediately}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, activateImmediately: checked }))
                }
              />
            </div>

            {!form.activateImmediately && (
              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                <p className="text-sm font-medium mb-2">
                  Payment Link Mode: Customer will receive an email to complete payment
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="trialDays">Trial Period (Days)</Label>
              <Input
                id="trialDays"
                type="number"
                min="0"
                value={form.trialDays}
                onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
                placeholder="e.g. 30 for 30 days free trial"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter number of days for free trial (0 = no trial)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || loadingPlans || !form.planId}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Onboarding...
            </>
          ) : (
            "Complete Onboarding"
          )}
        </Button>
      </div>
    </form>
  );
}

