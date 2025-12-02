"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { AlertTriangle, Calendar } from "lucide-react";

interface CrewDocument {
  id: string;
  title: string;
  fileUrl: string;
  notes: string | null;
  expiryDate: string | null;
  createdAt: string;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface CrewMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface CrewDocumentsViewProps {
  initialDocs: CrewDocument[];
  crewMembers: CrewMember[];
}

export function CrewDocumentsView({ initialDocs, crewMembers }: CrewDocumentsViewProps) {
  const [docs, setDocs] = useState<CrewDocument[]>(initialDocs);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [userId, setUserId] = useState<string>("");
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
      if (userId) {
        formData.append("userId", userId);
      }
      formData.append("file", file);

      const res = await fetch("/api/crew-documents", {
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
      setUserId("");
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
          <CardTitle>Add Crew Document</CardTitle>
          <CardDescription>
            Upload a document file (e.g. PDF or image) related to crew documentation.
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
                <label className="text-sm font-medium">Crew Member (Optional)</label>
                <Select value={userId || undefined} onValueChange={(value) => setUserId(value || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crew member" />
                  </SelectTrigger>
                  <SelectContent>
                    {crewMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select which crew member this document belongs to.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Date (Optional)</label>
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Optional notes about this document"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Records</CardTitle>
          <CardDescription>
            All crew documents uploaded for this yacht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No crew documents uploaded yet.
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
                          {doc.title || "Crew Document"}
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
                      {doc.user && (
                        <p className="text-xs text-muted-foreground">
                          Crew Member: <span className="font-medium">{doc.user.name || doc.user.email}</span>
                        </p>
                      )}
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

