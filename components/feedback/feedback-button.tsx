"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { trackAction } from "@/lib/usage-tracking";

type FeedbackType = "bug" | "feature" | "question" | "other";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("other");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const pathname = usePathname();

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      // Track feedback submission
      trackAction("feedback.submit", { type, page: pathname });

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          page: pathname,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setMessage("");
        setTimeout(() => {
          setOpen(false);
          setSubmitted(false);
          setType("other");
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
          trackAction("feedback.open", { page: pathname });
        }}
        className="text-muted-foreground hover:text-foreground"
        title="Send feedback"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Help us improve HelmOps. Share what's working, what's not, or what you'd like to see.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Thank you! Your feedback has been received.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="feedback-type">Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as FeedbackType)}>
                  <SelectTrigger id="feedback-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="feedback-message">Message</Label>
                <Textarea
                  id="feedback-message"
                  placeholder={
                    type === "bug"
                      ? "Describe the issue and steps to reproduce..."
                      : type === "feature"
                      ? "Describe the feature you'd like to see..."
                      : type === "question"
                      ? "What would you like to know?"
                      : "Share your thoughts..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!message.trim() || submitting}>
                  {submitting ? "Sending..." : "Send Feedback"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

