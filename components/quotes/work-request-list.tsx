"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { WorkRequestStatus, WorkRequestCategory, WorkRequestPriority } from "@prisma/client";
import { format } from "date-fns";
import { Plus, Search, FileText, Eye, Trash2, Wrench, MapPin, Calendar } from "lucide-react";
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
  createdBy: { id: string; name: string | null; email: string } | null;
  quotes: Array<{ id: string; vendor: { name: string } }>;
}

interface WorkRequestListProps {
  initialWorkRequests: WorkRequest[];
}

export function WorkRequestList({ initialWorkRequests }: WorkRequestListProps) {
  const { data: session } = useSession();
  const [workRequests, setWorkRequests] = useState(initialWorkRequests);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkRequests = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.status) params.append("status", filters.status);

        const response = await fetch(`/api/work-requests?${params.toString()}`);
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
          try {
            data = await response.json();
          } catch (jsonError) {
            // Silently handle JSON parse errors - likely a redirect or error page
            setWorkRequests([]);
            return;
          }
        } else {
          // Response is HTML (likely redirect or error page) - handle silently
          // This can happen if user is not authenticated or route doesn't exist
          setWorkRequests([]);
          return;
        }
        
        // Check if response was actually successful
        if (!response.ok) {
          // If we got JSON but response wasn't ok, handle the error
          if (data?.error) {
            console.error("API error:", data.error);
          }
          setWorkRequests([]);
          return;
        }

        let filtered = data;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = data.filter((wr: WorkRequest) =>
            wr.title.toLowerCase().includes(searchLower) ||
            wr.description?.toLowerCase().includes(searchLower)
          );
        }

        setWorkRequests(filtered);
      } catch (error) {
        console.error("Error fetching work requests:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkRequests();
  }, [filters.status]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/work-requests/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setWorkRequests(workRequests.filter((wr) => wr.id !== id));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete work request");
      }
    } catch (error) {
      console.error("Error deleting work request:", error);
      alert("Failed to delete work request");
    } finally {
      setDeletingId(null);
    }
  };

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

  const canCreate = session?.user && hasPermission(session.user, "quotes.create", session.user.permissions);
  const canDelete = session?.user && hasPermission(session.user, "quotes.delete", session.user.permissions);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              İş Talepleri ve Teklifler
            </CardTitle>
            {canCreate && (
              <Link href="/dashboard/quotes/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni İş Talebi
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Ara..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="max-w-sm"
              />
            </div>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Durum Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="PENDING">Beklemede</SelectItem>
                <SelectItem value="QUOTES_RECEIVED">Teklif Alındı</SelectItem>
                <SelectItem value="PRESENTED">Sunum Yapıldı</SelectItem>
                <SelectItem value="APPROVED">Onaylandı</SelectItem>
                <SelectItem value="REJECTED">Reddedildi</SelectItem>
                <SelectItem value="CANCELLED">İptal Edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : workRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              İş talebi bulunamadı
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Bileşen</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Teklif Sayısı</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workRequests.map((wr) => (
                  <TableRow key={wr.id}>
                    <TableCell className="font-medium">{wr.title}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={wr.component || undefined}>
                      {wr.component || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(wr.status)}</TableCell>
                    <TableCell>{wr.quotes.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/quotes/${wr.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(wr.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>İş Talebini Sil</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu iş talebini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(wr.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

