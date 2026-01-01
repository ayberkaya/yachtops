"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDocumentStatus, calculateDaysLeft, type DocumentStatus } from "@/lib/crew-certification-utils";
import { format } from "date-fns";
import { Calendar, FileText, Plus, Pencil, Trash2 } from "lucide-react";

interface CrewCertificate {
  id: string;
  name: string;
  issueDate: Date | string | null;
  expiryDate: Date | string | null;
  isIndefinite: boolean;
}

interface CrewMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  passportDate: Date | string | null;
  passportNumber: string | null;
  healthReportDate: Date | string | null;
  walletDate: Date | string | null;
  walletQualifications: Array<{ qualification: string; date: string | null }> | null;
  walletTcKimlikNo: string | null;
  walletSicilLimani: string | null;
  walletSicilNumarasi: string | null;
  walletDogumTarihi: Date | string | null;
  walletUyrugu: string | null;
  licenseDate: Date | string | null;
  radioDate: Date | string | null;
  certificates: CrewCertificate[];
}

interface CrewDocumentSheetProps {
  member: CrewMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

function DocumentProgressBar({ expiryDate, isIndefinite }: { expiryDate: Date | string | null; isIndefinite?: boolean }) {
  if (isIndefinite || !expiryDate) {
    return (
      <div className="h-2 bg-zinc-100 rounded-full">
        <div className="h-2 bg-blue-500 rounded-full w-full" />
      </div>
    );
  }

  const daysLeft = calculateDaysLeft(expiryDate);
  const status = getDocumentStatus(expiryDate, isIndefinite);
  
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

function DocumentCard({
  title,
  expiryDate,
  isIndefinite,
  status,
  onEdit,
  qualifications,
}: {
  title: string;
  expiryDate: Date | string | null;
  isIndefinite?: boolean;
  status: DocumentStatus;
  onEdit: () => void;
  qualifications?: Array<{ qualification: string; date: string | null }> | null;
}) {
  const daysLeft = calculateDaysLeft(expiryDate);
  const statusInfo = getDocumentStatus(expiryDate, isIndefinite);

  return (
    <div className="p-4 rounded-lg border border-zinc-200/60 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{title}</h4>
        <div className="flex items-center gap-2">
          {statusInfo.status === "indefinite" ? (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              Süresiz
            </Badge>
          ) : statusInfo.status === "critical" ? (
            <Badge variant="destructive">Critical</Badge>
          ) : statusInfo.status === "warning" ? (
            <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
              Warning
            </Badge>
          ) : (
            <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
              Good
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 w-7 p-0"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <DocumentProgressBar expiryDate={expiryDate} isIndefinite={isIndefinite} />
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {expiryDate ? (
          <>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Expires: {format(new Date(expiryDate), "MMM d, yyyy")}</span>
            </div>
            {daysLeft !== null && (
              <span className={statusInfo.status === "critical" ? "text-red-600 font-medium" : ""}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">No expiry date set</span>
        )}
      </div>

      {qualifications && qualifications.length > 0 && (
        <div className="pt-2 border-t border-zinc-200/60 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Yeterlilikler:</p>
          <div className="space-y-1.5">
            {qualifications.map((qual, index) => {
              const qualDaysLeft = qual.date ? calculateDaysLeft(qual.date) : null;
              const qualStatus = qual.date ? getDocumentStatus(qual.date) : { status: 'unknown' as const };
              
              return (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{qual.qualification}</span>
                  {qual.date ? (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {format(new Date(qual.date), "MMM d, yyyy")}
                      </span>
                      {qualDaysLeft !== null && (
                        <span className={
                          qualStatus.status === "critical" ? "text-red-600 font-medium" :
                          qualStatus.status === "warning" ? "text-yellow-600" :
                          "text-muted-foreground"
                        }>
                          {qualDaysLeft < 0 ? `${Math.abs(qualDaysLeft)}d overdue` : `${qualDaysLeft}d left`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No date</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function CrewDocumentSheet({ member, open, onOpenChange, onUpdate }: CrewDocumentSheetProps) {
  const [editingDoc, setEditingDoc] = useState<{ 
    type: string; 
    date: string | null; 
    passportNumber?: string | null;
    walletQualifications?: Array<{ qualification: string; date: string | null }>;
    walletTcKimlikNo?: string | null;
    walletSicilLimani?: string | null;
    walletSicilNumarasi?: string | null;
    walletDogumTarihi?: string | null;
    walletUyrugu?: string | null;
  } | null>(null);
  const [isCertificateDialogOpen, setIsCertificateDialogOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<CrewCertificate | null>(null);
  const [certificateForm, setCertificateForm] = useState({
    name: "",
    issueDate: "",
    expiryDate: "",
    isIndefinite: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleUpdateCoreDocument = async (
    type: string, 
    date: string | null, 
    passportNumber?: string | null,
    walletData?: {
      qualifications?: Array<{ qualification: string; date: string | null }>;
      tcKimlikNo?: string | null;
      sicilLimani?: string | null;
      sicilNumarasi?: string | null;
      dogumTarihi?: string | null;
      uyrugu?: string | null;
    }
  ) => {
    if (!member) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updateData: any = {};
      updateData[type] = date ? new Date(date).toISOString() : null;
      if (type === "passportDate" && passportNumber !== undefined) {
        updateData.passportNumber = passportNumber || null;
      }
      if (type === "walletDate" && walletData) {
        if (walletData.qualifications !== undefined) {
          updateData.walletQualifications = walletData.qualifications.length > 0 ? walletData.qualifications : null;
        }
        if (walletData.tcKimlikNo !== undefined) updateData.walletTcKimlikNo = walletData.tcKimlikNo || null;
        if (walletData.sicilLimani !== undefined) updateData.walletSicilLimani = walletData.sicilLimani || null;
        if (walletData.sicilNumarasi !== undefined) updateData.walletSicilNumarasi = walletData.sicilNumarasi || null;
        if (walletData.dogumTarihi !== undefined) {
          updateData.walletDogumTarihi = walletData.dogumTarihi ? new Date(walletData.dogumTarihi).toISOString() : null;
        }
        if (walletData.uyrugu !== undefined) updateData.walletUyrugu = walletData.uyrugu || null;
      }

      const res = await fetch(`/api/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update document.");
        setIsSubmitting(false);
        return;
      }

      setEditingDoc(null);
      setIsSubmitting(false);
      onUpdate?.();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const handleSaveCertificate = async () => {
    if (!member || !certificateForm.name.trim()) {
      setError("Certificate name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingCertificate
        ? `/api/crew-certificates/${editingCertificate.id}`
        : "/api/crew-certificates";
      
      const method = editingCertificate ? "PATCH" : "POST";

      const body = editingCertificate
        ? {
            name: certificateForm.name,
            issueDate: certificateForm.issueDate || null,
            expiryDate: certificateForm.isIndefinite ? null : (certificateForm.expiryDate || null),
            isIndefinite: certificateForm.isIndefinite,
          }
        : {
            userId: member.id,
            name: certificateForm.name,
            issueDate: certificateForm.issueDate || null,
            expiryDate: certificateForm.isIndefinite ? null : (certificateForm.expiryDate || null),
            isIndefinite: certificateForm.isIndefinite,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save certificate.");
        setIsSubmitting(false);
        return;
      }

      setIsCertificateDialogOpen(false);
      setEditingCertificate(null);
      setCertificateForm({ name: "", issueDate: "", expiryDate: "", isIndefinite: false });
      setIsSubmitting(false);
      onUpdate?.();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const handleDeleteCertificate = async (certId: string) => {
    if (!confirm("Are you sure you want to delete this certificate?")) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/crew-certificates/${certId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete certificate.");
        setIsSubmitting(false);
        return;
      }

      onUpdate?.();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const openCertificateDialog = (cert?: CrewCertificate) => {
    if (cert) {
      setEditingCertificate(cert);
      setCertificateForm({
        name: cert.name,
        issueDate: cert.issueDate ? format(new Date(cert.issueDate), "yyyy-MM-dd") : "",
        expiryDate: cert.expiryDate ? format(new Date(cert.expiryDate), "yyyy-MM-dd") : "",
        isIndefinite: cert.isIndefinite,
      });
    } else {
      setEditingCertificate(null);
      setCertificateForm({ name: "", issueDate: "", expiryDate: "", isIndefinite: false });
    }
    setIsCertificateDialogOpen(true);
    setError(null);
  };

  const passportStatus = getDocumentStatus(member.passportDate);
  const healthStatus = getDocumentStatus(member.healthReportDate);
  const walletStatus = getDocumentStatus(member.walletDate);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-zinc-100 text-zinc-700">
                  {getInitials(member.name, member.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle>{member.name || member.email}</SheetTitle>
                <SheetDescription>
                  {member.email} • {member.role}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-8 space-y-8">
            {/* Core Documents Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Core Documents</h3>
              <div className="space-y-4">
                <DocumentCard
                  title="Passport"
                  expiryDate={member.passportDate}
                  status={passportStatus.status}
                  onEdit={() => setEditingDoc({ type: "passportDate", date: member.passportDate ? format(new Date(member.passportDate), "yyyy-MM-dd") : null, passportNumber: member.passportNumber || null })}
                />
                <DocumentCard
                  title="Health Report"
                  expiryDate={member.healthReportDate}
                  status={healthStatus.status}
                  onEdit={() => setEditingDoc({ type: "healthReportDate", date: member.healthReportDate ? format(new Date(member.healthReportDate), "yyyy-MM-dd") : null })}
                />
                <DocumentCard
                  title="Seaman's Book"
                  expiryDate={member.walletDate}
                  status={walletStatus.status}
                  qualifications={(() => {
                    if (!member.walletQualifications) return null;
                    try {
                      return typeof member.walletQualifications === 'string' 
                        ? JSON.parse(member.walletQualifications)
                        : member.walletQualifications;
                    } catch (e) {
                      return null;
                    }
                  })()}
                  onEdit={() => {
                    let qualifications: Array<{ qualification: string; date: string | null }> = [];
                    if (member.walletQualifications) {
                      try {
                        qualifications = typeof member.walletQualifications === 'string' 
                          ? JSON.parse(member.walletQualifications)
                          : member.walletQualifications;
                      } catch (e) {
                        qualifications = [];
                      }
                    }
                    setEditingDoc({ 
                      type: "walletDate", 
                      date: member.walletDate ? format(new Date(member.walletDate), "yyyy-MM-dd") : null,
                      walletQualifications: qualifications,
                      walletTcKimlikNo: member.walletTcKimlikNo || null,
                      walletSicilLimani: member.walletSicilLimani || null,
                      walletSicilNumarasi: member.walletSicilNumarasi || null,
                      walletDogumTarihi: member.walletDogumTarihi ? format(new Date(member.walletDogumTarihi), "yyyy-MM-dd") : null,
                      walletUyrugu: member.walletUyrugu || null,
                    });
                  }}
                />
              </div>
            </div>

            {/* Certificates Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Certificates</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {member.certificates.length} total
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => openCertificateDialog()}
                    className="h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add
                  </Button>
                </div>
              </div>
              
              {member.certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No certificates recorded
                </p>
              ) : (
                <div className="space-y-3">
                  {member.certificates.map((cert) => {
                    const certStatus = getDocumentStatus(cert.expiryDate, cert.isIndefinite);
                    const daysLeft = calculateDaysLeft(cert.expiryDate);
                    
                    return (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-zinc-200/60 bg-white"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{cert.name}</p>
                            <div className="flex items-center gap-4 mt-1">
                              {cert.expiryDate && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(cert.expiryDate), "MMM d, yyyy")}
                                </span>
                              )}
                              {daysLeft !== null && !cert.isIndefinite && (
                                <span className={`text-xs ${
                                  certStatus.status === "critical" ? "text-red-600 font-medium" : "text-muted-foreground"
                                }`}>
                                  {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {cert.isIndefinite ? (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              Süresiz
                            </Badge>
                          ) : certStatus.status === "critical" ? (
                            <Badge variant="destructive" className="text-xs">Critical</Badge>
                          ) : certStatus.status === "warning" ? (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50 text-xs">
                              Warning
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 text-xs">
                              Good
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCertificateDialog(cert)}
                            className="h-7 w-7 p-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Core Document Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => !open && setEditingDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingDoc?.type === "passportDate" ? "Passport" : editingDoc?.type === "healthReportDate" ? "Health Report" : "Seaman's Book"}</DialogTitle>
            <DialogDescription>
              Update the expiry date for this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {editingDoc?.type === "passportDate" && (
              <div className="space-y-2">
                <Label>Passport Number</Label>
                <Input
                  type="text"
                  value={editingDoc?.passportNumber || ""}
                  onChange={(e) => setEditingDoc(editingDoc ? { ...editingDoc, passportNumber: e.target.value || null } : null)}
                  placeholder="Enter passport number"
                />
              </div>
            )}
            {editingDoc?.type === "walletDate" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Yeterlilikler</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (editingDoc) {
                          setEditingDoc({
                            ...editingDoc,
                            walletQualifications: [...(editingDoc.walletQualifications || []), { qualification: "", date: null }]
                          });
                        }
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {editingDoc?.walletQualifications?.map((qual, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                          <Input
                            type="text"
                            value={qual.qualification}
                            onChange={(e) => {
                              if (editingDoc && editingDoc.walletQualifications) {
                                const updated = [...editingDoc.walletQualifications];
                                updated[index] = { ...updated[index], qualification: e.target.value };
                                setEditingDoc({ ...editingDoc, walletQualifications: updated });
                              }
                            }}
                            placeholder="Yeterlilik adı"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            type="date"
                            value={qual.date || ""}
                            onChange={(e) => {
                              if (editingDoc && editingDoc.walletQualifications) {
                                const updated = [...editingDoc.walletQualifications];
                                updated[index] = { ...updated[index], date: e.target.value || null };
                                setEditingDoc({ ...editingDoc, walletQualifications: updated });
                              }
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (editingDoc && editingDoc.walletQualifications) {
                              const updated = editingDoc.walletQualifications.filter((_, i) => i !== index);
                              setEditingDoc({ ...editingDoc, walletQualifications: updated });
                            }
                          }}
                          className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {(!editingDoc?.walletQualifications || editingDoc.walletQualifications.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-2">No qualifications added</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>TC Kimlik No</Label>
                  <Input
                    type="text"
                    value={editingDoc?.walletTcKimlikNo || ""}
                    onChange={(e) => setEditingDoc(editingDoc ? { ...editingDoc, walletTcKimlikNo: e.target.value || null } : null)}
                    placeholder="Enter TC Kimlik No"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sicil Limanı</Label>
                  <Input
                    type="text"
                    value={editingDoc?.walletSicilLimani || ""}
                    onChange={(e) => setEditingDoc(editingDoc ? { ...editingDoc, walletSicilLimani: e.target.value || null } : null)}
                    placeholder="Enter registry port"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sicil Numarası</Label>
                  <Input
                    type="text"
                    value={editingDoc?.walletSicilNumarasi || ""}
                    onChange={(e) => setEditingDoc(editingDoc ? { ...editingDoc, walletSicilNumarasi: e.target.value || null } : null)}
                    placeholder="Enter registry number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Doğum Tarihi</Label>
                  <Input
                    type="date"
                    value={editingDoc?.walletDogumTarihi || ""}
                    onChange={(e) => setEditingDoc(editingDoc ? { ...editingDoc, walletDogumTarihi: e.target.value || null } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Uyruğu</Label>
                  <Input
                    type="text"
                    value={editingDoc?.walletUyrugu || ""}
                    onChange={(e) => setEditingDoc(editingDoc ? { ...editingDoc, walletUyrugu: e.target.value || null } : null)}
                    placeholder="Enter nationality"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={editingDoc?.date || ""}
                onChange={(e) => setEditingDoc(editingDoc ? { ...editingDoc, date: e.target.value || null } : null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingDoc(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!editingDoc) return;
                  if (editingDoc.type === "walletDate") {
                    handleUpdateCoreDocument(
                      editingDoc.type,
                      editingDoc.date,
                      undefined,
                      {
                        qualifications: editingDoc.walletQualifications || [],
                        tcKimlikNo: editingDoc.walletTcKimlikNo,
                        sicilLimani: editingDoc.walletSicilLimani,
                        sicilNumarasi: editingDoc.walletSicilNumarasi,
                        dogumTarihi: editingDoc.walletDogumTarihi,
                        uyrugu: editingDoc.walletUyrugu,
                      }
                    );
                  } else {
                    handleUpdateCoreDocument(editingDoc.type, editingDoc.date, editingDoc.passportNumber);
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Certificate Dialog */}
      <Dialog open={isCertificateDialogOpen} onOpenChange={setIsCertificateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCertificate ? "Edit Certificate" : "Add Certificate"}
            </DialogTitle>
            <DialogDescription>
              {editingCertificate ? "Update certificate information." : "Add a new certificate for this crew member."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label>Certificate Name *</Label>
              <Input
                value={certificateForm.name}
                onChange={(e) => setCertificateForm({ ...certificateForm, name: e.target.value })}
                placeholder="e.g., Radar Gözlem ve Pilotlama EĞitimi"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="indefinite"
                checked={certificateForm.isIndefinite}
                onCheckedChange={(checked) => {
                  setCertificateForm({ ...certificateForm, isIndefinite: checked as boolean, expiryDate: checked ? "" : certificateForm.expiryDate });
                }}
              />
              <Label htmlFor="indefinite" className="text-sm font-normal cursor-pointer">
                No expiry (unlimited)
              </Label>
            </div>
            {!certificateForm.isIndefinite && (
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={certificateForm.expiryDate}
                  onChange={(e) => setCertificateForm({ ...certificateForm, expiryDate: e.target.value })}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCertificateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCertificate} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingCertificate ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
