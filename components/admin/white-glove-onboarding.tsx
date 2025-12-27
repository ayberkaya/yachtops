"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CountrySelect } from "@/components/ui/country-select";
import { Loader2, CloudUpload, Check } from "lucide-react";
import { onboardNewCustomer } from "@/actions/onboard-customer";
import { OnboardingSuccessModal } from "./onboarding-success-modal";
import { WelcomeEmailPreviewDialog } from "./welcome-email-preview-dialog";
import { Separator } from "@/components/ui/separator";

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  features?: string[];
};

const onboardingSchema = z.object({
  // Owner Details
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Valid email is required"),
  ownerPhone: z.string().optional(),
  languagePreference: z.enum(["tr", "en"]).default("en"),
  
  // Vessel Details
  yachtName: z.string().min(1, "Yacht name is required"),
  yachtType: z.enum(["Motor Yacht", "Sailing Yacht", "Catamaran", "Gulet", "Other"]).default("Motor Yacht"),
  yachtLength: z.string().optional(),
  yachtFlag: z.string().optional(),
  
  // Vessel Branding & Locale
  logoFile: z.instanceof(File).optional().nullable(),
  baseCurrency: z.enum(["EUR", "USD", "GBP", "TRY"]).default("EUR"),
  measurementSystem: z.enum(["metric", "imperial"]).default("metric"),
  
  // Subscription & Billing
  planId: z.string().min(1, "Plan is required"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  activateImmediately: z.boolean().default(true),
  trialDays: z.string().default("0"),
  
  // Legal & Contract
  contractFile: z.instanceof(File).optional().nullable(),
  internalNotes: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export function WhiteGloveOnboarding() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
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

  // Handle form validation and show preview
  const onFormSubmit = (data: OnboardingFormData) => {
    // Validate form
    if (!data.ownerName || !data.ownerEmail || !data.yachtName || !data.planId) {
      return;
    }
    // Show preview dialog instead of submitting directly
    setShowPreview(true);
  };

  // Handle actual submission from preview dialog
  const handleConfirmSubmit = async () => {
    const data = formValues;
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
      formData.append("planId", data.planId);
      formData.append("billingCycle", data.billingCycle);
      formData.append("activateImmediately", data.activateImmediately ? "true" : "false");
      formData.append("trialDays", data.trialDays);
      formData.append("internalNotes", data.internalNotes || "");
      formData.append("previewMode", previewMode ? "true" : "false");

      if (data.logoFile) {
        formData.append("logoFile", data.logoFile);
      }
      if (data.contractFile) {
        formData.append("contractFile", data.contractFile);
      }

      const result = await onboardNewCustomer(formData);

      if (result.success) {
        setShowPreview(false);
        if (previewMode) {
          // Preview mode - just show success message, no user created
          alert(result.message || "✅ Test email sent successfully! No user was created.");
        } else if (result.data) {
          // Normal mode - show success modal with user data
          setSuccessData({
            yachtId: result.data.yachtId,
            ownerId: result.data.ownerId,
            ownerEmail: data.ownerEmail,
            yachtName: data.yachtName,
          });
        }
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

  // Get selected plan
  const selectedPlan = plans.find((p) => p.id === formValues.planId);

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
        {/* Main Form - Single Unified Section */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>
              Enter owner details, vessel information, branding settings, and legal documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Owner Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Owner Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ownerName">Full Name *</Label>
                    <Input
                      id="ownerName"
                      {...register("ownerName")}
                      placeholder="Enter owner's full name"
                      className="mt-1"
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
                      className="mt-1"
                    />
                    {errors.ownerEmail && (
                      <p className="text-xs text-destructive mt-1">{errors.ownerEmail.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="ownerPhone">Phone Number</Label>
                    <Input
                      id="ownerPhone"
                      type="tel"
                      {...register("ownerPhone")}
                      placeholder="+90 555 123 4567"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="languagePreference">Language Preference</Label>
                    <Select
                      value={formValues.languagePreference}
                      onValueChange={(value: "tr" | "en") => setValue("languagePreference", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="tr">Turkish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Vessel Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Vessel Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="yachtName">Yacht Name *</Label>
                    <Input
                      id="yachtName"
                      {...register("yachtName")}
                      placeholder="Enter yacht name"
                      className="mt-1"
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
                      <SelectTrigger className="mt-1">
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
                  <div>
                    <Label htmlFor="yachtLength">Length (Meters)</Label>
                    <Input
                      id="yachtLength"
                      type="number"
                      step="0.1"
                      {...register("yachtLength")}
                      placeholder="e.g. 45.5"
                      className="mt-1"
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
              </div>

              <Separator />

              {/* Vessel Branding & Locale */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Branding & Locale</h3>
                <div className="space-y-4">
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
                        <SelectTrigger className="mt-1">
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
                        className="mt-2 flex gap-6"
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription & Billing - Separate Section */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Subscription & Billing</CardTitle>
            <CardDescription>
              Configure the subscription plan and billing settings
            </CardDescription>
          </CardHeader>
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
                
                {/* Plan Features Display */}
                {formValues.planId && (() => {
                  const selectedPlan = plans.find((p) => p.id === formValues.planId);
                  const planFeatures = selectedPlan?.features || [];
                  return planFeatures.length > 0 ? (
                    <div className="mt-4 p-4 bg-background rounded-lg border">
                      <p className="text-sm font-medium mb-2">
                        {selectedPlan?.name} - Included Features:
                      </p>
                      <ul className="space-y-1.5">
                        {planFeatures.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null;
                })()}
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
              <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
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

              {/* Preview Mode Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 border-amber-200">
                <div className="space-y-0.5">
                  <Label htmlFor="previewMode" className="text-base font-medium cursor-pointer">
                    Test Mode (Preview Only)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this to send a test email without creating a user account. Perfect for testing email design.
                  </p>
                </div>
                <Switch
                  id="previewMode"
                  checked={previewMode}
                  onCheckedChange={setPreviewMode}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
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
                Processing...
              </>
            ) : (
              "Review & Invite"
            )}
          </Button>
        </div>
      </form>

      {/* Welcome Email Preview Dialog */}
      <WelcomeEmailPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        formData={{
          ownerName: formValues.ownerName,
          ownerEmail: formValues.ownerEmail,
          yachtName: formValues.yachtName,
          planName: selectedPlan?.name || "",
          planId: formValues.planId,
          logoFile: formValues.logoFile,
          languagePreference: formValues.languagePreference,
        }}
        onConfirm={handleConfirmSubmit}
        isSubmitting={submitting}
      />

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
