"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";

type WelcomeEmailPreviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    ownerName: string;
    ownerEmail: string;
    yachtName: string;
    planName: string;
    planId?: string;
    logoFile: File | null;
    languagePreference: "tr" | "en";
  };
  onConfirm: () => void;
  isSubmitting?: boolean;
};

export function WelcomeEmailPreviewDialog({
  open,
  onOpenChange,
  formData,
  onConfirm,
  isSubmitting = false,
}: WelcomeEmailPreviewProps) {
  const [emailHtml, setEmailHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (formData.logoFile) {
      const url = URL.createObjectURL(formData.logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreview(null);
    }
  }, [formData.logoFile]);

  useEffect(() => {
    if (open && formData.planId) {
      loadPlanFeatures();
    }
  }, [open, formData.planId]);

  useEffect(() => {
    if (open) {
      generateEmailPreview();
    }
  }, [open, formData, planFeatures, logoPreview]);

  const loadPlanFeatures = async () => {
    if (!formData.planId) return;
    try {
      const res = await fetch("/api/admin/plans", { cache: "no-store" });
      if (res.ok) {
        const plans = await res.json();
        const plan = Array.isArray(plans) ? plans.find((p: any) => p.id === formData.planId) : null;
        if (plan?.features) {
          setPlanFeatures(Array.isArray(plan.features) ? plan.features : []);
        }
      }
    } catch (error) {
      console.error("Failed to load plan features:", error);
    }
  };

  const generateEmailPreview = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/preview-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yachtName: formData.yachtName,
          ownerName: formData.ownerName,
          planName: formData.planName,
          planId: formData.planId,
          languagePreference: formData.languagePreference,
          logoUrl: logoPreview,
          planFeatures: planFeatures,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate preview");
      }

      const data = await response.json();
      setEmailHtml(data.html);
    } catch (error) {
      console.error("Failed to generate email preview:", error);
    } finally {
      setLoading(false);
    }
  };

  const subject = formData.languagePreference === "tr"
    ? `Hoş Geldiniz - ${formData.yachtName} için ${formData.planName} Aboneliği Hazır`
    : `Welcome - ${formData.planName} Subscription Ready for ${formData.yachtName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Welcome Email</DialogTitle>
          <DialogDescription>
            Preview the invitation email that will be sent to {formData.ownerEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Email Preview Container */}
          <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
            {/* Email Header */}
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
                <span className="font-medium">{subject}</span>
              </div>
            </div>

            {/* Email Body - Real HTML from getModernWelcomeEmailHtml */}
            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : emailHtml ? (
              <iframe
                title="Welcome email preview"
                className="w-full bg-white"
                style={{ height: "70vh", border: 0 }}
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={emailHtml}
              />
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                Failed to load email preview
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Edit
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm & Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

