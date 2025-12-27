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
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import Image from "next/image";

type WelcomeEmailPreviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    ownerName: string;
    ownerEmail: string;
    yachtName: string;
    planName: string;
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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (formData.logoFile) {
      const url = URL.createObjectURL(formData.logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreview(null);
    }
  }, [formData.logoFile]);

  const subject = `Invitation to manage ${formData.yachtName} on HelmOps`;
  const isTurkish = formData.languagePreference === "tr";

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
          <div className="border rounded-lg bg-white shadow-sm">
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

            {/* Email Body */}
            <div className="p-6 space-y-6">
              {/* Logo */}
              <div className="flex justify-center">
                {logoPreview ? (
                  <div className="relative w-32 h-16">
                    <Image
                      src={logoPreview}
                      alt={`${formData.yachtName} Logo`}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                    Yacht Logo
                  </div>
                )}
              </div>

              {/* Greeting */}
              <div className="space-y-4">
                <p className="text-base">
                  {isTurkish ? "Sayın" : "Dear"} <strong>{formData.ownerName}</strong>,
                </p>

                <p className="text-base leading-relaxed">
                  {isTurkish ? (
                    <>
                      <strong>{formData.yachtName}</strong> için çalışma alanınız{" "}
                      <strong>{formData.planName}</strong> aboneliği ile hazırlandı.
                    </>
                  ) : (
                    <>
                      Your workspace for <strong>{formData.yachtName}</strong> has been prepared with the{" "}
                      <strong>{formData.planName}</strong> subscription.
                    </>
                  )}
                </p>

                <p className="text-base leading-relaxed">
                  {isTurkish
                    ? "Aşağıdaki butona tıklayarak güvenli şifrenizi belirleyebilir ve kontrol panelinize erişebilirsiniz."
                    : "Click below to set your secure password and access your dashboard."}
                </p>
              </div>

              {/* CTA Button */}
              <div className="flex justify-center pt-4">
                <div className="inline-block">
                  <div className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-center cursor-pointer hover:bg-primary/90 transition-colors">
                    {isTurkish ? "Kontrol Paneline Eriş" : "Access Dashboard"}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t text-sm text-muted-foreground text-center">
                <p>
                  {isTurkish
                    ? "Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın."
                    : "This email was sent automatically. Please do not reply."}
                </p>
                <p className="mt-2">© HelmOps - Yacht Management Platform</p>
              </div>
            </div>
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

