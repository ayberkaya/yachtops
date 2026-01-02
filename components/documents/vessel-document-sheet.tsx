"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getDocumentStatus, calculateDaysLeft, type DocumentStatus } from "@/lib/crew-certification-utils";
import { format } from "date-fns";
import { Calendar, FileText, ExternalLink, Pencil, Trash2 } from "lucide-react";

interface VesselDocument {
  id: string;
  title: string;
  fileUrl: string;
  notes: string | null;
  expiryDate: Date | string | null;
  createdAt: Date | string;
}

interface VesselDocumentSheetProps {
  document: VesselDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onDelete?: (documentId: string) => void;
}

function DocumentProgressBar({ expiryDate }: { expiryDate: Date | string | null }) {
  if (!expiryDate) {
    return (
      <div className="h-2 bg-zinc-100 rounded-full">
        <div className="h-2 bg-blue-500 rounded-full w-full" />
      </div>
    );
  }

  const daysLeft = calculateDaysLeft(expiryDate);
  const status = getDocumentStatus(expiryDate);
  
  if (daysLeft === null) {
    return (
      <div className="h-2 bg-zinc-100 rounded-full">
        <div className="h-2 bg-yellow-500 rounded-full w-1/2" />
      </div>
    );
  }

  // Calculate progress (0-100%, where 100% = expired, 0% = >365 days)
  const maxDays = 365;
  const progress = daysLeft > maxDays ? 0 : Math.max(0, ((maxDays - daysLeft) / maxDays) * 100);
  
  let color = "bg-green-500";
  if (status.status === "critical") color = "bg-red-500";
  else if (status.status === "warning") color = "bg-yellow-500";

  return (
    <div className="h-2 bg-zinc-100 rounded-full">
      <div className={`h-2 ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, progress)}%` }} />
    </div>
  );
}

export function VesselDocumentSheet({ 
  document, 
  open, 
  onOpenChange, 
  onUpdate,
  onDelete 
}: VesselDocumentSheetProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    notes: "",
    expiryDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!document) return null;

  const status = getDocumentStatus(document.expiryDate);
  const daysLeft = calculateDaysLeft(document.expiryDate);

  const handleEdit = () => {
    setEditForm({
      title: document.title,
      notes: document.notes || "",
      expiryDate: document.expiryDate ? format(new Date(document.expiryDate), "yyyy-MM-dd") : "",
    });
    setIsEditDialogOpen(true);
    setError(null);
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/vessel-documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title.trim() || document.title,
          notes: editForm.notes.trim() || null,
          expiryDate: editForm.expiryDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update document.");
        setIsSubmitting(false);
        return;
      }

      setIsEditDialogOpen(false);
      setIsSubmitting(false);
      onUpdate?.();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/vessel-documents/${document.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete document.");
        setIsSubmitting(false);
        return;
      }

      onDelete?.(document.id);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-zinc-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-zinc-600" />
              </div>
              <div>
                <SheetTitle>{document.title || "Untitled Document"}</SheetTitle>
                <SheetDescription>
                  Vessel document details and status
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-8 space-y-6">
            {/* Status Section */}
            <div className="p-4 rounded-lg border border-zinc-200/60 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Status</h4>
                {status.status === "indefinite" ? (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                    Indefinite
                  </Badge>
                ) : status.status === "critical" ? (
                  <Badge variant="destructive">Critical</Badge>
                ) : status.status === "warning" ? (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                    Warning
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                    Good
                  </Badge>
                )}
              </div>
              
              <DocumentProgressBar expiryDate={document.expiryDate} />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {document.expiryDate ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Expires: {format(new Date(document.expiryDate), "MMM d, yyyy")}</span>
                    </div>
                    {daysLeft !== null && (
                      <span className={status.status === "critical" ? "text-red-600 font-medium" : ""}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">No expiry date set</span>
                )}
              </div>
            </div>

            {/* Document Info */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-sm mt-1">
                  {format(new Date(document.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>

              {document.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{document.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">File</Label>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(document.fileUrl, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Open Document
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
              >
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </Button>
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update document information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={editForm.expiryDate}
                onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Optional notes"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

