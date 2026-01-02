"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDocumentStatus, type DocumentStatus } from "@/lib/crew-certification-utils";
import { format } from "date-fns";
import { FileText, ExternalLink, Trash2 } from "lucide-react";

interface VesselDocument {
  id: string;
  title: string;
  fileUrl: string;
  notes: string | null;
  expiryDate: Date | string | null;
  createdAt: Date | string;
}

interface VesselDocumentsTableProps {
  documents: VesselDocument[];
  onRowClick: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
}

function StatusIndicator({ status }: { status: DocumentStatus }) {
  if (status === "indefinite") {
    return (
      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" title="Indefinite" />
    );
  }
  if (status === "critical") {
    return (
      <div className="h-2.5 w-2.5 rounded-full bg-red-500" title="Critical" />
    );
  }
  if (status === "warning") {
    return (
      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" title="Warning" />
    );
  }
  return (
    <div className="h-2.5 w-2.5 rounded-full bg-green-500" title="Good" />
  );
}

export function VesselDocumentsTable({ 
  documents, 
  onRowClick,
  onDelete 
}: VesselDocumentsTableProps) {
  return (
    <div className="rounded-xl border border-zinc-200/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50/50">
            <TableHead className="w-[300px]">Document</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[150px]">Expiry Date</TableHead>
            <TableHead className="w-[150px]">Created</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No vessel documents found
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => {
              const status = getDocumentStatus(doc.expiryDate);
              
              return (
                <TableRow
                  key={doc.id}
                  className="cursor-pointer hover:bg-zinc-50/50 transition-colors"
                  onClick={() => onRowClick(doc.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-sm">
                        {doc.title || "Untitled Document"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusIndicator status={status.status} />
                      {status.status === "critical" && (
                        <Badge variant="destructive" className="text-xs">
                          {status.isExpired ? "Expired" : `${status.daysLeft}d left`}
                        </Badge>
                      )}
                      {status.status === "warning" && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700 bg-yellow-50">
                          {status.daysLeft}d left
                        </Badge>
                      )}
                      {status.status === "good" && status.daysLeft !== null && (
                        <Badge variant="outline" className="text-xs border-green-500 text-green-700 bg-green-50">
                          {status.daysLeft}d left
                        </Badge>
                      )}
                      {status.status === "indefinite" && (
                        <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Indefinite
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {doc.expiryDate 
                        ? format(new Date(doc.expiryDate), "MMM d, yyyy")
                        : "No expiry"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this document?")) {
                              onDelete(doc.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

