"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { AlertTriangle, Calendar, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [documentType, setDocumentType] = useState<"STCW" | "License" | "">("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCrewMemberId, setSelectedCrewMemberId] = useState<string>("");
  
  // Filter out OWNER, SUPER_ADMIN, and ADMIN from crew member selection
  const filteredCrewMembers = crewMembers.filter((member) => {
    const role = String(member.role || "").toUpperCase().trim();
    return role !== "OWNER" && role !== "SUPER_ADMIN" && role !== "ADMIN";
  });
  const [userId, setUserId] = useState<string>("");
  
  // Filter documents by selected crew member
  const filteredDocs = selectedCrewMemberId
    ? docs.filter((doc) => doc.userId === selectedCrewMemberId)
    : [];
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

    if (!documentType) {
      setError("Please select a document type.");
      return;
    }

    if (!title || !title.trim()) {
      setError("Please select a document title.");
      return;
    }

    if (!userId) {
      setError("Please select a crew member.");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }
      if (!noExpiry && expiryDate) {
        formData.append("expiryDate", expiryDate);
      }
      formData.append("userId", userId);
      if (file) {
        formData.append("file", file);
      }

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
      // Auto-select the crew member if not already selected
      if (!selectedCrewMemberId && created.userId) {
        setSelectedCrewMemberId(created.userId);
      }
      setDocumentType("");
      setTitle("");
      setNotes("");
      setExpiryDate("");
      setNoExpiry(false);
      setUserId("");
      setFile(null);
      setIsSubmitting(false);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Crew Document</DialogTitle>
            <DialogDescription>
              Upload a document file (e.g. PDF or image) related to crew documentation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type *</label>
              <Select
                value={documentType || undefined}
                onValueChange={(value) => {
                  setDocumentType(value as "STCW" | "License");
                  setTitle(""); // Reset title when document type changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STCW">STCW</SelectItem>
                  <SelectItem value="License">License</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {documentType && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Select value={title || undefined} onValueChange={(value) => setTitle(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document title" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentType === "STCW" ? (
                        <>
                          <SelectItem value="Radar Gözlem ve Pilotlama EĞitimi">Radar Gözlem ve Pilotlama EĞitimi</SelectItem>
                          <SelectItem value="İlk Yardım Eğitimi">İlk Yardım Eğitimi</SelectItem>
                          <SelectItem value="Tıbbi Bakım Eğitimi">Tıbbi Bakım Eğitimi</SelectItem>
                          <SelectItem value="Belirlenmiş Güvenlik Görevleri Eğitimi">Belirlenmiş Güvenlik Görevleri Eğitimi</SelectItem>
                          <SelectItem value="Güvenlik Farkındalk">Güvenlik Farkındalk</SelectItem>
                          <SelectItem value="Güvenlikle İligli Tanıtım">Güvenlikle İligli Tanıtım</SelectItem>
                          <SelectItem value="Seyir Vardiyası Tutma">Seyir Vardiyası Tutma</SelectItem>
                          <SelectItem value="Otomatik Radar Pilotlama Aygıtı (ARPA) Kullanma">Otomatik Radar Pilotlama Aygıtı (ARPA) Kullanma</SelectItem>
                          <SelectItem value="Can Kurtarma Araçlarını Kullanma Yeterliliği">Can Kurtarma Araçlarını Kullanma Yeterliliği</SelectItem>
                          <SelectItem value="Denizde Kişisel Can Kurtarma Teknikleri Eğitimi">Denizde Kişisel Can Kurtarma Teknikleri Eğitimi</SelectItem>
                          <SelectItem value="İleri Yangın Mücadele">İleri Yangın Mücadele</SelectItem>
                          <SelectItem value="Personel Güvenliği Sosyal Sorumluluk Eğitimi">Personel Güvenliği Sosyal Sorumluluk Eğitimi</SelectItem>
                          <SelectItem value="Temel ilk Yardım Eğitimi">Temel ilk Yardım Eğitimi</SelectItem>
                          <SelectItem value="Yagın Önleme ve Yangınla Mücadele Eğitimi">Yagın Önleme ve Yangınla Mücadele Eğitimi</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Gemici">Gemici</SelectItem>
                          <SelectItem value="Usta Gemici">Usta Gemici</SelectItem>
                          <SelectItem value="Güverte Lostromosu">Güverte Lostromosu</SelectItem>
                          <SelectItem value="Yat Master (149)">Yat Master (149)</SelectItem>
                          <SelectItem value="Yat Master (499)">Yat Master (499)</SelectItem>
                          <SelectItem value="Yat Master (3000)">Yat Master (3000)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">File (Optional)</label>
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Crew Member *</label>
                <Select value={userId || undefined} onValueChange={(value) => setUserId(value || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crew member" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCrewMembers.map((member) => (
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
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Date</label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="no-expiry"
                      checked={noExpiry}
                      onCheckedChange={(checked) => {
                        setNoExpiry(checked as boolean);
                        if (checked) {
                          setExpiryDate("");
                        }
                      }}
                    />
                    <label
                      htmlFor="no-expiry"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      No expiry (unlimited)
                    </label>
                  </div>
                  {!noExpiry && (
                    <>
                      <Input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        placeholder="When does this document expire?"
                      />
                      <p className="text-xs text-muted-foreground">
                        You will receive a warning when the expiry date is approaching (30 days before).
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Select Crew Member *</label>
              <Select
                value={selectedCrewMemberId || undefined}
                onValueChange={(value) => setSelectedCrewMemberId(value || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a crew member to view documents" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCrewMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">

            {!selectedCrewMemberId ? (
              <p className="text-sm text-muted-foreground">
                Please select a crew member to view their documents.
              </p>
            ) : filteredDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documents found for the selected crew member.
              </p>
            ) : (
              <div className="space-y-1">
                {filteredDocs.map((doc) => {
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
                      {doc.expiryDate ? (
                        <p className="text-xs text-muted-foreground">
                          Expires: {format(new Date(doc.expiryDate), "MMM d, yyyy")}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Expiry: No expiry (unlimited)
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

