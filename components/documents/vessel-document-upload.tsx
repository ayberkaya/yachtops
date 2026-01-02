"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VesselDocumentUploadProps {
  onUploadSuccess?: () => void;
}

export function VesselDocumentUpload({ onUploadSuccess }: VesselDocumentUploadProps) {
  const [title, setTitle] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a document file to upload.");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      if (expiryDate) {
        formData.append("expiryDate", expiryDate);
      }
      formData.append("file", file);

      const res = await fetch("/api/vessel-documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to upload document.");
        setIsSubmitting(false);
        return;
      }

      setTitle("");
      setExpiryDate("");
      setFile(null);
      setIsSubmitting(false);
      onUploadSuccess?.();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-zinc-200/60">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Document title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Expiry Date (Optional)</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              placeholder="When does this document expire?"
            />
            <p className="text-xs text-muted-foreground">
              You will receive a warning when the expiry date is approaching (30 days before).
            </p>
          </div>
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

