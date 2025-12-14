"use client";

import { HelpCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SupportLinkProps {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SupportLink({ variant = "ghost", size = "sm", className }: SupportLinkProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <HelpCircle className="h-4 w-4 mr-2" />
          Get Help
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Need Help?</DialogTitle>
          <DialogDescription>
            Our support team is available to assist you with any questions or issues.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              If you're experiencing issues or have questions, please contact our support team.
            </p>
            <Button asChild className="w-full">
              <a href="mailto:support@helmops.com?subject=HelmOps Support Request">
                <Mail className="h-4 w-4 mr-2" />
                Email Support
              </a>
            </Button>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Support Email: <a href="mailto:support@helmops.com" className="text-primary hover:underline">support@helmops.com</a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

