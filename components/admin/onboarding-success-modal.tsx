"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, Users, Key } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type OnboardingSuccessModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yachtId: string;
  ownerId: string;
  ownerEmail: string;
  yachtName: string;
};

export function OnboardingSuccessModal({
  open,
  onOpenChange,
  yachtId,
  ownerId,
  ownerEmail,
  yachtName,
}: OnboardingSuccessModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Generate magic invite link (in a real app, this would be a proper invite token)
  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/join?token=${ownerId}&email=${encodeURIComponent(ownerEmail)}`;

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Magic invite link copied to clipboard",
        variant: "success",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "error",
      });
    }
  };

  const handleGoToOwners = () => {
    onOpenChange(false);
    router.push("/admin/owners");
  };

  const handleImpersonate = async () => {
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: ownerId }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast({
          title: "Impersonation Failed",
          description: error.error || "Failed to switch user session",
          variant: "error",
        });
        return;
      }

      const { signIn } = await import("next-auth/react");
      await signIn("credentials", {
        impersonateToken: ownerId,
        redirect: true,
        callbackUrl: "/dashboard",
      });
    } catch (error: any) {
      console.error("Impersonation error:", error);
      toast({
        title: "Error",
        description: "An error occurred while switching user",
        variant: "error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-white flex items-center justify-center">
              <CheckCircle2 className="h-[35px] w-[35px] text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle>Yacht Created Successfully!</DialogTitle>
              <DialogDescription>
                {yachtName} has been fully configured and is ready to use.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Owner Email:</p>
            <p className="text-sm text-muted-foreground">{ownerEmail}</p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleCopyInviteLink}
              variant="outline"
              className="w-full justify-start"
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Link Copied!" : "Copy Magic Invite Link"}
            </Button>

            <Button
              onClick={handleGoToOwners}
              variant="outline"
              className="w-full justify-start"
            >
              <Users className="mr-2 h-4 w-4" />
              Go to Owner List
            </Button>

            <Button
              onClick={handleImpersonate}
              variant="outline"
              className="w-full justify-start"
            >
              <Key className="mr-2 h-4 w-4" />
              Impersonate (Login as) Owner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

