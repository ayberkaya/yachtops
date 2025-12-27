"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CountrySelect } from "@/components/ui/country-select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, ChevronDown, CloudUpload, FileText } from "lucide-react";
import { onboardNewCustomer } from "@/actions/onboard-customer";
import { OnboardingSuccessModal } from "./onboarding-success-modal";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

const onboardingSchema = z.object({
  // Section 1: Owner Details
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Valid email is required"),
  ownerPhone: z.string().optional(),
  languagePreference: z.enum(["tr", "en"]).default("en"),
  
  // Section 2: Vessel Details
  yachtName: z.string().min(1, "Yacht name is required"),
  yachtType: z.enum(["Motor Yacht", "Sailing Yacht", "Catamaran", "Gulet", "Other"]).default("Motor Yacht"),
  yachtLength: z.string().optional(),
  yachtFlag: z.string().optional(),
  
  // Section 3: Vessel Branding & Locale
  logoFile: z.instanceof(File).optional().nullable(),
  baseCurrency: z.enum(["EUR", "USD", "GBP", "TRY"]).default("EUR"),
  measurementSystem: z.enum(["metric", "imperial"]).default("metric"),
  
  // Section 4: Module Configuration
  inventoryManagement: z.boolean().default(true),
  financeBudgeting: z.boolean().default(true),
  charterManagement: z.boolean().default(false),
  crewScheduling: z.boolean().default(true),
  
  // Section 5: Subscription & Billing
  planId: z.string().min(1, "Plan is required"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  activateImmediately: z.boolean().default(true),
  trialDays: z.string().default("0"),
  
  // Section 6: Legal & Contract
  contractFile: z.instanceof(File).optional().nullable(),
  internalNotes: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export function WhiteGloveOnboarding() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    yachtId: string;
    ownerId: string;
    ownerEmail: string;
    yachtName: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      languagePreference: "en",
      yachtType: "Motor Yacht",
      baseCurrency: "EUR",
      measurementSystem: "metric",
      inventoryManagement: true,
      financeBudgeting: true,
      charterManagement: false,
      crewScheduling: true,
      billingCycle: "monthly",
      activateImmediately: true,
      trialDays: "0",
    },
  });

  const formValues = watch();

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
      if (data && data.length > 0 && !formValues.planId) {
        setValue("planId", data[0].id);
      }
    } catch (e) {
      console.error("Error loading plans:", e);
    } finally {
      setLoadingPlans(false);
    }
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("ownerName", data.ownerName.trim());
      formData.append("ownerEmail", data.ownerEmail.trim());
      formData.append("ownerPhone", data.ownerPhone || "");
      formData.append("languagePreference", data.languagePreference);
      formData.append("yachtName", data.yachtName.trim());
      formData.append("yachtType", data.yachtType);
      formData.append("yachtLength", data.yachtLength || "");
      formData.append("yachtFlag", data.yachtFlag || "");
      formData.append("baseCurrency", data.baseCurrency);
      formData.append("measurementSystem", data.measurementSystem);
      formData.append("inventoryManagement", data.inventoryManagement ? "true" : "false");
      formData.append("financeBudgeting", data.financeBudgeting ? "true" : "false");
      formData.append("charterManagement", data.charterManagement ? "true" : "false");
      formData.append("crewScheduling", data.crewScheduling ? "true" : "false");
      formData.append("planId", data.planId);
      formData.append("billingCycle", data.billingCycle);
      formData.append("activateImmediately", data.activateImmediately ? "true" : "false");
      formData.append("trialDays", data.trialDays);
      formData.append("internalNotes", data.internalNotes || "");

      if (data.logoFile) {
        formData.append("logoFile", data.logoFile);
      }
      if (data.contractFile) {
        formData.append("contractFile", data.contractFile);
      }

      const result = await onboardNewCustomer(formData);

      if (result.success && result.data) {
        setSuccessData({
          yachtId: result.data.yachtId,
          ownerId: result.data.ownerId,
          ownerEmail: data.ownerEmail,
          yachtName: data.yachtName,
        });
      } else {
        throw new Error(result.message || "Failed to onboard customer");
      }
    } catch (e: any) {
      console.error("Error onboarding customer:", e);
      alert(e.message || "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate summary for sidebar
  const summary = {
    owner: formValues.ownerName || "Not set",
    email: formValues.ownerEmail || "Not set",
    yacht: formValues.yachtName || "Not set",
    plan: plans.find((p) => p.id === formValues.planId)?.name || "Not selected",
    status: formValues.activateImmediately ? "ACTIVE" : "PENDING",
    currency: formValues.baseCurrency || "EUR",
    modules: [
      formValues.inventoryManagement && "Inventory",
      formValues.financeBudgeting && "Finance",
      formValues.charterManagement && "Charter",
      formValues.crewScheduling && "Crew",
    ].filter(Boolean).length,
  };

  return (
    <div className="flex gap-6">
      {/* Main Form - Left Side */}
      <div className="flex-1 space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Owner Details - Collapsible */}
          <Collapsible defaultOpen={true}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>1. Owner Details (Identity)</CardTitle>
                      <CardDescription>Primary contact information for the yacht owner</CardDescription>
                    </div>
                    <ChevronDown className="h-5 w-5 transition-transform data-[state=open]:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ownerName">Full Name *</Label>
                      <Input
                        id="ownerName"
                        {...register("ownerName")}
                        placeholder="Enter owner's full name"
                      />
                      {errors.ownerName && (
                        <p className="text-xs text-destructive mt-1">{errors.ownerName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="ownerEmail">Email *</Label>
                      <Input
                        id="ownerEmail"
                        type="email"
                        {...register("ownerEmail")}
                        placeholder="owner@example.com"
                      />
                      {errors.ownerEmail && (
                        <p className="text-xs text-destructive mt-1">{errors.ownerEmail.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ownerPhone">Phone Number</Label>
                      <Input
                        id="ownerPhone"
                        type="tel"
                        {...register("ownerPhone")}
                        placeholder="+90 555 123 4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="languagePreference">Language Preference</Label>
                      <Select
                        value={formValues.languagePreference}
                        onValueChange={(value: "tr" | "en") => setValue("languagePreference", value)}
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
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Section 2: Vessel Details - Collapsible */}
          <Collapsible defaultOpen={true}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>2. Vessel Details (The Tenant)</CardTitle>
                      <CardDescription>Information about the yacht being onboarded</CardDescription>
                    </div>
                    <ChevronDown className="h-5 w-5 transition-transform data-[state=open]:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="yachtName">Yacht Name *</Label>
                      <Input
                        id="yachtName"
                        {...register("yachtName")}
                        placeholder="Enter yacht name"
                      />
                      {errors.yachtName && (
                        <p className="text-xs text-destructive mt-1">{errors.yachtName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="yachtType">Yacht Type</Label>
                      <Select
                        value={formValues.yachtType}
                        onValueChange={(value: OnboardingFormData["yachtType"]) =>
                          setValue("yachtType", value)
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
                        {...register("yachtLength")}
                        placeholder="e.g. 45.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="yachtFlag">Flag</Label>
                      <CountrySelect
                        value={formValues.yachtFlag || ""}
                        onChange={(value) => setValue("yachtFlag", value)}
                        placeholder="Select country flag"
                      />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Section 3: Vessel Branding & Locale - Collapsible */}
          <Collapsible defaultOpen={true}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>3. Vessel Branding & Locale</CardTitle>
                      <CardDescription>Configure branding and regional settings</CardDescription>
                    </div>
                    <ChevronDown className="h-5 w-5 transition-transform data-[state=open]:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="logoFile">Yacht Logo</Label>
                    <div className="mt-2">
                      <Input
                        id="logoFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setValue("logoFile", file);
                        }}
                        className="hidden"
                      />
                      <Label
                        htmlFor="logoFile"
                        className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <CloudUpload className="h-5 w-5" />
                        <span className="text-sm">
                          {formValues.logoFile ? formValues.logoFile.name : "Click to upload logo (PNG, JPG)"}
                        </span>
                      </Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="baseCurrency">Base Currency</Label>
                      <Select
                        value={formValues.baseCurrency}
                        onValueChange={(value: "EUR" | "USD" | "GBP" | "TRY") =>
                          setValue("baseCurrency", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                          <SelectItem value="USD">USD (US Dollar)</SelectItem>
                          <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                          <SelectItem value="TRY">TRY (Turkish Lira)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="measurementSystem">Measurement System</Label>
                      <RadioGroup
                        value={formValues.measurementSystem}
                        onValueChange={(value: "metric" | "imperial") =>
                          setValue("measurementSystem", value)
                        }
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="metric" id="metric" />
                          <Label htmlFor="metric" className="cursor-pointer">Metric</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="imperial" id="imperial" />
                          <Label htmlFor="imperial" className="cursor-pointer">Imperial</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Section 4: Module Configuration - Collapsible */}
          <Collapsible defaultOpen={true}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>4. Module Configuration (Feature Flags)</CardTitle>
                      <CardDescription>Enable or disable specific modules for this tenant</CardDescription>
                    </div>
                    <ChevronDown className="h-5 w-5 transition-transform data-[state=open]:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label htmlFor="inventoryManagement" className="font-medium">Inventory Management</Label>
                        <p className="text-xs text-muted-foreground mt-1">Track provisions and supplies</p>
                      </div>
                      <Switch
                        id="inventoryManagement"
                        checked={formValues.inventoryManagement}
                        onCheckedChange={(checked) => setValue("inventoryManagement", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label htmlFor="financeBudgeting" className="font-medium">Finance & Budgeting</Label>
                        <p className="text-xs text-muted-foreground mt-1">Expense tracking and budgets</p>
                      </div>
                      <Switch
                        id="financeBudgeting"
                        checked={formValues.financeBudgeting}
                        onCheckedChange={(checked) => setValue("financeBudgeting", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label htmlFor="charterManagement" className="font-medium">Charter Management</Label>
                        <p className="text-xs text-muted-foreground mt-1">Charter booking and operations</p>
                      </div>
                      <Switch
                        id="charterManagement"
                        checked={formValues.charterManagement}
                        onCheckedChange={(checked) => setValue("charterManagement", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label htmlFor="crewScheduling" className="font-medium">Crew Scheduling</Label>
                        <p className="text-xs text-muted-foreground mt-1">Shifts and leave management</p>
                      </div>
                      <Switch
                        id="crewScheduling"
                        checked={formValues.crewScheduling}
                        onCheckedChange={(checked) => setValue("crewScheduling", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Section 5: Subscription & Billing - Collapsible */}
          <Collapsible defaultOpen={true}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>5. Subscription & Billing (The Contract)</CardTitle>
                      <CardDescription>Configure the subscription plan and billing settings</CardDescription>
                    </div>
                    <ChevronDown className="h-5 w-5 transition-transform data-[state=open]:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="planId">Plan Selection *</Label>
                      {loadingPlans ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading plans...
                        </div>
                      ) : plans.length === 0 ? (
                        <p className="text-sm text-muted-foreground mt-2">No plans available</p>
                      ) : (
                        <Select
                          value={formValues.planId}
                          onValueChange={(value) => setValue("planId", value)}
                        >
                          <SelectTrigger className="mt-2">
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
                      {errors.planId && (
                        <p className="text-xs text-destructive mt-1">{errors.planId.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="billingCycle">Billing Cycle</Label>
                      <Select
                        value={formValues.billingCycle}
                        onValueChange={(value: "monthly" | "yearly") =>
                          setValue("billingCycle", value)
                        }
                      >
                        <SelectTrigger className="mt-2">
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
                        checked={formValues.activateImmediately}
                        onCheckedChange={(checked) => setValue("activateImmediately", checked)}
                      />
                    </div>

                    {!formValues.activateImmediately && (
                      <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                        <p className="text-sm font-medium">
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
                        {...register("trialDays")}
                        placeholder="e.g. 30 for 30 days free trial"
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter number of days for free trial (0 = no trial)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Section 6: Legal & Contract - Collapsible */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>6. Legal & Contract</CardTitle>
                      <CardDescription>Contract documents and internal notes</CardDescription>
                    </div>
                    <ChevronDown className="h-5 w-5 transition-transform data-[state=open]:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="contractFile">Contract Upload (PDF)</Label>
                    <div className="mt-2">
                      <Input
                        id="contractFile"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setValue("contractFile", file);
                        }}
                        className="hidden"
                      />
                      <Label
                        htmlFor="contractFile"
                        className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-5 w-5" />
                        <span className="text-sm">
                          {formValues.contractFile ? formValues.contractFile.name : "Click to upload signed contract (PDF)"}
                        </span>
                      </Label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="internalNotes">Internal Sales Notes</Label>
                    <Textarea
                      id="internalNotes"
                      {...register("internalNotes")}
                      placeholder="e.g., Friend of the CEO, gave 20% discount"
                      className="mt-2"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="flex items-center justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loadingPlans || !formValues.planId}>
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
      </div>

      {/* Sticky Sidebar - Summary & Preview */}
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary & Preview</CardTitle>
              <CardDescription>Review the deal being configured</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-medium">{summary.owner}</p>
                  <p className="text-xs text-muted-foreground">{summary.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Yacht</p>
                  <p className="font-medium">{summary.yacht}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-medium">{summary.plan}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{summary.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Currency</p>
                  <p className="font-medium">{summary.currency}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Enabled Modules</p>
                  <p className="font-medium">{summary.modules} modules</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      {successData && (
        <OnboardingSuccessModal
          open={!!successData}
          onOpenChange={(open) => {
            if (!open) setSuccessData(null);
          }}
          yachtId={successData.yachtId}
          ownerId={successData.ownerId}
          ownerEmail={successData.ownerEmail}
          yachtName={successData.yachtName}
        />
      )}
    </div>
  );
}

