"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { AlertTriangle, Calendar } from "lucide-react";

interface MarinaPermissionDocument {
  id: string;
  title: string;
  fileUrl: string;
  notes: string | null;
  expiryDate: string | null;
  createdAt: string;
}

interface MarinaPermissionsViewProps {
  initialDocs: MarinaPermissionDocument[];
}

export function MarinaPermissionsView({ initialDocs }: MarinaPermissionsViewProps) {
  const [docs, setDocs] = useState<MarinaPermissionDocument[]>(initialDocs);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getExpiryStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return null;
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    if (isPast(expiry) && !isToday(expiry)) {
      const daysOverdue = differenceInDays(today, expiry);
      return { status: "expired", days: daysOverdue };
    }
    
    const daysUntilExpiry = differenceInDays(expiry, today);
    if (daysUntilExpiry <= 30) {
      return { status: "warning", days: daysUntilExpiry };
    }
    
    return { status: "valid", days: daysUntilExpiry };
  };

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
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }
      if (expiryDate) {
        formData.append("expiryDate", expiryDate);
      }
      formData.append("file", file);

      const res = await fetch("/api/marina-permissions", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to upload document.");
        setIsSubmitting(false);
        return;
      }

      const created = await res.json();
      setDocs((prev) => [created, ...prev]);
      setTitle("");
      setNotes("");
      setExpiryDate("");
      setFile(null);
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Marina / Port Permission</CardTitle>
          <CardDescription>
            Upload a document file (e.g. PDF or image) related to marina or port permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Document title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">File</label>
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Date (Optional)</label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="When does this permission expire?"
                />
                <p className="text-xs text-muted-foreground">
                  You will receive a warning when the expiry date is approaching (30 days before).
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Optional notes about this permission document"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-full"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permission Records</CardTitle>
          <CardDescription>
            All marina / port permission documents uploaded for this yacht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No marina / port permission documents uploaded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => {
                const expiryStatus = getExpiryStatus(doc.expiryDate);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-start justify-between rounded-md border p-3 ${
                      expiryStatus?.status === "expired"
                        ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                        : expiryStatus?.status === "warning"
                        ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                        : ""
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {doc.title || "Marina / Port Permission"}
                        </p>
                        {expiryStatus && (
                          <Badge
                            variant={
                              expiryStatus.status === "expired"
                                ? "destructive"
                                : expiryStatus.status === "warning"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {expiryStatus.status === "expired" && (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Expired {expiryStatus.days} day{expiryStatus.days > 1 ? "s" : ""} ago
                              </>
                            )}
                            {expiryStatus.status === "warning" && (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Expires in {expiryStatus.days} day{expiryStatus.days > 1 ? "s" : ""}
                              </>
                            )}
                            {expiryStatus.status === "valid" && (
                              <>
                                <Calendar className="h-3 w-3 mr-1" />
                                Valid
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {format(new Date(doc.createdAt), "MMM d, yyyy")}
                      </p>
                      {doc.expiryDate && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {format(new Date(doc.expiryDate), "MMM d, yyyy")}
                        </p>
                      )}
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline ml-4"
                    >
                      Open
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


