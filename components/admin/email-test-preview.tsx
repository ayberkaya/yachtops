"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getModernWelcomeEmailHtml } from "@/utils/mail";
import { Loader2, Mail, Eye } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  features?: string[];
};

export function EmailTestPreview() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [emailHtml, setEmailHtml] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ownerName: "John Doe",
    ownerEmail: "test@example.com",
    yachtName: "Test Yacht",
    planId: "",
    languagePreference: "en" as "tr" | "en",
  });

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
      if (data && data.length > 0 && !formData.planId) {
        setFormData((f) => ({ ...f, planId: data[0].id }));
      }
    } catch (e) {
      console.error("Error loading plans:", e);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!formData.planId) {
      alert("Please select a plan");
      return;
    }

    setGenerating(true);
    try {
      // Get plan details
      const plan = plans.find((p) => p.id === formData.planId);
      const planName = plan?.name || "Essentials";
      const planFeatures = plan?.features || [];

      // Generate mock verification link
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const mockToken = "mock_verification_token_for_preview_only";
      const verificationLink = `${appUrl}/verify-email?token=${mockToken}`;

      // Generate email HTML
      const html = await getModernWelcomeEmailHtml(
        formData.yachtName,
        formData.ownerName,
        planName,
        verificationLink,
        null, // No logo
        formData.languagePreference,
        "support@helmops.com",
        planFeatures
      );

      setEmailHtml(html);
    } catch (error) {
      console.error("Error generating preview:", error);
      alert("Failed to generate email preview");
    } finally {
      setGenerating(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === formData.planId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Preview Settings</CardTitle>
          <CardDescription>
            Configure the email content to preview. No actual user will be created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner Name</Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Owner Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                placeholder="test@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yachtName">Yacht Name</Label>
            <Input
              id="yachtName"
              value={formData.yachtName}
              onChange={(e) => setFormData({ ...formData, yachtName: e.target.value })}
              placeholder="Test Yacht"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planId">Plan</Label>
              <Select
                value={formData.planId}
                onValueChange={(value) => setFormData({ ...formData, planId: value })}
                disabled={loadingPlans}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <RadioGroup
                value={formData.languagePreference}
                onValueChange={(value) =>
                  setFormData({ ...formData, languagePreference: value as "tr" | "en" })
                }
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="en" id="lang-en" />
                  <Label htmlFor="lang-en" className="cursor-pointer">
                    English
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tr" id="lang-tr" />
                  <Label htmlFor="lang-tr" className="cursor-pointer">
                    Türkçe
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Button onClick={handleGeneratePreview} disabled={generating || !formData.planId} className="w-full">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Preview...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Generate Email Preview
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {emailHtml && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview
            </CardTitle>
            <CardDescription>
              This is how the email will look when sent to customers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg bg-white overflow-hidden">
              <div className="border-b p-4 bg-slate-50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>From: HelmOps Team &lt;noreply@helmops.com&gt;</span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">To: </span>
                  <span className="font-medium">{formData.ownerEmail}</span>
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">Subject: </span>
                  <span className="font-medium">
                    Welcome - {selectedPlan?.name || "Plan"} Subscription Ready for {formData.yachtName}
                  </span>
                </div>
              </div>
              <iframe
                title="Email preview"
                className="w-full bg-white"
                style={{ height: "70vh", border: 0 }}
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={emailHtml}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

