"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WorkRequestForm } from "./work-request-form";
import { format } from "date-fns";
import { Plus, Pencil, FileText, Download, Eye, Trash2, Calendar, MapPin, Wrench, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { WorkRequestStatus, WorkRequestCategory, WorkRequestPriority } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { useSession } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Quote {
  id: string;
  title: string;
  description: string | null;
  productService: string | null;
  amount: number;
  currency: string;
  vatIncluded: boolean;
  deliveryTime: string | null;
  warranty: string | null;
  notes: string | null;
  vendor: {
    id: string;
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  documents: Array<{
    id: string;
    title: string | null;
    uploadedAt: string;
  }>;
}

interface WorkRequest {
  id: string;
  title: string;
  description: string | null;
  category: WorkRequestCategory | null;
  priority: WorkRequestPriority;
  component: string | null;
  location: string | null;
  requestedCompletionDate: string | null;
  estimatedBudgetMin: number | null;
  estimatedBudgetMax: number | null;
  currency: string;
  status: WorkRequestStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  quotes: Quote[];
}

interface WorkRequestDetailProps {
  workRequest: WorkRequest;
  onUpdate?: () => void;
}

export function WorkRequestDetail({ workRequest, onUpdate }: WorkRequestDetailProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);
  const [isQuotesOpen, setIsQuotesOpen] = useState(false);

  const canEdit = session?.user && hasPermission(session.user, "quotes.edit", session.user.permissions);
  const canDelete = session?.user && hasPermission(session.user, "quotes.delete", session.user.permissions);
  const canCreate = session?.user && hasPermission(session.user, "quotes.create", session.user.permissions);
  const canApprove = session?.user && hasPermission(session.user, "quotes.approve", session.user.permissions);

  const getStatusBadge = (status: WorkRequestStatus) => {
    const statusConfig = {
      PENDING: { label: "Beklemede", variant: "secondary" as const },
      QUOTES_RECEIVED: { label: "Teklif Alındı", variant: "default" as const },
      PRESENTED: { label: "Sunum Yapıldı", variant: "default" as const },
      APPROVED: { label: "Onaylandı", variant: "default" as const },
      REJECTED: { label: "Reddedildi", variant: "destructive" as const },
      CANCELLED: { label: "İptal Edildi", variant: "outline" as const },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleStatusChange = async (newStatus: WorkRequestStatus) => {
    try {
      const response = await fetch(`/api/work-requests/${workRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: "DELETE",
      });

      if (response.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error deleting quote:", error);
    } finally {
      setDeletingQuoteId(null);
    }
  };

  const handleQuoteSuccess = () => {
    if (onUpdate) {
      onUpdate();
    } else {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {workRequest.title}
              </CardTitle>
              <div className="mt-2 flex items-center gap-2">
                {getStatusBadge(workRequest.status)}
                {canApprove && workRequest.status === WorkRequestStatus.QUOTES_RECEIVED && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(WorkRequestStatus.PRESENTED)}
                  >
                    Sunum Yapıldı Olarak İşaretle
                  </Button>
                )}
                {canApprove && workRequest.status === WorkRequestStatus.PRESENTED && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(WorkRequestStatus.APPROVED)}
                    >
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(WorkRequestStatus.REJECTED)}
                    >
                      Reddet
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4 mr-2" />
                      Düzenle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>İş Talebini Düzenle</DialogTitle>
                    </DialogHeader>
                    <WorkRequestForm
                      initialData={workRequest}
                      onSuccess={() => {
                        setIsEditDialogOpen(false);
                        if (onUpdate) onUpdate();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/quotes/${workRequest.id}/presentation`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Sunum Görünümü
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workRequest.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Açıklama</p>
                <p className="whitespace-pre-wrap">{workRequest.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {workRequest.category && (
                <div>
                  <p className="text-muted-foreground mb-1">Kategori</p>
                  <Badge variant="outline">
                    {workRequest.category === "MAINTENANCE" && "Bakım"}
                    {workRequest.category === "REPAIR" && "Onarım"}
                    {workRequest.category === "UPGRADE" && "Yükseltme"}
                    {workRequest.category === "INSPECTION" && "Kontrol"}
                    {workRequest.category === "EMERGENCY" && "Acil"}
                    {workRequest.category === "OTHER" && "Diğer"}
                  </Badge>
                </div>
              )}

              <div>
                <p className="text-muted-foreground mb-1">Öncelik</p>
                <Badge
                  variant={
                    workRequest.priority === "URGENT"
                      ? "destructive"
                      : workRequest.priority === "HIGH"
                      ? "default"
                      : "secondary"
                  }
                >
                  {workRequest.priority === "LOW" && "Düşük"}
                  {workRequest.priority === "NORMAL" && "Normal"}
                  {workRequest.priority === "HIGH" && "Yüksek"}
                  {workRequest.priority === "URGENT" && "Acil"}
                </Badge>
              </div>

              {workRequest.component && (
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    Bileşen/Parça
                  </p>
                  <p>{workRequest.component}</p>
                </div>
              )}

              {workRequest.location && (
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Lokasyon
                  </p>
                  <p>{workRequest.location}</p>
                </div>
              )}

              {workRequest.requestedCompletionDate && (
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    İstenen Tarih
                  </p>
                  <p>{format(new Date(workRequest.requestedCompletionDate), "dd MMM yyyy")}</p>
                </div>
              )}

              {(workRequest.estimatedBudgetMin || workRequest.estimatedBudgetMax) && (
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Tahmini Bütçe
                  </p>
                  <p>
                    {workRequest.estimatedBudgetMin && workRequest.estimatedBudgetMax
                      ? `${Number(workRequest.estimatedBudgetMin).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: workRequest.currency,
                        })} - ${Number(workRequest.estimatedBudgetMax).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: workRequest.currency,
                        })}`
                      : workRequest.estimatedBudgetMin
                      ? `${Number(workRequest.estimatedBudgetMin).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: workRequest.currency,
                        })}+`
                      : `Max ${Number(workRequest.estimatedBudgetMax).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: workRequest.currency,
                        })}`}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
              <div>
                <p className="text-muted-foreground">Oluşturan</p>
                <p>{workRequest.createdBy?.name || workRequest.createdBy?.email || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Oluşturulma Tarihi</p>
                <p>{format(new Date(workRequest.createdAt), "dd MMM yyyy, HH:mm")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Collapsible open={isQuotesOpen} onOpenChange={setIsQuotesOpen}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger>
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent -ml-2">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <CardTitle>Teklifler ({workRequest.quotes.length})</CardTitle>
                    {isQuotesOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              {canCreate && (
                <Link href={`/dashboard/quotes/${workRequest.id}/add-quote`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Teklif Ekle
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {workRequest.quotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz teklif eklenmemiş
                </div>
              ) : (
                <div className="space-y-4">
                  {workRequest.quotes.map((quote) => (
                <Card key={quote.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{quote.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {quote.vendor.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {canEdit && (
                          <Link href={`/dashboard/quotes/${workRequest.id}/edit-quote/${quote.id}`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingQuoteId(quote.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Teklifi Sil</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu teklifi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteQuote(quote.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Ürün/Hizmet</p>
                        <p>{quote.productService || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fiyat</p>
                        <p className="font-semibold">
                          {Number(quote.amount).toLocaleString("tr-TR", {
                            style: "currency",
                            currency: quote.currency,
                          })}
                          <span className="text-xs text-muted-foreground ml-1">
                            {quote.vatIncluded ? "(KDV Dahil)" : "(+ KDV)"}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Teslim Süresi</p>
                        <p>{quote.deliveryTime || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Garanti</p>
                        <p>{quote.warranty || "-"}</p>
                      </div>
                    </div>
                    {quote.description && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-1">Açıklama</p>
                        <p className="whitespace-pre-wrap text-sm">{quote.description}</p>
                      </div>
                    )}
                    {quote.notes && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-1">Notlar</p>
                        <p className="whitespace-pre-wrap text-sm">{quote.notes}</p>
                      </div>
                    )}
                    {quote.vendor.contactPerson && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-1">İletişim</p>
                        <p className="text-sm">
                          {quote.vendor.contactPerson}
                          {quote.vendor.email && ` - ${quote.vendor.email}`}
                          {quote.vendor.phone && ` - ${quote.vendor.phone}`}
                        </p>
                      </div>
                    )}
                    {quote.documents.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Dosyalar</p>
                        <div className="space-y-1">
                          {quote.documents.map((doc) => (
                            <a
                              key={doc.id}
                              href={`/api/quotes/${quote.id}/document/${doc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              {doc.title || "Dosya"}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

